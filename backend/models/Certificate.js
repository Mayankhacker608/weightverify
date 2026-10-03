const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema(
  {
    certificateNumber: { type: String, required: true, unique: true },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VerificationApplication",
      required: true,
    },
    instrumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instrument",
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    verificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Verification",
      required: true,
    },
    issueDate: { type: Date, default: Date.now },
    validFrom: { type: Date, default: Date.now },
    validUntil: { type: Date, required: true },
    status: {
      type: String,
      enum: ["VALID", "EXPIRING_SOON", "EXPIRED", "REVOKED"],
      default: "VALID",
    },
    revocationReason: { type: String, trim: true },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    revokedAt: { type: Date },
    qrToken: { type: String, required: true },
    pdfPath: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

certificateSchema.index({ validUntil: 1, status: 1 });

module.exports = mongoose.model("Certificate", certificateSchema);
