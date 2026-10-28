import express from "express";
import { weatherAlertDetector } from "../engine/weatherAlertDetector.js";
import { telemetryEngine } from "../engine/telemetry.js";
import { smsService } from "../engine/smsService.js";
import { operatorManager } from "../engine/operatorManager.js";
import { repository } from "../database/repository.js";
import { optionalAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/weather/emergencies
 * Get list of currently active simulated severe weather emergencies.
 */
router.get("/emergencies", (req, res) => {
  try {
    const emergencies = weatherAlertDetector.getActiveEmergencies();
    res.json({
      success: true,
      data: emergencies
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/weather/simulate
 * Inject or clear a serious weather hazard on target station.
 * Body: { stationId, type: "CYCLONE" | "HEATWAVE" | "FLOOD_STORM" | "NONE", operatorMobile }
 */
router.post("/simulate", optionalAuth, async (req, res) => {
  try {
    if (req.user && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin access required to simulate weather emergencies." });
    }

    const { stationId, type, operatorMobile } = req.body || {};
    const targetId = stationId || "STN-001";
    const emergencyType = type || "CYCLONE";

    if (operatorMobile && operatorMobile.trim()) {
      operatorManager.updateOperator(targetId, { phone: operatorMobile.trim() });
    }

    const result = weatherAlertDetector.setEmergencyOverride(targetId, emergencyType);

    // Reset SMS cooldown for instant dispatch
    smsService.resetCooldown(targetId, "WEATHER_EMERGENCY");

    // Advance 1 telemetry tick to process and propagate
    const tickResult = await telemetryEngine.tick();

    await repository.logAudit("WEATHER_EMERGENCY_SIMULATED", req.user || { name: "Simulator", role: "admin" }, targetId, {
      emergencyType
    });

    res.json({
      success: true,
      message: result.message,
      emergency: result,
      tickResult
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/weather/clear
 * Clear all weather emergency overrides across all stations.
 */
router.post("/clear", optionalAuth, async (req, res) => {
  try {
    if (req.user && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin access required." });
    }

    const result = weatherAlertDetector.clearEmergencies();
    await telemetryEngine.tick();

    await repository.logAudit("WEATHER_EMERGENCIES_CLEARED", req.user || { name: "Simulator", role: "admin" }, null);

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
