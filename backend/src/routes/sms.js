import express from "express";
import { smsService } from "../engine/smsService.js";
import { operatorManager } from "../engine/operatorManager.js";
import { repository } from "../database/repository.js";
import { optionalAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/sms/config
 * Get live carrier SMS gateway configuration with masked keys.
 */
router.get("/config", (req, res) => {
  try {
    const config = smsService.getConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/sms/config
 * Update carrier SMS gateway configuration. Admin only.
 */
router.post("/config", optionalAuth, async (req, res) => {
  try {
    if (req.user && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin access required." });
    }

    const updated = smsService.updateConfig(req.body || {});

    await repository.logAudit("SMS_CONFIG_UPDATED", req.user || { name: "System Admin", role: "admin" }, null, {
      provider: updated.provider
    });

    res.json({
      success: true,
      message: "SMS Carrier Gateway settings updated successfully.",
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/sms/log
 * Retrieve historical SMS alert dispatch log (outbox).
 */
router.get("/log", optionalAuth, (req, res) => {
  try {
    let logs = smsService.getSmsLog();

    // If operator is authenticated, only show dispatches for their assigned station
    if (req.user && req.user.role === "operator" && req.user.assignedStationId) {
      logs = logs.filter((l) => l.stationId === req.user.assignedStationId);
    }

    res.json({
      success: true,
      count: logs.length,
      data: logs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/sms/send-test
 * Dispatch an on-demand test SMS to the station's assigned operator.
 * Body: { stationId, customPhone, customMessage }
 */
router.post("/send-test", optionalAuth, async (req, res) => {
  try {
    let { stationId, customPhone, customMessage } = req.body || {};
    const targetId = stationId || (req.user?.assignedStationId ? req.user.assignedStationId : "STN-003");

    // If operator is authenticated, enforce station restriction
    if (req.user && req.user.role === "operator" && req.user.assignedStationId) {
      if (targetId !== req.user.assignedStationId) {
        return res.status(403).json({
          success: false,
          error: `Access Denied. You are authorized to test SMS only for your assigned station ${req.user.assignedStationId}.`
        });
      }
    }

    if (customPhone && customPhone.trim()) {
      operatorManager.updateOperator(targetId, { phone: customPhone.trim() });
    }

    const dispatchResult = await smsService.dispatchAlertSms({
      stationId: targetId,
      triggerType: "TEST_DISPATCH",
      severity: "TEST",
      details: {
        message: customMessage || "Manual telecommunications pathway verification."
      },
      force: true
    });

    await repository.logAudit("TEST_SMS_SENT", req.user || { name: "Operator", role: "operator" }, targetId, {
      status: dispatchResult.record?.status
    });

    res.json({
      success: dispatchResult.dispatched,
      message: dispatchResult.message,
      data: dispatchResult.record || null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/sms/clear
 * Clear all logged SMS messages from outbox. Admin only.
 */
router.post("/clear", optionalAuth, (req, res) => {
  try {
    if (req.user && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin access required." });
    }

    const result = smsService.clearSmsLog();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
