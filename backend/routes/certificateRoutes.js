const express = require("express");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const { protect, authorize } = require("../middleware/auth");
const AuditLog = require("../models/AuditLog");
const { createNotification } = require("../services/notificationService");
const Certificate = require("../models/Certificate");
const Verification = require("../models/Verification");
const VerificationApplication = require("../models/VerificationApplication");
const Instrument = require("../models/Instrument");
const User = require("../models/User");

const router = express.Router();
const isPrivileged = (user) => ["ADMIN", "SUPER_ADMIN"].includes(user.role);

const loadAuthorizedCertificate = async (id, user) => {
  const certificate = await Certificate.findById(id)
    .populate(
      "instrumentId",
      "instrumentId type category manufacturer model serialNumber capacity accuracy location",
    )
    .populate("ownerId", "name organization")
    .populate("verificationId", "verifiedAt result")
    .populate("createdBy", "name");
  if (!certificate)
    return { error: { status: 404, message: "Certificate not found." } };
  if (
    !isPrivileged(user) &&
    certificate.ownerId._id.toString() !== user._id.toString()
  ) {
    return { error: { status: 403, message: "Unauthorized access." } };
  }
  return { certificate };
};

const getVerificationUrl = (req, certificateNumber) => {
  const baseUrl = (
    process.env.QR_BASE_URL || `${req.protocol}://${req.get("host")}`
  ).replace(/\/$/, "");
  return `${baseUrl}/verify.html?certificateNumber=${encodeURIComponent(certificateNumber)}`;
};

router.get("/", protect, async (req, res, next) => {
  try {
    const filter = isPrivileged(req.user) ? {} : { ownerId: req.user._id };
    const certificates = await Certificate.find(filter)
      .select("-qrToken -pdfPath")
      .populate("instrumentId", "instrumentId type category model serialNumber")
      .populate("verificationId", "verifiedAt result")
      .sort({ issueDate: -1 })
      .limit(100);
    res.json({ certificates });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", protect, async (req, res) => {
  try {
    const { certificate, error } = await loadAuthorizedCertificate(
      req.params.id,
      req.user,
    );
    if (error) return res.status(error.status).json({ message: error.message });
    res.json({ certificate });
  } catch (error) {
    res.status(500).json({ message: "Failed to load certificate." });
  }
});

router.get("/verify/:certificateNumber", async (req, res) => {
  try {
    const certificate = await Certificate.findOne({
      certificateNumber: req.params.certificateNumber,
    })
      .populate("instrumentId", "type manufacturer model serialNumber")
      .populate("ownerId", "name organization")
      .populate("verificationId", "verifiedAt result");

    if (!certificate) {
      return res
        .status(404)
        .json({ status: "NOT_FOUND", message: "Certificate not found." });
    }

    const now = new Date();
    let status = certificate.status;
    if (status === "REVOKED") {
      return res.json({
        status: "REVOKED",
        certificate: toPublicCertificate(certificate, status),
      });
    }
    if (certificate.validUntil <= now) {
      certificate.status = "EXPIRED";
      await certificate.save();
      return res.json({
        status: "EXPIRED",
        certificate: toPublicCertificate(certificate, "EXPIRED"),
      });
    }
    const daysRemaining = Math.ceil((certificate.validUntil - now) / 86400000);
    status = daysRemaining <= 30 ? "EXPIRING_SOON" : "VALID";
    res.json({ status, certificate: toPublicCertificate(certificate, status) });
  } catch (error) {
    res.status(500).json({ message: "Failed to verify certificate." });
  }
});

router.post(
  "/:id/revoke",
  protect,
  authorize("ADMIN", "SUPER_ADMIN"),
  async (req, res, next) => {
    try {
      const reason = String(req.body.reason || "").trim();
      if (!reason) {
        return res
          .status(400)
          .json({ message: "A revocation reason is required." });
      }
      if (reason.length > 1000) {
        return res
          .status(400)
          .json({ message: "Revocation reason is too long." });
      }
      const certificate = await Certificate.findById(req.params.id);
      if (!certificate)
        return res.status(404).json({ message: "Certificate not found." });
      if (certificate.status === "REVOKED") {
        return res
          .status(409)
          .json({ message: "Certificate is already revoked." });
      }
      const previousStatus = certificate.status;
      certificate.status = "REVOKED";
      certificate.revocationReason = reason;
      certificate.revokedBy = req.user._id;
      certificate.revokedAt = new Date();
      await certificate.save();
      await AuditLog.create({
        userId: req.user._id,
        actorRole: req.user.role,
        action: "CERTIFICATE_REVOKED",
        entityType: "Certificate",
        entityId: certificate._id.toString(),
        description: `Certificate ${certificate.certificateNumber} revoked.`,
        previousStatus,
        newStatus: "REVOKED",
        reason,
        ipAddress: req.ip,
      });
      await createNotification({
        userId: certificate.ownerId,
        type: "CERTIFICATE_REVOKED",
        title: "Certificate revoked",
        message: `Certificate ${certificate.certificateNumber} has been revoked. Reason: ${reason}`,
        idempotencyKey: `certificate:${certificate._id}:REVOKED`,
      });
      res.json({
        message: "Certificate revoked.",
        certificate: {
          id: certificate._id,
          certificateNumber: certificate.certificateNumber,
          status: certificate.status,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/:id/qr", protect, async (req, res, next) => {
  try {
    const { certificate, error } = await loadAuthorizedCertificate(
      req.params.id,
      req.user,
    );
    if (error) return res.status(error.status).json({ message: error.message });
    const url = getVerificationUrl(req, certificate.certificateNumber);
    const qrImage = await QRCode.toBuffer(url, {
      type: "png",
      errorCorrectionLevel: "M",
      margin: 1,
      width: 320,
    });
    res.type("png").send(qrImage);
  } catch (error) {
    next(error);
  }
});

router.get("/:id/pdf", protect, async (req, res, next) => {
  try {
    const { certificate, error } = await loadAuthorizedCertificate(
      req.params.id,
      req.user,
    );
    if (error) return res.status(error.status).json({ message: error.message });

    const verificationUrl = getVerificationUrl(
      req,
      certificate.certificateNumber,
    );
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 320,
    });
    const qrImage = Buffer.from(qrDataUrl.split(",")[1], "base64");
    const instrument = certificate.instrumentId;
    const owner = certificate.ownerId;
    const verification = certificate.verificationId;
    const doc = new PDFDocument({
      size: "A4",
      margin: 54,
      info: {
        Title: `Verification Certificate ${certificate.certificateNumber}`,
        Author: "e-Metrology Verification System",
        Subject: "System-generated demonstration certificate",
      },
    });
    res.type("pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${certificate.certificateNumber}.pdf"`,
    );
    doc.pipe(res);
    doc
      .fillColor("#18375b")
      .fontSize(11)
      .text("E-METROLOGY · SYSTEM GENERATED", { align: "center" });
    doc
      .moveDown(0.7)
      .fontSize(22)
      .text("Instrument Verification Certificate", { align: "center" });
    doc
      .moveDown(0.4)
      .fillColor("#5d6f80")
      .fontSize(10)
      .text(
        "Demonstration certificate; not an official government-issued document.",
        { align: "center" },
      );
    doc.moveDown(1.5).fillColor("#102030").fontSize(12);
    doc.text(`Certificate number: ${certificate.certificateNumber}`);
    doc.text(`Application number: ${certificate.applicationId}`);
    doc.text(`Owner / organization: ${owner.organization || owner.name}`);
    doc.text(`Instrument ID: ${instrument.instrumentId || "N/A"}`);
    doc.text(`Instrument: ${instrument.type} · ${instrument.category}`);
    doc.text(
      `Manufacturer / model: ${instrument.manufacturer} · ${instrument.model}`,
    );
    doc.text(`Serial number: ${instrument.serialNumber}`);
    doc.text(`Verification result: ${verification.result}`);
    doc.text(
      `Verification date: ${new Date(verification.verifiedAt).toLocaleDateString()}`,
    );
    doc.text(
      `Valid from: ${new Date(certificate.validFrom).toLocaleDateString()}`,
    );
    doc.text(
      `Valid until: ${new Date(certificate.validUntil).toLocaleDateString()}`,
    );
    doc.text(`Current status: ${certificate.status}`);
    doc.moveDown().image(qrImage, { fit: [130, 130], align: "center" });
    doc
      .moveDown(0.4)
      .fontSize(9)
      .fillColor("#1d4f91")
      .text(verificationUrl, { align: "center", link: verificationUrl });
    doc
      .moveDown(1)
      .fillColor("#5d6f80")
      .text(
        "Generated digitally by the e-Metrology prototype. Verify current status using the QR code or URL above.",
        { align: "center" },
      );
    doc.end();
  } catch (error) {
    next(error);
  }
});

function toPublicCertificate(certificate, status) {
  return {
    certificateNumber: certificate.certificateNumber,
    issueDate: certificate.issueDate,
    validFrom: certificate.validFrom,
    validUntil: certificate.validUntil,
    status,
    applicationId: certificate.applicationId,
    instrumentId: certificate.instrumentId,
    ownerId: certificate.ownerId,
    verificationId: certificate.verificationId,
    authority:
      "e-Metrology prototype system-generated certificate; not a government registry integration.",
  };
}

module.exports = router;
