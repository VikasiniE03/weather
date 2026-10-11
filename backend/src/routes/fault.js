import express from "express";
import { faultInjector } from "../engine/faultInjector.js";
import { telemetryEngine } from "../engine/telemetry.js";

const router = express.Router();

/**
 * GET /api/fault/status
 * Get current fault injector status across all stations.
 */
router.get("/status", (req, res) => {
  try {
    const status = faultInjector.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/fault/toggle
 * Toggle or update simulated fault state for ANY station and metric (temperature, humidity, or both).
 * Accepts JSON body: { stationId, metric, enabled, stuckTemperature, stuckHumidity }
 */
router.post("/toggle", (req, res) => {
  try {
    const { stationId, metric, enabled, stuckTemperature, stuckHumidity } = req.body || {};
    const targetId = stationId || faultInjector.targetStationId;
    const currentReading = telemetryEngine.getStationReading(targetId);

    const updatedStatus = faultInjector.toggle({
      stationId: targetId,
      metric,
      enabled,
      stuckTemperature: stuckTemperature !== undefined ? stuckTemperature : currentReading?.temperature,
      stuckHumidity: stuckHumidity !== undefined ? stuckHumidity : currentReading?.humidity
    });

    // Immediately trigger an evaluation cycle so the effect reflects instantly
    const tickResult = telemetryEngine.tick();

    const targetFault = updatedStatus.stationFaults[updatedStatus.targetStationId] || {};
    const metricLabel = targetFault.metric === "both" 
      ? "Temperature & Humidity" 
      : targetFault.metric === "humidity" 
      ? "Humidity" 
      : "Temperature";

    res.json({
      success: true,
      message: targetFault.enabled
        ? `Fault injected on ${updatedStatus.targetStationId}! Metric: ${metricLabel} (Temp: ${targetFault.stuckTemperature}°C, Hum: ${targetFault.stuckHumidity}%).`
        : `Fault deactivated on ${updatedStatus.targetStationId}. Normal dynamic sensor noise restored.`,
      faultStatus: updatedStatus,
      tickResult
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/fault/select
 * Switch the focused target station and metric.
 */
router.post("/select", (req, res) => {
  try {
    const { stationId, metric } = req.body || {};
    const updatedStatus = faultInjector.setTargetStation(stationId, metric);
    res.json({
      success: true,
      faultStatus: updatedStatus
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/fault/tick
 * Force an immediate telemetry cycle tick. Great for manual demonstrations.
 */
router.post("/tick", (req, res) => {
  try {
    const tickResult = telemetryEngine.tick();
    res.json({
      success: true,
      message: "Telemetry cycle advanced by 1 tick.",
      data: tickResult
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/fault/reset
 * Reset simulator history and alerts to initial clean baseline.
 */
router.post("/reset", (req, res) => {
  try {
    const resetResult = telemetryEngine.reset();
    res.json({
      success: true,
      data: resetResult
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
