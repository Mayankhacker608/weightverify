const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const InvitationKey = require("../models/InvitationKey");
const AuditLog = require("../models/AuditLog");
const { protect } = require("../middleware/auth");

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
const staffRegistrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

const createToken = (user, options = {}) =>
  jwt.sign(
    { id: user._id, role: user.role, purpose: options.purpose },
    process.env.JWT_SECRET || "dev-secret",
    { expiresIn: options.expiresIn || "7d" },
  );

router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name is required."),
    body("email").trim().isEmail().withMessage("Invalid email address."),
    body("phone").notEmpty().withMessage("Phone is required."),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters."),
    body("organization").notEmpty().withMessage("Organization is required."),
    body("role")
      .optional()
      .equals("USER")
      .withMessage("Public registration is only available for USER accounts."),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        name,
        email,
        phone,
        password,
        organization,
        address,
        state,
        district,
      } = req.body;
      const normalizedEmail = email.trim().toLowerCase();

      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(409).json({ message: "Email already registered." });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({
        name,
        email: normalizedEmail,
        phone,
        passwordHash,
        organization,
        address,
        state,
        district,
        role: "USER",
        status: "ACTIVE",
      });

      const token = createToken(user);
      const safeUser = user.toObject();
      delete safeUser.passwordHash;

      return res
        .status(201)
        .json({ token, user: safeUser, message: "Registration successful." });
    } catch (error) {
      if (error.code === 11000 && error.keyPattern?.email) {
        return res.status(409).json({ message: "Email already registered." });
      }
      next(error);
    }
  },
);

router.post(
  "/login",
  loginLimiter,
  [
    body("email").trim().isEmail().withMessage("Invalid email address."),
    body("password").notEmpty().withMessage("Password is required."),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(401).json({ message: "Invalid login credentials." });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid login credentials." });
      }
      if (["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
        const adminAccessKeyHash = process.env.ADMIN_ACCESS_KEY_HASH;
        if (!adminAccessKeyHash) {
          return res.status(503).json({
            message:
              "Administrator access is not configured. Set ADMIN_ACCESS_KEY_HASH first.",
          });
        }
        const adminKeyMatches = await bcrypt.compare(
          req.body.adminAccessKey || "",
          adminAccessKeyHash,
        );
        if (!adminKeyMatches) {
          await AuditLog.create({
            userId: user._id,
            actorRole: user.role,
            action: "ADMIN_LOGIN_FAILED",
            entityType: "User",
            entityId: user._id.toString(),
            description: "Administrator second-factor key validation failed.",
            ipAddress: req.ip,
          });
          return res
            .status(401)
            .json({ message: "Invalid login credentials." });
        }
      }
      if (user.status !== "ACTIVE") {
        if (
          ["LMO", "GATC"].includes(user.role) &&
          user.status === "PENDING" &&
          user.staffProfile?.verificationStatus !== "VERIFIED"
        ) {
          const safeUser = user.toObject();
          delete safeUser.passwordHash;
          return res.json({
            pending: true,
            uploadToken: createToken(user, {
              purpose: "staff-onboarding",
              expiresIn: "24h",
            }),
            user: safeUser,
            message:
              "Your staff application is pending. You can upload requested documents while it is reviewed.",
          });
        }
        return res.status(403).json({
          message: "Your staff registration is pending administrator approval.",
          status: user.status,
        });
      }

      const token = createToken(user);
      const safeUser = user.toObject();
      delete safeUser.passwordHash;

      return res.json({ token, user: safeUser, message: "Login successful." });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/staff-register",
  staffRegistrationLimiter,
  [
    body("invitationKey").isLength({ min: 20, max: 200 }),
    body("role").isIn(["LMO", "GATC"]),
    body("name").trim().notEmpty(),
    body("email").trim().isEmail(),
    body("phone").trim().notEmpty(),
    body("password").isLength({ min: 12 }),
    body("organization").trim().notEmpty(),
    body("address").trim().notEmpty(),
    body("state").trim().notEmpty(),
    body("district").trim().notEmpty(),
    body("designation").if(body("role").equals("LMO")).trim().notEmpty(),
    body("employeeId").if(body("role").equals("LMO")).trim().notEmpty(),
    body("authorizationNumber")
      .if(body("role").equals("GATC"))
      .trim()
      .notEmpty(),
  ],
  async (req, res, next) => {
    let createdUserId;
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const normalizedEmail = req.body.email.trim().toLowerCase();
      const keyHash = crypto
        .createHash("sha256")
        .update(req.body.invitationKey)
        .digest("hex");
      const now = new Date();
      const invitation = await InvitationKey.findOne({
        keyHash,
        role: req.body.role,
        usedAt: null,
        revokedAt: null,
        expiresAt: { $gt: now },
      }).select("+keyHash");
      if (!invitation) {
        return res.status(403).json({
          message:
            "Invitation key is invalid, expired, revoked, or already used.",
        });
      }

      const matchesScope = (expected, actual) =>
        !expected ||
        expected.trim().toLowerCase() === actual.trim().toLowerCase();
      if (
        !matchesScope(invitation.organization, req.body.organization) ||
        !matchesScope(invitation.state, req.body.state) ||
        !matchesScope(invitation.district, req.body.district)
      ) {
        return res.status(403).json({
          message: "Registration details do not match the invitation scope.",
        });
      }

      if (await User.exists({ email: normalizedEmail })) {
        return res.status(409).json({ message: "Email already registered." });
      }

      const user = await User.create({
        name: req.body.name.trim(),
        email: normalizedEmail,
        phone: req.body.phone.trim(),
        passwordHash: await bcrypt.hash(req.body.password, 12),
        role: invitation.role,
        organization: req.body.organization.trim(),
        address: req.body.address.trim(),
        state: req.body.state.trim(),
        district: req.body.district.trim(),
        status: "PENDING",
        staffProfile: {
          designation: req.body.designation?.trim(),
          employeeId: req.body.employeeId?.trim(),
          authorizationNumber: req.body.authorizationNumber?.trim(),
          verificationStatus: "PENDING",
        },
      });
      createdUserId = user._id;

      const claimedInvitation = await InvitationKey.findOneAndUpdate(
        {
          _id: invitation._id,
          keyHash,
          usedAt: null,
          revokedAt: null,
          expiresAt: { $gt: now },
        },
        { $set: { usedAt: now, usedBy: user._id } },
        { new: true },
      );
      if (!claimedInvitation) {
        await User.deleteOne({ _id: user._id });
        return res
          .status(409)
          .json({ message: "Invitation key has already been used." });
      }

      await AuditLog.create({
        userId: user._id,
        action: "STAFF_REGISTRATION_SUBMITTED",
        entityType: "User",
        entityId: user._id.toString(),
        description: `${user.role} registration submitted; approval pending.`,
        ipAddress: req.ip,
      });
      await AuditLog.create({
        userId: user._id,
        action: "INVITATION_KEY_USED",
        entityType: "InvitationKey",
        entityId: invitation._id.toString(),
        description: `${invitation.role} invitation key used for staff registration.`,
        ipAddress: req.ip,
      });

      const safeUser = user.toObject();
      delete safeUser.passwordHash;
      return res.status(201).json({
        user: safeUser,
        uploadToken: createToken(user, {
          purpose: "staff-onboarding",
          expiresIn: "24h",
        }),
        message:
          "Registration submitted. Administrator approval is required before access is enabled.",
      });
    } catch (error) {
      if (createdUserId)
        await User.deleteOne({ _id: createdUserId }).catch(() => {});
      if (error.code === 11000 && error.keyPattern?.email) {
        return res.status(409).json({ message: "Email already registered." });
      }
      next(error);
    }
  },
);

router.get("/me", protect, async (req, res) => {
  const user = req.user.toObject();
  delete user.passwordHash;
  for (const document of user.staffProfile?.documents || [])
    delete document.path;
  res.json({ user });
});

module.exports = router;
