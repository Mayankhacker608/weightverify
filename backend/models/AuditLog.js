const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  actorRole: { type: String },
  action: { type: String, required: true },
  entityType: { type: String },
  entityId: { type: String },
  description: { type: String },
  previousStatus: { type: String },
  newStatus: { type: String },
  reason: { type: String },
  ipAddress: { type: String },
  createdAt: { type: Date, default: Date.now },
});

auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
