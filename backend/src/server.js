import app from "./app.js";
import { telemetryEngine } from "./engine/telemetry.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 5000;

// Start real-time mock telemetry simulation engine (ticks every 5 seconds)
telemetryEngine.start();
console.log("⚡ Telemetry Simulation Engine started (5-second cycle interval).");

const server = app.listen(PORT, () => {
  console.log(`🚀 AeroSense Anomaly Detection Server running on http://localhost:${PORT}`);
  console.log(`📡 Monitored Stations: 5 Weather Nodes deployed across Chennai`);
  console.log(`🎯 Primary Fault Target: STN-003 (Guindy Tech Park)`);
});

// Graceful shutdown handling
process.on("SIGINT", () => {
  console.log("\nGracefully shutting down telemetry engine...");
  telemetryEngine.stop();
  server.close(() => {
    process.exit(0);
  });
});

process.on("SIGTERM", () => {
  telemetryEngine.stop();
  server.close(() => {
    process.exit(0);
  });
});
