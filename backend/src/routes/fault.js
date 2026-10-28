import express from "express";
import { faultInjector } from "../engine/faultInjector.js";
import { telemetryEngine } from "../engine/telemetry.js";
import { smsService } from "../engine/smsService.js";
import { operatorManager } from "../engine/operatorManager.js";
import { repository } from "../database/repository.js";
import { optionalAuth, requireAdmin } from "../middleware/auth.js";

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
      data: status,
      intervalMs: telemetryEngine.intervalMs,
      isRunning: Boolean(telemetryEngine.timer)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/fault/toggle
 * Toggle or update simulated fault state for ANY station and fault mode:
 * Accepts: { stationId, metric, enabled, faultMode, stuckTemperature, stuckHumidity, operatorMobile }
 */
router.post("/toggle", optionalAuth, async (req, res) => {
  try {
    // If authenticated, non-admins cannot inject faults
    if (req.user && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Access Denied. Only Administrators can control the fault injector."
      });
    }

    const {
      stationId,
      metric,
      enabled,
      faultMode,
      stuckTemperature,
      stuckHumidity,
      operatorMobile
    } = req.body || {};

    const targetId = stationId || faultInjector.targetStationId;
    const currentReading = telemetryEngine.getStationReading(targetId);

    // Update operator mobile if provided
    if (operatorMobile && operatorMobile.trim()) {
      operatorManager.updateOperator(targetId, { phone: operatorMobile.trim() });
    }

    // Reset SMS cooldown for intentional fault testing
    smsService.resetCooldown(targetId, "SENSOR_FAULT");

    const updatedStatus = faultInjector.toggle({
      stationId: targetId,
      metric,
      enabled,
      faultMode: faultMode || "STUCK",
      stuckTemperature: stuckTemperature !== undefined ? stuckTemperature : currentReading?.temperature,
      stuckHumidity: stuckHumidity !== undefined ? stuckHumidity : currentReading?.humidity
    });

    // Advance 1 cycle immediately
    const tickResult = await telemetryEngine.tick();

    await repository.logAudit(
      updatedStatus.enabled ? "FAULT_INJECTED" : "FAULT_CLEARED",
      req.user || { name: "Simulator Control", role: "admin" },
      targetId,
      { faultMode: faultMode || "STUCK", metric, enabled: updatedStatus.enabled }
    );

    const targetFault = updatedStatus.stationFaults[updatedStatus.targetStationId] || {};
    const modeLabel = targetFault.faultMode || "STUCK";

    res.json({
      success: true,
      message: targetFault.enabled
        ? `Fault [${modeLabel}] injected on ${updatedStatus.targetStationId}! Metric: ${targetFault.metric}. Evaluation pipeline engaged.`
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
 * POST /api/fault/interval
 * Set telemetry simulation interval (ms)
 */
router.post("/interval", optionalAuth, (req, res) => {
  try {
    if (req.user && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin access required." });
    }

    const { intervalMs } = req.body || {};
    if (!intervalMs || isNaN(intervalMs)) {
      return res.status(400).json({ success: false, error: "Valid intervalMs required." });
    }

    telemetryEngine.setInterval(parseInt(intervalMs, 10));
    res.json({
      success: true,
      message: `Simulation interval set to ${telemetryEngine.intervalMs}ms.`,
      intervalMs: telemetryEngine.intervalMs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/fault/playback
 * Start or pause automated simulation timer
 */
router.post("/playback", optionalAuth, (req, res) => {
  try {
    if (req.user && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin access required." });
    }

    const { action } = req.body || {}; // 'start' | 'stop' | 'toggle'
    if (action === "stop" || (action === "toggle" && telemetryEngine.timer)) {
      telemetryEngine.stop();
      return res.json({ success: true, isRunning: false, message: "Telemetry simulation paused." });
    } else {
      telemetryEngine.start();
      return res.json({ success: true, isRunning: true, message: "Telemetry simulation started." });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/fault/tick
 * Force an immediate telemetry cycle tick.
 */
router.post("/tick", async (req, res) => {
  try {
    const tickResult = await telemetryEngine.tick();
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
 * Reset simulator history and alerts to baseline while preserving audit history.
 */
router.post("/reset", optionalAuth, async (req, res) => {
  try {
    if (req.user && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin access required to reset simulation." });
    }

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
