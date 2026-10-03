const mongoose = require("mongoose");

const instrumentSchema = new mongoose.Schema(
  {
    instrumentId: { type: String, required: true, unique: true },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: { type: String, required: true },
    category: { type: String, required: true },
    manufacturer: { type: String, required: true },
    model: { type: String, required: true },
    serialNumber: { type: String, required: true },
    capacity: { type: String },
    accuracy: { type: String },
    location: { type: String },
    purchaseDate: { type: Date },
    currentStatus: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "UNDER_VERIFICATION"],
      default: "ACTIVE",
    },
    documents: [
      {
        name: String,
        path: String,
        mimeType: String,
        documentType: String,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    photos: [
      {
        name: String,
        path: String,
        mimeType: String,
        documentType: String,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    verificationHistory: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Verification" },
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

instrumentSchema.index({ ownerId: 1, instrumentId: 1 });
instrumentSchema.index({ serialNumber: 1 });

module.exports = mongoose.model("Instrument", instrumentSchema);
