const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    applicationId: { type: String, required: true, unique: true },
    applicantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    instrumentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instrument",
      required: true,
    },
    previousCertificateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Certificate",
    },
    applicationType: {
      type: String,
      enum: ["Initial Verification", "Re-Verification"],
      required: true,
    },
    documents: [
      {
        name: String,
        path: String,
        mimeType: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    fieldEvidence: [
      {
        name: { type: String, required: true },
        path: { type: String, required: true },
        mimeType: { type: String, required: true },
        documentType: { type: String, required: true },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    preferredDate: { type: Date },
    status: {
      type: String,
      enum: [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "DOCUMENTS_REQUIRED",
        "APPROVED_FOR_SCHEDULING",
        "ASSIGNED",
        "SCHEDULED",
        "FIELD_VERIFICATION",
        "LMO_REVIEW",
        "GATC_REVIEW",
        "FINAL_REVIEW",
        "APPROVED",
        "VERIFIED",
        "REJECTED",
        "CERTIFICATE_ISSUED",
        "CERTIFICATE_GENERATED",
        "EXPIRED",
        "REVERIFICATION_REQUIRED",
        "CANCELLED",
      ],
      default: "DRAFT",
    },
    assignedOfficer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedGATC: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    scheduledDate: { type: Date },
    scheduleLocation: { type: String },
    remarks: { type: String },
    rejectionReason: { type: String },
    statusHistory: [
      {
        status: { type: String, required: true },
        actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        actorRole: { type: String },
        action: { type: String },
        reason: { type: String },
        at: { type: Date, default: Date.now },
      },
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

applicationSchema.index({ applicantId: 1, status: 1 });
applicationSchema.index({ instrumentId: 1 });

module.exports = mongoose.model("VerificationApplication", applicationSchema);
