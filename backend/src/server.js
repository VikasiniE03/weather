import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { telemetryEngine } from "./engine/telemetry.js";
import { dbConnection } from "./database/db.js";
import { seedDatabase } from "./scripts/seed.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  // 1. Initialize Database connection & seed baseline
  await dbConnection.connect();
  await seedDatabase();

  // 2. Create HTTP & WebSocket Server
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Attach WebSocket to telemetry engine
  telemetryEngine.setSocketServer(io);

  io.on("connection", (socket) => {
    // Optional station room subscription
    socket.on("subscribe:station", (stationId) => {
      socket.join(`station:${stationId}`);
    });

    socket.on("unsubscribe:station", (stationId) => {
      socket.leave(`station:${stationId}`);
    });
  });

  // 3. Start real-time mock telemetry simulation engine (ticks every 5 seconds)
  telemetryEngine.start();
  console.log(`⚡ Telemetry Simulation Engine started (${telemetryEngine.intervalMs / 1000}s interval).`);

  server.listen(PORT, () => {
    console.log(`🚀 AeroSense Anomaly Detection Server running on http://localhost:${PORT}`);
    console.log(`📡 Monitored Stations: 5 Weather Nodes deployed across Chennai`);
    console.log(`🎯 Primary Fault Target: STN-003 (Guindy Tech Park)`);
    console.log(`🔌 WebSocket Server (Socket.IO) active for live telemetry & alerts`);
  });

  // Graceful shutdown handling
  const shutdown = () => {
    console.log("\nGracefully shutting down telemetry engine & database connection...");
    telemetryEngine.stop();
    server.close(async () => {
      await dbConnection.disconnect();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((err) => {
  console.error("Fatal server bootstrap error:", err);
  process.exit(1);
});
