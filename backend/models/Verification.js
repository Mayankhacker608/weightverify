const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VerificationApplication",
      required: true,
    },
    verifierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    checklist: {
      instrumentPhysicallyAvailable: { type: Boolean },
      identificationVerified: { type: Boolean },
      serialNumberChecked: { type: Boolean },
      sealChecked: { type: Boolean },
      physicalCondition: { type: String },
      displayIndication: { type: String },
      accuracy: { type: String },
      otherRequiredChecks: { type: String },
    },
    measurements: {
      observedMeasurement: { type: Number },
      standardMeasurement: { type: Number },
      error: { type: Number },
      permissibleError: { type: Number },
    },
    observations: { type: String },
    remarks: { type: String },
    photographs: [
      {
        name: String,
        path: String,
        mimeType: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    supportingDocuments: [
      {
        name: String,
        path: String,
        mimeType: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    latitude: { type: Number },
    longitude: { type: Number },
    result: {
      type: String,
      enum: ["PASS", "FAIL", "PENDING"],
      default: "PENDING",
    },
    verifiedAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

verificationSchema.index({ applicationId: 1 });
verificationSchema.index({ verifierId: 1 });

module.exports = mongoose.model("Verification", verificationSchema);
