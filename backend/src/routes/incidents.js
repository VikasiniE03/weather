import express from "express";
import { repository } from "../database/repository.js";
import { authenticateToken, requireStationAccess } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/incidents
 * List incidents. Operators see ONLY incidents for their assigned station.
 * Admins can filter by stationId or view all.
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { status, limit } = req.query;
    let stationId = req.query.stationId;

    // Enforce role-based station filtering
    if (req.user.role === "operator") {
      stationId = req.user.assignedStationId;
    }

    const incidents = await repository.getIncidents({
      stationId,
      status,
      limit: limit ? parseInt(limit, 10) : 50
    });

    res.json({
      success: true,
      count: incidents.length,
      stationFilter: stationId || "ALL_STATIONS",
      data: incidents
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/incidents/:id
 * Retrieve a specific incident. Operators can only view incidents for their assigned station.
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const incident = await repository.getIncidentById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, error: "Incident not found." });
    }

    if (req.user.role === "operator" && incident.stationId !== req.user.assignedStationId) {
      return res.status(403).json({
        success: false,
        error: `Access Denied. You are only authorized to view incidents for station ${req.user.assignedStationId}.`
      });
    }

    res.json({ success: true, data: incident });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/incidents/:id/acknowledge
 * Acknowledge an incident and add inspection note.
 */
router.post("/:id/acknowledge", authenticateToken, async (req, res) => {
  try {
    const incident = await repository.getIncidentById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, error: "Incident not found." });
    }

    if (req.user.role === "operator" && incident.stationId !== req.user.assignedStationId) {
      return res.status(403).json({
        success: false,
        error: `Access Denied. You cannot acknowledge incidents for station ${incident.stationId}.`
      });
    }

    const { note } = req.body || {};
    const updated = await repository.acknowledgeIncident(req.params.id, req.user, note);

    await repository.logAudit("INCIDENT_ACKNOWLEDGED", req.user, incident.stationId, {
      incidentId: incident.incidentId,
      note
    });

    res.json({
      success: true,
      message: `Incident ${incident.incidentId} acknowledged by ${req.user.name}.`,
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/incidents/:id/resolve
 * Resolve an incident with resolution notes.
 */
router.post("/:id/resolve", authenticateToken, async (req, res) => {
  try {
    const incident = await repository.getIncidentById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, error: "Incident not found." });
    }

    if (req.user.role === "operator" && incident.stationId !== req.user.assignedStationId) {
      return res.status(403).json({
        success: false,
        error: `Access Denied. You cannot resolve incidents for station ${incident.stationId}.`
      });
    }

    const { resolutionNote } = req.body || {};
    const updated = await repository.resolveIncident(req.params.id, req.user, resolutionNote);

    await repository.logAudit("INCIDENT_RESOLVED", req.user, incident.stationId, {
      incidentId: incident.incidentId,
      resolutionNote
    });

    res.json({
      success: true,
      message: `Incident ${incident.incidentId} marked as RESOLVED.`,
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/incidents/:id/notes
 * Add an inspection log note to an incident.
 */
router.post("/:id/notes", authenticateToken, async (req, res) => {
  try {
    const incident = await repository.getIncidentById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, error: "Incident not found." });
    }

    if (req.user.role === "operator" && incident.stationId !== req.user.assignedStationId) {
      return res.status(403).json({
        success: false,
        error: `Access Denied. You cannot add notes for station ${incident.stationId}.`
      });
    }

    const { text } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: "Note text is required." });
    }

    const updated = await repository.addIncidentNote(req.params.id, req.user, text.trim());

    res.json({
      success: true,
      message: "Inspection note recorded.",
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
