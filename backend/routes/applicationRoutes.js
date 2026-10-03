const express = require("express");
const fs = require("fs");
const path = require("path");
const { body, validationResult } = require("express-validator");
const VerificationApplication = require("../models/VerificationApplication");
const VerificationSchedule = require("../models/VerificationSchedule");
const Instrument = require("../models/Instrument");
const Certificate = require("../models/Certificate");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { protect, authorize } = require("../middleware/auth");
const { generateApplicationId } = require("../utils/idGenerator");
const { createNotification } = require("../services/notificationService");
const upload = require("../utils/upload");
const { validateUploadedFiles } = upload;

const router = express.Router();
const uploadRoot = path.resolve(__dirname, "../uploads");

const safeApplication = (application) => {
  const data = application.toObject();
  for (const collection of [data.documents, data.fieldEvidence]) {
    for (const file of collection || []) delete file.path;
  }
  return data;
};

const requireAssignedStaffForEvidence = async (req, res, next) => {
  try {
    const application = await VerificationApplication.findById(req.params.id);
    if (!application)
      return res.status(404).json({ message: "Application not found." });
    const isAssignedLmo =
      req.user.role === "LMO" &&
      application.assignedOfficer?.toString() === req.user._id.toString();
    const isAssignedGatc =
      req.user.role === "GATC" &&
      application.assignedGATC?.toString() === req.user._id.toString();
    if (!isAssignedLmo && !isAssignedGatc) {
      return res.status(403).json({
        message: "Only assigned verification staff can upload field evidence.",
      });
    }
    if (
      !["SCHEDULED", "ASSIGNED", "GATC_REVIEW"].includes(application.status)
    ) {
      return res.status(409).json({
        message: "Field evidence cannot be uploaded at this application stage.",
      });
    }
    req.application = application;
    next();
  } catch (error) {
    next(error);
  }
};

const requireApplicationOwnerOrAdmin = async (req, res, next) => {
  try {
    const application = await VerificationApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: "Application not found." });
    }
    const isPrivileged = ["ADMIN", "SUPER_ADMIN"].includes(req.user.role);
    const isOwner =
      application.applicantId.toString() === req.user._id.toString();
    if (!isPrivileged && !isOwner) {
      return res.status(403).json({ message: "Unauthorized access." });
    }
    req.application = application;
    next();
  } catch (error) {
    next(error);
  }
};

router.post(
  "/",
  protect,
  [
    body("instrumentId").notEmpty(),
    body("applicationType").isIn(["Initial Verification", "Re-Verification"]),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const instrument = await Instrument.findById(req.body.instrumentId);
      if (!instrument)
        return res.status(404).json({ message: "Instrument not found." });
      if (instrument.ownerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          message: "You cannot apply for another owner's instrument.",
        });
      }
      let previousCertificateId;
      if (req.body.applicationType === "Re-Verification") {
        const previousCertificate = await Certificate.findOne({
          instrumentId: instrument._id,
          ownerId: req.user._id,
        }).sort({ issueDate: -1 });
        if (!previousCertificate) {
          return res.status(400).json({
            message:
              "Re-verification requires a previous certificate for this instrument.",
          });
        }
        previousCertificateId = previousCertificate._id;
      }

      const app = await VerificationApplication.create({
        applicationId: generateApplicationId(),
        applicantId: req.user._id,
        instrumentId: instrument._id,
        previousCertificateId,
        applicationType: req.body.applicationType,
        preferredDate: req.body.preferredDate,
        status: "SUBMITTED",
        statusHistory: [
          {
            status: "SUBMITTED",
            actorId: req.user._id,
            actorRole: req.user.role,
            action: "APPLICATION_SUBMITTED",
          },
        ],
        remarks: req.body.remarks || "",
      });

      res.status(201).json({ application: app });
    } catch (error) {
      res.status(500).json({ message: "Failed to submit application." });
    }
  },
);

router.get("/", protect, async (req, res) => {
  try {
    const filter = ["ADMIN", "SUPER_ADMIN"].includes(req.user.role)
      ? {}
      : req.user.role === "LMO"
        ? { assignedOfficer: req.user._id }
        : req.user.role === "GATC"
          ? { assignedGATC: req.user._id }
          : { applicantId: req.user._id };
    const applications = await VerificationApplication.find(filter)
      .populate("applicantId", "name email organization")
      .populate("instrumentId", "instrumentId type model serialNumber location")
      .populate("previousCertificateId", "certificateNumber status validUntil")
      .populate("assignedOfficer", "name organization role")
      .populate("assignedGATC", "name organization role")
      .sort({ createdAt: -1 });

    res.json({ applications: applications.map(safeApplication) });
  } catch (error) {
    res.status(500).json({ message: "Failed to load applications." });
  }
});

router.post(
  "/:id/evidence",
  protect,
  requireAssignedStaffForEvidence,
  upload.array("files", 5),
  validateUploadedFiles,
  async (req, res, next) => {
    try {
      const allowedTypes = [
        "FRONT",
        "BACK",
        "SIDE",
        "SERIAL_PLATE",
        "LOCATION",
        "ADDITIONAL",
      ];
      const documentType = allowedTypes.includes(req.body.documentType)
        ? req.body.documentType
        : "ADDITIONAL";
      if (!req.files?.length) {
        return res
          .status(400)
          .json({ message: "Choose at least one evidence file." });
      }
      const evidence = req.files.map((file) => ({
        name: path.basename(file.originalname),
        path: file.path,
        mimeType: file.mimetype,
        documentType,
        uploadedBy: req.user._id,
        uploadedAt: new Date(),
      }));
      req.application.fieldEvidence.push(...evidence);
      await req.application.save();
      await AuditLog.create({
        userId: req.user._id,
        actorRole: req.user.role,
        action: "FIELD_EVIDENCE_UPLOADED",
        entityType: "VerificationApplication",
        entityId: req.application._id.toString(),
        description: `Uploaded ${evidence.length} field evidence file(s) for ${req.application.applicationId}.`,
        ipAddress: req.ip,
      });
      res.status(201).json({
        evidence: evidence.map((file, index) => ({
          id: req.application.fieldEvidence[
            req.application.fieldEvidence.length - evidence.length + index
          ]._id,
          name: file.name,
          mimeType: file.mimeType,
          documentType: file.documentType,
          uploadedAt: file.uploadedAt,
        })),
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/:id/evidence/:fileId", protect, async (req, res, next) => {
  try {
    const application = await VerificationApplication.findById(req.params.id);
    if (!application)
      return res.status(404).json({ message: "Application not found." });
    const isPrivileged = ["ADMIN", "SUPER_ADMIN"].includes(req.user.role);
    const isApplicant =
      application.applicantId.toString() === req.user._id.toString();
    const isAssignedStaff = [
      application.assignedOfficer,
      application.assignedGATC,
    ]
      .filter(Boolean)
      .some((userId) => userId.toString() === req.user._id.toString());
    if (!isPrivileged && !isApplicant && !isAssignedStaff) {
      return res.status(403).json({ message: "Unauthorized access." });
    }
    const file = application.fieldEvidence.id(req.params.fileId);
    if (!file)
      return res.status(404).json({ message: "Evidence file not found." });
    const filePath = path.resolve(file.path);
    if (!filePath.startsWith(`${uploadRoot}${path.sep}`)) {
      return res
        .status(400)
        .json({ message: "Invalid evidence file reference." });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Evidence file is unavailable." });
    }
    res
      .type(file.mimeType)
      .sendFile(filePath, { dotfiles: "deny" }, (error) => {
        if (error) next(error);
      });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", protect, async (req, res) => {
  try {
    const application = await VerificationApplication.findById(req.params.id)
      .populate("applicantId", "name email organization")
      .populate("instrumentId", "instrumentId type model serialNumber")
      .populate("assignedOfficer", "name email role")
      .populate("assignedGATC", "name email role");

    if (!application)
      return res.status(404).json({ message: "Application not found." });

    const isPrivileged = ["ADMIN", "SUPER_ADMIN"].includes(req.user.role);
    const isApplicant =
      application.applicantId._id.toString() === req.user._id.toString();
    const isAssignedStaff = [
      application.assignedOfficer,
      application.assignedGATC,
    ]
      .filter(Boolean)
      .some((userId) => userId.toString() === req.user._id.toString());
    if (!isPrivileged && !isApplicant && !isAssignedStaff) {
      return res.status(403).json({ message: "Unauthorized access." });
    }

    res.json({ application: safeApplication(application) });
  } catch (error) {
    res.status(500).json({ message: "Failed to load application." });
  }
});

router.post(
  "/:id/schedule",
  protect,
  authorize("ADMIN", "SUPER_ADMIN"),
  [
    body("scheduledDate")
      .notEmpty()
      .withMessage("A scheduled date is required."),
    body("scheduleLocation")
      .notEmpty()
      .withMessage("A schedule location is required."),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const application = await VerificationApplication.findById(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found." });
      }
      if (
        !["APPROVED_FOR_SCHEDULING", "ASSIGNED"].includes(application.status)
      ) {
        return res.status(409).json({
          message: "Application must be approved for scheduling first.",
        });
      }

      const officerId = req.body.officerId || application.assignedOfficer;
      const gatcId = req.body.gatcId || application.assignedGATC;
      if (!officerId && !gatcId) {
        return res
          .status(400)
          .json({ message: "Please assign an LMO or GATC before scheduling." });
      }
      const [officer, gatc] = await Promise.all([
        officerId ? User.findById(officerId) : null,
        gatcId ? User.findById(gatcId) : null,
      ]);
      if (
        officerId &&
        (!officer || officer.role !== "LMO" || officer.status !== "ACTIVE")
      ) {
        return res
          .status(400)
          .json({ message: "Assigned LMO is not authorized." });
      }
      if (
        gatcId &&
        (!gatc || gatc.role !== "GATC" || gatc.status !== "ACTIVE")
      ) {
        return res
          .status(400)
          .json({ message: "Assigned GATC is not authorized." });
      }
      const scheduledDate = new Date(req.body.scheduledDate);
      if (Number.isNaN(scheduledDate.getTime())) {
        return res.status(400).json({ message: "Scheduled date is invalid." });
      }

      application.assignedOfficer = officerId || application.assignedOfficer;
      application.assignedGATC = gatcId || application.assignedGATC;
      application.scheduledDate = scheduledDate;
      application.scheduleLocation = req.body.scheduleLocation;
      application.remarks = req.body.remarks || application.remarks;
      application.status = "SCHEDULED";
      application.statusHistory.push({
        status: "SCHEDULED",
        actorId: req.user._id,
        actorRole: req.user.role,
        action: "APPLICATION_ASSIGNED_AND_SCHEDULED",
      });
      await application.save();
      await AuditLog.create({
        userId: req.user._id,
        actorRole: req.user.role,
        action: "APPLICATION_ASSIGNED_AND_SCHEDULED",
        entityType: "VerificationApplication",
        entityId: application._id.toString(),
        description: `Assigned LMO ${application.assignedOfficer || "none"} and GATC ${application.assignedGATC || "none"}; scheduled ${scheduledDate.toISOString()}.`,
        ipAddress: req.ip,
      });

      await VerificationSchedule.findOneAndUpdate(
        { applicationId: application._id },
        {
          applicationId: application._id,
          officerId: application.assignedOfficer,
          gatcId: application.assignedGATC,
          date: application.scheduledDate,
          time: req.body.scheduledTime || "09:00",
          location: application.scheduleLocation,
          status: "ASSIGNED",
        },
        { upsert: true, new: true },
      );

      if (application.applicantId) {
        await createNotification({
          userId: application.applicantId,
          type: "SCHEDULED",
          title: "Verification scheduled",
          message: `Your application ${application.applicationId} has been scheduled at ${application.scheduleLocation}.`,
        });
      }

      if (application.assignedOfficer) {
        await createNotification({
          userId: application.assignedOfficer,
          type: "ASSIGNED",
          title: "Inspection assigned",
          message: `You have been assigned application ${application.applicationId}.`,
        });
      }

      res.json({
        application: safeApplication(application),
        message: "Application scheduled successfully.",
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to schedule application." });
    }
  },
);

router.put("/:id", protect, async (req, res) => {
  try {
    if (!["ADMIN", "SUPER_ADMIN"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Only administrators can review applications." });
    }
    const application = await VerificationApplication.findById(req.params.id);
    if (!application)
      return res.status(404).json({ message: "Application not found." });

    const nextStatus = req.body.status;
    const transitions = {
      SUBMITTED: ["UNDER_REVIEW", "REJECTED"],
      UNDER_REVIEW: [
        "DOCUMENTS_REQUIRED",
        "APPROVED_FOR_SCHEDULING",
        "REJECTED",
      ],
      DOCUMENTS_REQUIRED: ["SUBMITTED", "REJECTED"],
      APPROVED_FOR_SCHEDULING: ["ASSIGNED", "REJECTED"],
      ASSIGNED: ["SCHEDULED", "REJECTED"],
      SCHEDULED: ["FIELD_VERIFICATION", "REJECTED"],
      FIELD_VERIFICATION: [
        "LMO_REVIEW",
        "GATC_REVIEW",
        "FINAL_REVIEW",
        "REJECTED",
      ],
      LMO_REVIEW: ["GATC_REVIEW", "FINAL_REVIEW", "REJECTED"],
      GATC_REVIEW: ["FINAL_REVIEW", "REJECTED"],
      FINAL_REVIEW: ["APPROVED", "REJECTED"],
      APPROVED: ["CERTIFICATE_ISSUED"],
      VERIFIED: ["CERTIFICATE_GENERATED", "CERTIFICATE_ISSUED"],
    };
    if (nextStatus && !transitions[application.status]?.includes(nextStatus)) {
      return res.status(400).json({ message: "Invalid application status." });
    }
    if (!nextStatus && !req.body.remarks) {
      return res
        .status(400)
        .json({ message: "A status or review comment is required." });
    }
    if (nextStatus === "REJECTED" && !req.body.rejectionReason?.trim()) {
      return res
        .status(400)
        .json({ message: "A rejection reason is required." });
    }

    const previousStatus = application.status;
    if (nextStatus) application.status = nextStatus;
    if (req.body.remarks) application.remarks = req.body.remarks;
    if (nextStatus === "REJECTED") {
      application.rejectionReason = req.body.rejectionReason.trim();
    }
    if (nextStatus) {
      application.statusHistory.push({
        status: nextStatus,
        actorId: req.user._id,
        actorRole: req.user.role,
        action: "APPLICATION_STATUS_CHANGED",
        reason:
          nextStatus === "REJECTED" ? application.rejectionReason : undefined,
      });
    }
    await application.save();
    if (nextStatus) {
      await AuditLog.create({
        userId: req.user._id,
        actorRole: req.user.role,
        action: "APPLICATION_STATUS_CHANGED",
        entityType: "VerificationApplication",
        entityId: application._id.toString(),
        description: `${previousStatus} -> ${nextStatus}${application.rejectionReason ? `: ${application.rejectionReason}` : ""}`,
        ipAddress: req.ip,
      });
      await createNotification({
        userId: application.applicantId,
        type: nextStatus,
        title: "Application status updated",
        message: `Your application ${application.applicationId} is now ${nextStatus}.${application.rejectionReason ? ` Reason: ${application.rejectionReason}` : ""}`,
      });
    }
    res.json({ application: safeApplication(application) });
  } catch (error) {
    res.status(500).json({ message: "Failed to update application." });
  }
});

router.post(
  "/:id/upload",
  protect,
  requireApplicationOwnerOrAdmin,
  upload.array("files", 5),
  validateUploadedFiles,
  async (req, res) => {
    try {
      const application = req.application;
      const files = (req.files || []).map((file) => ({
        name: path.basename(file.originalname),
        path: file.path,
        mimeType: file.mimetype,
        uploadedAt: new Date(),
      }));

      application.documents.push(...files);
      await application.save();
      res.json({
        message: "Documents uploaded successfully.",
        files: files.map(({ name, mimeType, uploadedAt }) => ({
          name,
          mimeType,
          uploadedAt,
        })),
      });
    } catch (error) {
      res.status(500).json({ message: "File upload failed." });
    }
  },
);

module.exports = router;
