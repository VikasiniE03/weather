import express from "express";
import { repository } from "../database/repository.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/audit-logs
 * List system audit logs (Admin only)
 */
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit } = req.query;
    const logs = await repository.getAuditLogs(limit ? parseInt(limit, 10) : 100);
    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
