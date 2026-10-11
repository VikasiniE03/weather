import express from "express";
import { telemetryEngine } from "../engine/telemetry.js";

const router = express.Router();

/**
 * GET /api/alerts
 * List of active and historical flagged anomalies.
 */
router.get("/", (req, res) => {
  try {
    const { activeOnly } = req.query;
    const alerts = telemetryEngine.getAlerts(activeOnly === "true");

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
 * Clear all alert logs.
 */
router.post("/clear", (req, res) => {
  try {
    const result = telemetryEngine.clearAlerts();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
