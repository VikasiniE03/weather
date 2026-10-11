import express from "express";
import { telemetryEngine } from "../engine/telemetry.js";

const router = express.Router();

/**
 * GET /api/stations
 * List all stations with current telemetry readings, anomaly reports, and spatial coordinates.
 */
router.get("/", (req, res) => {
  try {
    const stations = telemetryEngine.getStations();
    res.json({
      success: true,
      count: stations.length,
      data: stations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/stations/comparison
 * Merged comparison time-series for Target Station (STN-003) and its neighbors for Recharts.
 */
router.get("/comparison", (req, res) => {
  try {
    const { targetId, neighbors } = req.query;
    const neighborList = neighbors ? neighbors.split(",") : null;
    const result = telemetryEngine.getComparisonData(targetId || "STN-003", neighborList);

    res.json({
      success: true,
      targetId: result.targetId,
      neighbors: result.neighborIds,
      dataCount: result.data.length,
      data: result.data
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/stations/:id/history
 * Historical time-series data for a single station.
 */
router.get("/:id/history", (req, res) => {
  try {
    const { id } = req.params;
    const history = telemetryEngine.getStationHistory(id);

    if (!history || history.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Station ${id} not found or has no history.`
      });
    }

    res.json({
      success: true,
      stationId: id,
      count: history.length,
      data: history
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
