import mongoose from "mongoose";

const sensorReadingSchema = new mongoose.Schema(
  {
    stationId: { type: String, required: true, index: true },
    cycle: { type: Number, required: true, index: true },
    timestamp: { type: Date, required: true, default: Date.now, index: true },
    temperature: { type: Number, required: true },
    humidity: { type: Number, required: true },
    pressure: { type: Number, required: true },
    windSpeed: { type: Number, default: 0 },
    windDirection: { type: String, default: "E" },
    rainfall: { type: Number, default: 0 },
    isValid: { type: Boolean, default: true },
    isFaultInjected: { type: Boolean, default: false },
    faultMetric: { type: String, default: null },
    stuckCycleCount: { type: Number, default: 0 },
    isWeatherEmergency: { type: Boolean, default: false },
    weatherEmergencyType: { type: String, default: null }
  },
  { timestamps: true }
);

// Compound index for fast time-series queries
sensorReadingSchema.index({ stationId: 1, timestamp: -1 });

export const SensorReadingModel =
  mongoose.models.SensorReading || mongoose.model("SensorReading", sensorReadingSchema);
