import express from "express";
import { telemetryEngine } from "../engine/telemetry.js";
import { optionalAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/alerts
 * List of active and historical flagged anomalies.
 * If operator is authenticated, returns only alerts for their assigned station.
 */
router.get("/", optionalAuth, (req, res) => {
  try {
    const { activeOnly } = req.query;
    let alerts = telemetryEngine.getAlerts(activeOnly === "true");

    if (req.user && req.user.role === "operator" && req.user.assignedStationId) {
      alerts = alerts.filter((a) => a.stationId === req.user.assignedStationId);
    }

    res.json({
      success: true,
      count: alerts.length,
      activeCount: alerts.filter((a) => a.active).length,
      data: alerts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/alerts/clear
 * Clear all alert logs. Admin only.
 */
router.post("/clear", optionalAuth, (req, res) => {
  try {
    if (req.user && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin access required to clear alerts." });
    }

    const result = telemetryEngine.clearAlerts();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
