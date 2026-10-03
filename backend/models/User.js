const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["USER", "LMO", "GATC", "ADMIN", "SUPER_ADMIN"],
      default: "USER",
    },
    organization: { type: String, trim: true },
    address: { type: String, trim: true },
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    staffProfile: {
      designation: { type: String, trim: true },
      employeeId: { type: String, trim: true },
      authorizationNumber: { type: String, trim: true },
      verificationStatus: {
        type: String,
        enum: [
          "NOT_REQUIRED",
          "PENDING",
          "UNDER_REVIEW",
          "VERIFIED",
          "REJECTED",
          "RESUBMISSION_REQUIRED",
        ],
        default: "NOT_REQUIRED",
      },
      reviewReason: { type: String, trim: true },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reviewedAt: { type: Date },
      documents: [
        {
          documentType: { type: String, required: true },
          originalName: { type: String, required: true },
          storedName: { type: String, required: true },
          path: { type: String, required: true },
          mimeType: { type: String, required: true },
          uploadedAt: { type: Date, default: Date.now },
          verificationStatus: {
            type: String,
            enum: ["PENDING", "VERIFIED", "REJECTED", "RESUBMISSION_REQUIRED"],
            default: "PENDING",
          },
          reviewReason: { type: String },
          reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          reviewedAt: { type: Date },
        },
      ],
    },
    status: {
      type: String,
      enum: ["ACTIVE", "PENDING", "REJECTED", "INACTIVE"],
      default: "ACTIVE",
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, state: 1, district: 1 });

module.exports = mongoose.model("User", userSchema);
