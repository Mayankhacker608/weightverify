const mongoose = require("mongoose");

const invitationKeySchema = new mongoose.Schema(
  {
    keyHash: { type: String, required: true, unique: true, select: false },
    role: { type: String, enum: ["LMO", "GATC"], required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organization: { type: String, trim: true },
    state: { type: String, trim: true },
    district: { type: String, trim: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
    usedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    revokedAt: { type: Date },
  },
  { timestamps: true },
);

invitationKeySchema.index({ role: 1, usedAt: 1, revokedAt: 1, expiresAt: 1 });

module.exports = mongoose.model("InvitationKey", invitationKeySchema);
