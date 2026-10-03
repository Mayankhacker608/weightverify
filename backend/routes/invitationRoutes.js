const crypto = require("crypto");
const express = require("express");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const InvitationKey = require("../models/InvitationKey");
const AuditLog = require("../models/AuditLog");
const { protect, authorize } = require("../middleware/auth");

const router = express.Router();
const createKeyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const toPublicInvitation = (invitation) => ({
  id: invitation._id,
  role: invitation.role,
  organization: invitation.organization,
  state: invitation.state,
  district: invitation.district,
  createdAt: invitation.createdAt,
  expiresAt: invitation.expiresAt,
  usedAt: invitation.usedAt,
  usedBy: invitation.usedBy,
  revokedAt: invitation.revokedAt,
  status: invitation.revokedAt
    ? "REVOKED"
    : invitation.usedAt
      ? "USED"
      : invitation.expiresAt <= new Date()
        ? "EXPIRED"
        : "ACTIVE",
});

router.use(protect, authorize("ADMIN", "SUPER_ADMIN"));

router.get("/", async (req, res, next) => {
  try {
    const invitations = await InvitationKey.find()
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ invitations: invitations.map(toPublicInvitation) });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/",
  createKeyLimiter,
  [
    body("role").isIn(["LMO", "GATC"]).withMessage("Role must be LMO or GATC."),
    body("expiresAt").optional().isISO8601(),
    body("organization").optional().trim().isLength({ max: 160 }),
    body("state").optional().trim().isLength({ max: 100 }),
    body("district").optional().trim().isLength({ max: 100 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const expiresAt = req.body.expiresAt
        ? new Date(req.body.expiresAt)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const maximumExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      if (expiresAt <= new Date() || expiresAt > maximumExpiry) {
        return res.status(400).json({
          message: "Invitation expiry must be within the next 30 days.",
        });
      }

      const secret = crypto.randomBytes(32).toString("base64url");
      const keyHash = crypto.createHash("sha256").update(secret).digest("hex");
      const invitation = await InvitationKey.create({
        keyHash,
        role: req.body.role,
        createdBy: req.user._id,
        organization: req.body.organization,
        state: req.body.state,
        district: req.body.district,
        expiresAt,
      });

      await AuditLog.create({
        userId: req.user._id,
        action: "INVITATION_KEY_CREATED",
        entityType: "InvitationKey",
        entityId: invitation._id.toString(),
        description: `Created ${invitation.role} invitation key; expires ${expiresAt.toISOString()}.`,
        ipAddress: req.ip,
      });

      return res.status(201).json({
        invitation: toPublicInvitation(invitation),
        invitationKey: secret,
        message: "Copy this key now; it will not be shown again.",
      });
    } catch (error) {
      next(error);
    }
  },
);

router.put("/:id/revoke", async (req, res, next) => {
  try {
    const invitation = await InvitationKey.findById(req.params.id);
    if (!invitation) {
      return res.status(404).json({ message: "Invitation key not found." });
    }
    if (invitation.usedAt) {
      return res
        .status(409)
        .json({ message: "Used invitation keys cannot be revoked." });
    }
    if (!invitation.revokedAt) {
      invitation.revokedAt = new Date();
      await invitation.save();
      await AuditLog.create({
        userId: req.user._id,
        action: "INVITATION_KEY_REVOKED",
        entityType: "InvitationKey",
        entityId: invitation._id.toString(),
        description: `Revoked ${invitation.role} invitation key.`,
        ipAddress: req.ip,
      });
    }
    return res.json({ invitation: toPublicInvitation(invitation) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
