import express from "express";
import { operatorManager } from "../engine/operatorManager.js";
import { repository } from "../database/repository.js";
import { optionalAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/operators
 * List all designated station operators and their contact parameters.
 */
router.get("/", (req, res) => {
  try {
    const operators = operatorManager.getAllOperators();
    res.json({
      success: true,
      count: operators.length,
      data: operators,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/operators/:stationId
 * Retrieve operator for a specific station.
 */
router.get("/:stationId", (req, res) => {
  try {
    const { stationId } = req.params;
    const operator = operatorManager.getOperatorByStation(stationId);
    if (!operator) {
      return res.status(404).json({ success: false, message: `Operator for ${stationId} not found` });
    }
    res.json({ success: true, data: operator });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/operators/:stationId
 * Update station operator details.
 * Allowed for Admin OR the assigned Station Operator.
 */
router.put("/:stationId", optionalAuth, async (req, res) => {
  try {
    const { stationId } = req.params;

    if (req.user && req.user.role === "operator" && req.user.assignedStationId !== stationId) {
      return res.status(403).json({
        success: false,
        error: `Access Denied. You are authorized to update only station ${req.user.assignedStationId}.`
      });
    }

    const updates = req.body || {};
    const updated = operatorManager.updateOperator(stationId, updates);

    await repository.logAudit("OPERATOR_UPDATED", req.user || { name: "System", role: "operator" }, stationId, {
      updatedFields: Object.keys(updates)
    });

    res.json({
      success: true,
      message: `Operator details updated for station ${stationId}`,
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/operators/reset
 * Reset all operators back to standard configurations. Admin only.
 */
router.post("/reset", optionalAuth, async (req, res) => {
  try {
    if (req.user && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Admin access required." });
    }

    const result = operatorManager.reset();
    await repository.logAudit("OPERATORS_RESET", req.user || { name: "Admin", role: "admin" }, null);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
