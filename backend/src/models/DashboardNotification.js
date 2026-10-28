import mongoose from "mongoose";

const dashboardNotificationSchema = new mongoose.Schema(
  {
    notificationId: { type: String, required: true, unique: true, index: true },
    recipientRole: { type: String, enum: ["admin", "operator", "all"], default: "all", index: true },
    recipientStationId: { type: String, default: null, index: true }, // null for admins
    recipientUserId: { type: String, default: null, index: true },
    stationId: { type: String, required: true, index: true },
    incidentId: { type: String, default: null, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: {
      type: String,
      enum: ["INFO", "WATCH", "LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "HIGH",
      index: true
    },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null }
  },
  { timestamps: true }
);

dashboardNotificationSchema.index({ recipientRole: 1, recipientStationId: 1, isRead: 1 });
dashboardNotificationSchema.index({ createdAt: -1 });

export const DashboardNotificationModel =
  mongoose.models.DashboardNotification ||
  mongoose.model("DashboardNotification", dashboardNotificationSchema);
