import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    logId: { type: String, required: true, unique: true, index: true },
    action: { type: String, required: true, index: true },
    performedBy: {
      userId: { type: String, default: "SYSTEM" },
      name: { type: String, default: "System Engine" },
      role: { type: String, default: "system" },
      email: { type: String, default: "" }
    },
    targetStationId: { type: String, default: null, index: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: "" }
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLogModel =
  mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
