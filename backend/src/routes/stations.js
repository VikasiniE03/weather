import express from "express";
import { telemetryEngine } from "../engine/telemetry.js";
import { repository } from "../database/repository.js";
import { optionalAuth, requireStationAccess } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/stations/sync
 * Atomic unified synchronization endpoint returning stations, comparison data, alerts, and fault status.
 */
router.get("/sync", optionalAuth, (req, res) => {
  try {
    let { targetId, neighbors } = req.query;

    // If operator is logged in, ensure targetId is their assigned station
    if (req.user && req.user.role === "operator" && req.user.assignedStationId) {
      targetId = req.user.assignedStationId;
    }

    const neighborList = neighbors ? neighbors.split(",") : null;
    const payload = telemetryEngine.getSyncPayload(targetId || "STN-003", neighborList);

    // If operator is logged in, filter out unauthorized alerts
    if (req.user && req.user.role === "operator" && req.user.assignedStationId) {
      payload.alerts = payload.alerts.filter((a) => a.stationId === req.user.assignedStationId);
    }

    res.json(payload);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/stations
 * List stations with current telemetry readings, anomaly reports, and spatial coordinates.
 * Admin sees all stations. Operator sees their assigned station flagged with active access.
 */
router.get("/", optionalAuth, (req, res) => {
  try {
    const stations = telemetryEngine.getStations();

    // Map stations with authorization flags if user is logged in
    const augmentedStations = stations.map((stn) => {
      const isAuthorized =
        !req.user || req.user.role === "admin" || req.user.assignedStationId === stn.id;
      return {
        ...stn,
        isAuthorized
      };
    });

    res.json({
      success: true,
      count: augmentedStations.length,
      data: augmentedStations,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/stations/:id
 * Get detailed metadata and live telemetry for a single station.
 * Enforces backend RBAC: Operator can ONLY view their assigned station!
 */
router.get("/:id", optionalAuth, requireStationAccess("id"), async (req, res) => {
  try {
    const { id } = req.params;
    const stations = telemetryEngine.getStations();
    const stn = stations.find((s) => s.id === id);

    if (!stn) {
      return res.status(404).json({ success: false, error: `Station ${id} not found.` });
    }

    const history = telemetryEngine.getStationHistory(id);
    const incidents = await repository.getIncidents({ stationId: id, limit: 10 });
    const operator = stn.operator;

    // Calculate individual sensor health breakdown
    const currentReading = stn.currentReading || {};
    const anomaly = stn.anomalyReport || {};
    const faultyMetrics = anomaly.faultyMetrics || [];

    const sensorHealth = {
      temperature: {
        status: faultyMetrics.includes("temperature") ? "FAULT" : "HEALTHY",
        reading: currentReading.temperature,
        unit: "°C",
        label: "Platinum RTD Transducer"
      },
      humidity: {
        status: faultyMetrics.includes("humidity") ? "FAULT" : "HEALTHY",
        reading: currentReading.humidity,
        unit: "%",
        label: "Capacitive Hygrometer"
      },
      pressure: {
        status: currentReading.pressure < 998 ? "WEATHER_ALERT" : "HEALTHY",
        reading: currentReading.pressure,
        unit: "hPa",
        label: "Piezoresistive Barometer"
      },
      wind: {
        status: currentReading.windSpeed < 0 ? "FAULT" : "HEALTHY",
        speed: currentReading.windSpeed,
        direction: currentReading.windDirection,
        unit: "km/h",
        label: "Ultrasonic 2-Axis Anemometer"
      },
      rain: {
        status: "HEALTHY",
        rainfall: currentReading.rainfall,
        unit: "mm/h",
        label: "Tipping Bucket Pluviometer"
      }
    };

    res.json({
      success: true,
      data: {
        ...stn,
        sensorHealth,
        history,
        recentIncidents: incidents,
        operator
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/stations/comparison
 * Merged comparison time-series for Target Station and its neighbors for Recharts.
 * If operator is authenticated, targetId is restricted to their assigned station.
 */
router.get("/comparison", optionalAuth, (req, res) => {
  try {
    let { targetId, neighbors } = req.query;

    if (req.user && req.user.role === "operator" && req.user.assignedStationId) {
      targetId = req.user.assignedStationId;
    }

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
 * Enforces backend RBAC: Operator can ONLY access their assigned station history!
 */
router.get("/:id/history", optionalAuth, requireStationAccess("id"), (req, res) => {
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
