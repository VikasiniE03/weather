import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    noteId: { type: String, required: true },
    text: { type: String, required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, required: true },
    authorEmail: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const anomalyIncidentSchema = new mongoose.Schema(
  {
    incidentId: { type: String, required: true, unique: true, index: true },
    stationId: { type: String, required: true, index: true },
    stationName: { type: String, required: true },
    triggerCategory: {
      type: String,
      enum: ["SENSOR_FAULT", "WEATHER_EMERGENCY", "COMMUNICATION_FAILURE"],
      default: "SENSOR_FAULT",
      index: true
    },
    faultType: { type: String, required: true, index: true },
    primaryMetric: { type: String, default: "temperature" },
    faultyMetrics: [{ type: String }],
    severity: {
      type: String,
      enum: ["WATCH", "LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "HIGH",
      index: true
    },
    status: {
      type: String,
      enum: ["OPEN", "ACKNOWLEDGED", "RESOLVED"],
      default: "OPEN",
      index: true
    },
    observedValue: { type: Number, default: null },
    expectedValue: { type: Number, default: null },
    divergence: { type: Number, default: 0 },
    streakCount: { type: Number, default: 1 },
    confidence: { type: Number, default: 80 },
    reason: { type: String, default: "" },
    recommendedAction: { type: String, default: "" },
    assignedOperator: {
      id: String,
      name: String,
      phone: String,
      email: String,
      role: String
    },
    notes: [noteSchema],
    acknowledgedAt: { type: Date, default: null },
    acknowledgedBy: {
      userId: String,
      name: String,
      role: String
    },
    resolvedAt: { type: Date, default: null },
    resolvedBy: {
      userId: String,
      name: String,
      role: String,
      resolutionNote: String
    },
    lastSeenAt: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

// Compound index for finding active incidents per station quickly
anomalyIncidentSchema.index({ stationId: 1, status: 1 });
anomalyIncidentSchema.index({ createdAt: -1 });

export const AnomalyIncidentModel =
  mongoose.models.AnomalyIncident || mongoose.model("AnomalyIncident", anomalyIncidentSchema);
