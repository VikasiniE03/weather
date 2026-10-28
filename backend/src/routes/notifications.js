import express from "express";
import { repository } from "../database/repository.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/notifications
 * Get notifications targeted to authenticated user (operator only gets their station's notifications).
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { unreadOnly } = req.query;
    const notifications = await repository.getNotificationsForUser(
      req.user,
      unreadOnly === "true"
    );

    res.json({
      success: true,
      count: notifications.length,
      unreadCount: notifications.filter((n) => !n.isRead).length,
      data: notifications
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notifications/unread-count
 * Quick badge endpoint for header
 */
router.get("/unread-count", authenticateToken, async (req, res) => {
  try {
    const notifications = await repository.getNotificationsForUser(req.user, true);
    res.json({
      success: true,
      unreadCount: notifications.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put("/:id/read", authenticateToken, async (req, res) => {
  try {
    const updated = await repository.markNotificationRead(req.params.id);
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read for current user
 */
router.put("/read-all", authenticateToken, async (req, res) => {
  try {
    const result = await repository.markAllNotificationsRead(req.user);
    res.json({ success: true, message: "All notifications marked as read.", data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
