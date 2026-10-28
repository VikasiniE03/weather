import express from "express";
import cors from "cors";
import stationsRouter from "./routes/stations.js";
import alertsRouter from "./routes/alerts.js";
import faultRouter from "./routes/fault.js";
import operatorsRouter from "./routes/operators.js";
import smsRouter from "./routes/sms.js";
import weatherRouter from "./routes/weather.js";
import authRouter from "./routes/auth.js";
import incidentsRouter from "./routes/incidents.js";
import notificationsRouter from "./routes/notifications.js";
import auditRouter from "./routes/audit.js";
import { telemetryEngine } from "./engine/telemetry.js";
import { dbConnection } from "./database/db.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Request logger for developer visibility
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith("/api") && !req.originalUrl.includes("/sync") && !req.originalUrl.includes("/notifications/unread-count")) {
      // Keep console clean during high frequency polling
      // console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Single atomic sync endpoint for frontend polling
app.get("/api/sync", (req, res) => {
  try {
    const { targetId, neighbors } = req.query;
    const neighborList = neighbors ? neighbors.split(",") : null;
    const payload = telemetryEngine.getSyncPayload(targetId || "STN-003", neighborList);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/stations", stationsRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/incidents", incidentsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/audit-logs", auditRouter);
app.use("/api/fault", faultRouter);
app.use("/api/operators", operatorsRouter);
app.use("/api/sms", smsRouter);
app.use("/api/weather", weatherRouter);

// Health check endpoint with storage driver telemetry
app.get("/api/health", (req, res) => {
  const dbStatus = dbConnection.getStatus();
  res.json({
    status: "healthy",
    service: "AeroSense Weather Sensor Anomaly Engine",
    version: "2.0.0",
    uptime: process.uptime(),
    database: {
      connected: dbStatus.isMongoConnected,
      activeDriver: dbStatus.activeDriver,
      persistent: dbStatus.persistent,
      message: dbStatus.isMongoConnected
        ? "MongoDB Atlas/Local Cluster Active"
        : "Persistent File-Backed JSON Store Active (backend/data/)"
    },
    telemetry: {
      intervalMs: telemetryEngine.intervalMs,
      cycleCount: telemetryEngine.cycleCount,
      activeAlertsCount: telemetryEngine.alerts.filter((a) => a.active).length
    },
    timestamp: new Date().toISOString()
  });
});

// Root API documentation endpoint
app.get("/api", (req, res) => {
  res.json({
    service: "AERO-SENSE Spatial-Temporal Weather Anomaly Detection API",
    version: "2.0.0",
    endpoints: {
      auth: {
        "POST /api/auth/login": "User login with email & password, returns JWT",
        "GET /api/auth/me": "Get current session profile & allowed stations",
        "POST /api/auth/logout": "End session",
        "GET /api/auth/demo-credentials": "List pre-configured test credentials"
      },
      stations: {
        "GET /api/stations": "List all 5 weather stations with status & operator info",
        "GET /api/stations/:id": "Detailed metrics, sensor health, and incidents for station (RBAC enforced)",
        "GET /api/stations/:id/history": "Time-series records for station (RBAC enforced)",
        "GET /api/stations/comparison": "Multi-station comparison time-series for Recharts",
        "GET /api/stations/sync": "Atomic synchronization payload"
      },
      incidents: {
        "GET /api/incidents": "List persistent anomaly incidents (Operator sees only assigned station)",
        "GET /api/incidents/:id": "Incident details",
        "POST /api/incidents/:id/acknowledge": "Acknowledge incident",
        "POST /api/incidents/:id/resolve": "Resolve incident",
        "POST /api/incidents/:id/notes": "Add inspection note"
      },
      notifications: {
        "GET /api/notifications": "Targeted dashboard notifications",
        "GET /api/notifications/unread-count": "Unread notification count",
        "PUT /api/notifications/:id/read": "Mark notification as read",
        "PUT /api/notifications/read-all": "Mark all notifications read"
      },
      simulator: {
        "GET /api/fault/status": "Fault injector status",
        "POST /api/fault/toggle": "Toggle fault (STUCK, INVALID_BOUNDS, SUDDEN_SPIKE, OFFLINE, SPATIAL_DEVIATION)",
        "POST /api/fault/tick": "Trigger manual 1-step telemetry cycle",
        "POST /api/fault/playback": "Start or pause automated telemetry simulation",
        "POST /api/fault/interval": "Configure simulation tick interval (ms)",
        "POST /api/fault/reset": "Reset simulation to initial baseline"
      },
      telecom: {
        "GET /api/sms/config": "SMS carrier gateway configuration (masked)",
        "POST /api/sms/config": "Update carrier configuration (Twilio / Fast2SMS)",
        "GET /api/sms/log": "SMS dispatch outbox log",
        "POST /api/sms/send-test": "Dispatch test SMS to station operator"
      }
    }
  });
});

export default app;
