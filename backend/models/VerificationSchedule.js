const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "VerificationApplication",
      required: true,
    },
    officerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    gatcId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    date: { type: Date, required: true },
    time: { type: String },
    location: { type: String },
    status: {
      type: String,
      enum: ["PENDING", "ASSIGNED", "COMPLETED", "CANCELLED"],
      default: "PENDING",
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

scheduleSchema.index({ applicationId: 1 });

module.exports = mongoose.model("VerificationSchedule", scheduleSchema);
