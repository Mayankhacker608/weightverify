const Certificate = require("../models/Certificate");
const { createNotification } = require("./notificationService");

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRY_WINDOW_DAYS = 30;

const processCertificateExpiries = async (now = new Date()) => {
  const soonBoundary = new Date(now.getTime() + EXPIRY_WINDOW_DAYS * DAY_MS);
  const expiringSoon = await Certificate.find({
    status: "VALID",
    validUntil: { $gt: now, $lte: soonBoundary },
  });
  for (const certificate of expiringSoon) {
    certificate.status = "EXPIRING_SOON";
    await certificate.save();
    await createNotification({
      userId: certificate.ownerId,
      type: "CERTIFICATE_EXPIRING_SOON",
      title: "Certificate expiring soon",
      message: `Certificate ${certificate.certificateNumber} expires on ${certificate.validUntil.toLocaleDateString()}. Start re-verification before it expires.`,
      idempotencyKey: `certificate:${certificate._id}:EXPIRING_SOON`,
    });
  }

  const expired = await Certificate.find({
    status: { $in: ["VALID", "EXPIRING_SOON"] },
    validUntil: { $lte: now },
  });
  for (const certificate of expired) {
    certificate.status = "EXPIRED";
    await certificate.save();
    await createNotification({
      userId: certificate.ownerId,
      type: "CERTIFICATE_EXPIRED",
      title: "Certificate expired",
      message: `Certificate ${certificate.certificateNumber} expired on ${certificate.validUntil.toLocaleDateString()}. Submit a re-verification application.`,
      idempotencyKey: `certificate:${certificate._id}:EXPIRED`,
    });
  }

  return { expiringSoon: expiringSoon.length, expired: expired.length };
};

module.exports = { processCertificateExpiries };
