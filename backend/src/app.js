import express from "express";
import cors from "cors";
import stationsRouter from "./routes/stations.js";
import alertsRouter from "./routes/alerts.js";
import faultRouter from "./routes/fault.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Request logger for developer visibility
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith("/api") && !req.originalUrl.includes("/stations?")) {
      // Keep logs reasonably quiet for polling requests
      // console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use("/api/stations", stationsRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/fault", faultRouter);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "AeroSense Weather Sensor Anomaly Engine",
    version: "1.0.0",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Root API documentation endpoint
app.get("/api", (req, res) => {
  res.json({
    service: "AeroSense Anomaly Detection API",
    endpoints: {
      "GET /api/stations": "List all 5 stations with current telemetry & status",
      "GET /api/stations/:id/history": "Time-series records for station",
      "GET /api/stations/comparison": "Multi-station comparison time-series for Recharts",
      "GET /api/alerts": "Active and past anomaly alerts",
      "POST /api/alerts/clear": "Clear alert history",
      "GET /api/fault/status": "Fault injector status",
      "POST /api/fault/toggle": "Toggle stuck sensor fault on target station",
      "POST /api/fault/tick": "Trigger manual 1-step telemetry cycle",
      "POST /api/fault/reset": "Reset simulation to initial baseline"
    }
  });
});

export default app;
