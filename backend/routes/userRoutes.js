const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const VerificationApplication = require("../models/VerificationApplication");
const AuditLog = require("../models/AuditLog");
const {
  protect,
  protectStaffOnboarding,
  authorize,
} = require("../middleware/auth");
const { createNotification } = require("../services/notificationService");
const upload = require("../utils/upload");
const { validateUploadedFiles } = upload;

const router = express.Router();
const safeUser = (user) => {
  const data = user.toObject ? user.toObject() : { ...user };
  for (const document of data.staffProfile?.documents || [])
    delete document.path;
  delete data.passwordHash;
  return data;
};

const allowedStaffDocumentTypes = {
  LMO: ["appointment", "identity", "official_id", "supporting"],
  GATC: ["authorization", "facility", "equipment", "personnel", "supporting"],
};

router.post(
  "/me/staff-documents",
  protectStaffOnboarding,
  upload.array("files", 10),
  validateUploadedFiles,
  async (req, res, next) => {
    try {
      const { documentType } = req.body;
      if (!allowedStaffDocumentTypes[req.user.role]?.includes(documentType)) {
        await Promise.all(
          (req.files || []).map((file) =>
            require("fs")
              .promises.unlink(file.path)
              .catch(() => {}),
          ),
        );
        return res
          .status(400)
          .json({ message: "Document type is not valid for this staff role." });
      }
      if (!req.files?.length) {
        return res
          .status(400)
          .json({ message: "Choose at least one document to upload." });
      }

      const user = await User.findById(req.user._id);
      const documents = req.files.map((file) => ({
        documentType,
        originalName: path.basename(file.originalname),
        storedName: path.basename(file.filename),
        path: file.path,
        mimeType: file.mimetype,
        uploadedAt: new Date(),
        verificationStatus: "PENDING",
      }));
      user.staffProfile.documents.push(...documents);
      await user.save();
      await AuditLog.create({
        userId: user._id,
        actorRole: user.role,
        action: "STAFF_DOCUMENTS_UPLOADED",
        entityType: "User",
        entityId: user._id.toString(),
        description: `Uploaded ${documents.length} ${documentType} document(s).`,
        ipAddress: req.ip,
      });
      res.status(201).json({
        documents: documents.map(
          ({
            _id,
            documentType,
            originalName,
            mimeType,
            uploadedAt,
            verificationStatus,
          }) => ({
            id: _id,
            documentType,
            originalName,
            mimeType,
            uploadedAt,
            verificationStatus,
          }),
        ),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/:id/staff-documents/:documentId",
  protect,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user || !user.staffProfile) {
        return res.status(404).json({ message: "Staff applicant not found." });
      }
      const isPrivileged = ["ADMIN", "SUPER_ADMIN"].includes(req.user.role);
      if (!isPrivileged && user._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Unauthorized access." });
      }
      const document = user.staffProfile.documents.id(req.params.documentId);
      if (!document)
        return res.status(404).json({ message: "Document not found." });
      const uploadRoot = path.resolve(__dirname, "../uploads");
      const filePath = path.resolve(document.path);
      if (!filePath.startsWith(`${uploadRoot}${path.sep}`)) {
        return res.status(400).json({ message: "Invalid document reference." });
      }
      return res.download(filePath, document.originalName);
    } catch (error) {
      next(error);
    }
  },
);

router.get("/", protect, async (req, res) => {
  try {
    if (req.user.role !== "ADMIN" && req.user.role !== "SUPER_ADMIN") {
      return res.json({ users: [safeUser(req.user)] });
    }
    const users = await User.find()
      .select("-passwordHash")
      .sort({ createdAt: -1 });
    res.json({ users: users.map(safeUser) });
  } catch (error) {
    res.status(500).json({ message: "Failed to load users." });
  }
});

router.get(
  "/staff/pending",
  protect,
  authorize("ADMIN", "SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const filter = {
        role: { $in: ["LMO", "GATC"] },
        status: { $in: ["PENDING", "REJECTED"] },
      };
      if (["LMO", "GATC"].includes(req.query.role)) {
        filter.role = req.query.role;
      }
      const users = await User.find(filter)
        .select("-passwordHash")
        .sort({ createdAt: 1 })
        .limit(100);
      res.json({ users: users.map(safeUser) });
    } catch (error) {
      next(error);
    }
  },
);

router.get(
  "/authorized-staff",
  protect,
  authorize("ADMIN", "SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      if (!["LMO", "GATC"].includes(req.query.role)) {
        return res.status(400).json({ message: "Choose an LMO or GATC role." });
      }
      const filter = {
        role: req.query.role,
        status: "ACTIVE",
        ...(req.query.state ? { state: req.query.state.trim() } : {}),
        ...(req.query.district ? { district: req.query.district.trim() } : {}),
      };
      const staff = await User.find(filter)
        .select(
          "name organization state district role staffProfile.designation",
        )
        .sort({ state: 1, district: 1, name: 1 })
        .limit(100)
        .lean();
      const staffIds = staff.map((user) => user._id);
      const workloadCounts = await VerificationApplication.aggregate([
        {
          $match: {
            [req.query.role === "LMO" ? "assignedOfficer" : "assignedGATC"]: {
              $in: staffIds,
            },
            status: { $nin: ["REJECTED", "CERTIFICATE_ISSUED", "CANCELLED"] },
          },
        },
        {
          $group: {
            _id:
              req.query.role === "LMO" ? "$assignedOfficer" : "$assignedGATC",
            workload: { $sum: 1 },
          },
        },
      ]);
      const workloads = new Map(
        workloadCounts.map((entry) => [entry._id.toString(), entry.workload]),
      );
      res.json({
        staff: staff.map((user) => ({
          ...user,
          workload: workloads.get(user._id.toString()) || 0,
        })),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/:id/review-staff",
  protect,
  authorize("ADMIN", "SUPER_ADMIN"),
  [
    body("decision").isIn(["VERIFIED", "REJECTED", "RESUBMISSION_REQUIRED"]),
    body("reason").optional().trim().isLength({ max: 1000 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { decision, reason } = req.body;
      if (decision !== "VERIFIED" && !reason?.trim()) {
        return res
          .status(400)
          .json({ message: "A reason is required for this decision." });
      }

      const user = await User.findOne({
        _id: req.params.id,
        role: { $in: ["LMO", "GATC"] },
      });
      if (!user)
        return res.status(404).json({ message: "Staff applicant not found." });
      if (user.status === "ACTIVE") {
        return res
          .status(409)
          .json({ message: "Staff account is already active." });
      }
      const requiredDocuments =
        user.role === "LMO"
          ? ["appointment", "official_id"]
          : ["authorization", "facility"];
      const uploadedTypes = new Set(
        user.staffProfile?.documents?.map(
          (document) => document.documentType,
        ) || [],
      );
      if (
        decision === "VERIFIED" &&
        requiredDocuments.some(
          (documentType) => !uploadedTypes.has(documentType),
        )
      ) {
        return res.status(400).json({
          message: `Required documents missing: ${requiredDocuments.filter((documentType) => !uploadedTypes.has(documentType)).join(", ")}.`,
        });
      }

      const previousStatus = user.staffProfile?.verificationStatus || "PENDING";
      user.staffProfile.verificationStatus = decision;
      user.staffProfile.reviewReason =
        decision === "VERIFIED" ? undefined : reason.trim();
      user.staffProfile.reviewedBy = req.user._id;
      user.staffProfile.reviewedAt = new Date();
      user.staffProfile.documents.forEach((document) => {
        document.verificationStatus = decision;
        document.reviewReason =
          decision === "VERIFIED" ? undefined : reason.trim();
        document.reviewedBy = req.user._id;
        document.reviewedAt = new Date();
      });
      user.status =
        decision === "VERIFIED"
          ? "ACTIVE"
          : decision === "REJECTED"
            ? "REJECTED"
            : "PENDING";
      await user.save();

      await AuditLog.create({
        userId: req.user._id,
        actorRole: req.user.role,
        action: "STAFF_APPLICATION_REVIEWED",
        entityType: "User",
        entityId: user._id.toString(),
        description: `${user.role} applicant ${user._id} reviewed.`,
        previousStatus,
        newStatus: decision,
        reason: reason?.trim(),
        ipAddress: req.ip,
      });
      await createNotification({
        userId: user._id,
        type: decision,
        title: "Staff registration reviewed",
        message:
          decision === "VERIFIED"
            ? "Your staff account has been approved and is now active."
            : `Your staff application requires action: ${reason.trim()}`,
      });

      res.json({
        user: safeUser(user),
        message: "Staff application reviewed.",
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found." });
    if (
      req.user.role !== "ADMIN" &&
      req.user.role !== "SUPER_ADMIN" &&
      req.user._id.toString() !== req.params.id
    ) {
      return res.status(403).json({ message: "Unauthorized access." });
    }
    res.json({ user: safeUser(user) });
  } catch (error) {
    res.status(500).json({ message: "Failed to load user." });
  }
});

router.put(
  "/change-password",
  protect,
  [
    body("currentPassword").notEmpty(),
    body("newPassword").isLength({ min: 8 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const user = await User.findById(req.user._id);
      const ok = await bcrypt.compare(
        req.body.currentPassword,
        user.passwordHash,
      );
      if (!ok)
        return res
          .status(400)
          .json({ message: "Current password is incorrect." });

      user.passwordHash = await bcrypt.hash(req.body.newPassword, 10);
      await user.save();
      res.json({ message: "Password updated." });
    } catch (error) {
      res.status(500).json({ message: "Failed to update password." });
    }
  },
);

module.exports = router;
