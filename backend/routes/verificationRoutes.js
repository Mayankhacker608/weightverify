const express = require("express");
const { body, validationResult } = require("express-validator");
const Verification = require("../models/Verification");
const VerificationApplication = require("../models/VerificationApplication");
const Certificate = require("../models/Certificate");
const AuditLog = require("../models/AuditLog");
const { protect, authorize } = require("../middleware/auth");
const { createNotification } = require("../services/notificationService");
const upload = require("../utils/upload");
const {
  generateCertificateNumber,
  generateQrToken,
} = require("../utils/idGenerator");

const router = express.Router();

router.post(
  "/",
  protect,
  [body("applicationId").notEmpty(), body("result").isIn(["PASS", "FAIL"])],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const application = await VerificationApplication.findById(
        req.body.applicationId,
      );
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
          message: "Only an assigned LMO or GATC can submit this verification.",
        });
      }
      if (
        ![
          "SCHEDULED",
          "ASSIGNED",
          "VERIFICATION_IN_PROGRESS",
          "GATC_REVIEW",
        ].includes(application.status)
      ) {
        return res.status(409).json({
          message: "This application is not ready for field verification.",
        });
      }

      const verification = await Verification.create({
        applicationId: application._id,
        verifierId: req.user._id,
        checklist: req.body.checklist || {},
        measurements: req.body.measurements || {},
        observations: req.body.observations || "",
        remarks: req.body.remarks || "",
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        result: req.body.result,
        verifiedAt: new Date(),
      });

      const previousStatus = application.status;
      if (req.body.result === "FAIL") {
        application.status = "REJECTED";
        application.rejectionReason =
          req.body.remarks || req.body.observations || "Verification failed.";
      } else if (req.user.role === "LMO" && application.assignedGATC) {
        application.status = "GATC_REVIEW";
      } else {
        application.status = "FINAL_REVIEW";
      }
      application.statusHistory.push({
        status: application.status,
        actorId: req.user._id,
        actorRole: req.user.role,
        action: "FIELD_VERIFICATION_SUBMITTED",
        reason: application.rejectionReason,
      });
      await application.save();

      await AuditLog.create({
        userId: req.user._id,
        actorRole: req.user.role,
        action: "FIELD_VERIFICATION_SUBMITTED",
        entityType: "Verification",
        entityId: verification._id.toString(),
        description: `${req.user.role} submitted ${req.body.result} for ${application.applicationId}.`,
        previousStatus,
        newStatus: application.status,
        reason: application.rejectionReason,
        ipAddress: req.ip,
      });
      await createNotification({
        userId: application.applicantId,
        type: application.status,
        title: "Verification update",
        message: `Your application ${application.applicationId} moved to ${application.status}.${application.rejectionReason ? ` Reason: ${application.rejectionReason}` : ""}`,
      });
      if (application.status === "GATC_REVIEW" && application.assignedGATC) {
        await createNotification({
          userId: application.assignedGATC,
          type: "GATC_REVIEW",
          title: "Technical verification assigned",
          message: `Application ${application.applicationId} is ready for GATC review.`,
        });
      }

      res.status(201).json({ verification, application });
    } catch (error) {
      res.status(500).json({ message: "Verification submission failed." });
    }
  },
);

router.get("/:id", protect, async (req, res) => {
  try {
    const verification = await Verification.findById(req.params.id).populate(
      "verifierId",
      "name email role",
    );
    if (!verification)
      return res
        .status(404)
        .json({ message: "Verification record not found." });
    const application = await VerificationApplication.findById(
      verification.applicationId,
    );
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
    const safeVerification = verification.toObject();
    for (const collection of [
      safeVerification.photographs,
      safeVerification.supportingDocuments,
    ]) {
      for (const file of collection || []) delete file.path;
    }
    res.json({ verification: safeVerification });
  } catch (error) {
    res.status(500).json({ message: "Failed to load verification." });
  }
});

router.post(
  "/generate-certificate",
  protect,
  authorize("ADMIN", "SUPER_ADMIN"),
  async (req, res) => {
    try {
      const { applicationId, verificationId } = req.body;
      const application = await VerificationApplication.findById(applicationId)
        .populate("instrumentId")
        .populate("applicantId");
      if (!application)
        return res.status(404).json({ message: "Application not found." });

      const verification = await Verification.findById(verificationId);
      if (!verification || verification.result !== "PASS") {
        return res.status(400).json({
          message:
            "Certificate can only be generated for a passing verification.",
        });
      }
      if (
        verification.applicationId.toString() !== application._id.toString()
      ) {
        return res.status(400).json({
          message: "Verification does not belong to this application.",
        });
      }
      if (application.status !== "APPROVED") {
        return res.status(409).json({
          message:
            "Application requires final administrative approval before certificate issuance.",
        });
      }

      const certificateExists = await Certificate.findOne({
        applicationId: application._id,
      });
      if (certificateExists)
        return res.status(409).json({
          message: "Certificate already exists for this application.",
        });

      const certificateNumber = generateCertificateNumber();
      const certificate = await Certificate.create({
        certificateNumber,
        applicationId: application._id,
        instrumentId: application.instrumentId._id,
        ownerId: application.applicantId._id,
        verificationId: verification._id,
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        qrToken: generateQrToken(),
        createdBy: req.user._id,
        status: "VALID",
      });

      application.status = "CERTIFICATE_ISSUED";
      application.statusHistory.push({
        status: "CERTIFICATE_ISSUED",
        actorId: req.user._id,
        actorRole: req.user.role,
        action: "CERTIFICATE_ISSUED",
      });
      await application.save();

      res.status(201).json({ certificate });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate certificate." });
    }
  },
);

module.exports = router;
