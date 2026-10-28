import mongoose from "mongoose";

const weatherStationSchema = new mongoose.Schema(
  {
    stationId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    location: { type: String, required: true },
    lat: { type: Number, required: true },
    lon: { type: Number, required: true },
    elevation: { type: Number, default: 0 },
    zone: { type: String, default: "Urban Grid" },
    description: { type: String, default: "" },
    baseTemp: { type: Number, default: 30.0 },
    baseHumidity: { type: Number, default: 70.0 },
    basePressure: { type: Number, default: 1010.0 },
    baseWindSpeed: { type: Number, default: 10.0 },
    baseWindDirection: { type: String, default: "E" },
    baseRainfall: { type: Number, default: 0.0 },
    status: { type: String, enum: ["NORMAL", "WARNING", "ANOMALY", "OFFLINE"], default: "NORMAL", index: true },
    isOnline: { type: Boolean, default: true, index: true },
    isFaultTarget: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now, index: true },
    operator: {
      id: String,
      name: String,
      role: String,
      phone: String,
      email: String,
      shift: String,
      smsAlertsEnabled: { type: Boolean, default: true },
      weatherAlertsEnabled: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

export const WeatherStationModel =
  mongoose.models.WeatherStation || mongoose.model("WeatherStation", weatherStationSchema);
