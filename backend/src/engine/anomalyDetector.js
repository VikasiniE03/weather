/**
 * Universal Dual-Metric AI Anomaly Detector
 * 
 * Analyzes real-time sensor streams across ALL stations for BOTH:
 * 1. Temperature (°C)
 * 2. Humidity (%)
 * 
 * Employs a 4-stage spatial-temporal evaluation pipeline:
 * - Stage 1: Zero-variance temporal inspection (streak >= 5 cycles)
 * - Stage 2: Geodesic neighbor clustering via Haversine formula (r <= 15 km)
 * - Stage 3: Spatial IDW interpolation for expected ambient values
 * - Stage 4: Multi-factor confidence score modeling (0 - 100%)
 */

import { getNeighborsWithinRadius, calculateIDWInterpolation } from "./spatialMath.js";
import { FAULT_CONFIG } from "../config/stations.js";

export class AnomalyDetector {
  constructor(config = {}) {
    this.stuckThresholdCycles = config.stuckThresholdCycles || FAULT_CONFIG.stuckThresholdCycles || 5;
    this.maxRadiusKm = config.maxRadiusKm || FAULT_CONFIG.maxRadiusKm || 15.0;
    this.confidenceThreshold = config.confidenceThreshold || 65.0;
  }

  /**
   * Evaluate a single metric (temperature or humidity) on target station.
   */
  evaluateSingleMetric(targetStation, history, allStations, metric = "temperature") {
    const currentReading = targetStation.currentReading || history[history.length - 1];
    const currentValue = currentReading[metric];

    // Stage 1: Zero-Variance Streak
    let stuckCycles = 1;
    for (let i = history.length - 2; i >= 0; i--) {
      const prevVal = history[i][metric];
      if (Math.abs(prevVal - currentValue) < 0.001) {
        stuckCycles++;
      } else {
        break;
      }
    }

    // Window Variance
    const windowSlice = history.slice(-Math.max(5, this.stuckThresholdCycles));
    const windowValues = windowSlice.map((h) => h[metric]);
    const windowMean = windowValues.reduce((a, b) => a + b, 0) / windowValues.length;
    const windowVariance =
      windowValues.reduce((a, b) => a + Math.pow(b - windowMean, 2), 0) / windowValues.length;

    const isTemporallyStuck = stuckCycles >= this.stuckThresholdCycles;

    // Stage 2: Haversine Neighbors
    const neighbors = getNeighborsWithinRadius(targetStation.id, allStations, this.maxRadiusKm);

    // Stage 3: Spatial IDW Interpolation
    const idwResult = calculateIDWInterpolation(neighbors, metric, 1.5);
    const expectedValue = idwResult.expectedValue !== null ? idwResult.expectedValue : currentValue;
    const divergence = Math.round(Math.abs(currentValue - expectedValue) * 100) / 100;
    const neighborVariance = idwResult.neighborVariance || 0;
    const neighborStdDev = idwResult.neighborStdDev || 0;

    // Stage 4: Confidence Score
    let confidence = 0;
    let faultDetected = false;

    if (isTemporallyStuck) {
      // 1. Streak Factor: 45% - 65%
      const streakFactor = Math.min(65, 45 + (stuckCycles - this.stuckThresholdCycles) * 5);

      // 2. Spatial Divergence Factor: 0% - 22%
      // For humidity, scale divergence accordingly (humidity variance tends to be wider)
      const divergenceMultiplier = metric === "humidity" ? 4 : 15;
      const divergenceFactor = Math.min(22, divergence * divergenceMultiplier);

      // 3. Environmental Activity Factor: 0% - 15%
      const dynamicThreshold = metric === "humidity" ? 0.3 : 0.1;
      const dynamicMultiplier = metric === "humidity" ? 15 : 35;
      const dynamicFactor = neighborStdDev > dynamicThreshold ? Math.min(15, neighborStdDev * dynamicMultiplier) : 0;

      confidence = Math.min(99.2, streakFactor + divergenceFactor + dynamicFactor);
      confidence = Math.round(confidence * 10) / 10;

      if (confidence >= this.confidenceThreshold) {
        faultDetected = true;
      }
    } else if (stuckCycles >= 3) {
      confidence = Math.round((stuckCycles / this.stuckThresholdCycles) * 35 * 10) / 10;
    }

    return {
      metric,
      currentValue,
      expectedValue,
      divergence,
      stuckCycles,
      isTemporallyStuck,
      windowVariance: Math.round(windowVariance * 10000) / 10000,
      confidence,
      faultDetected,
      neighborStdDev,
      neighborVariance
    };
  }

  /**
   * Evaluate all metrics on target station.
   */
  evaluateStation(targetStation, history, allStations) {
    if (!history || history.length < 2) {
      return {
        stationId: targetStation.id,
        status: "NORMAL",
        confidence: 0,
        faultType: null,
        message: "Insufficient history"
      };
    }

    const tempResult = this.evaluateSingleMetric(targetStation, history, allStations, "temperature");
    const humResult = this.evaluateSingleMetric(targetStation, history, allStations, "humidity");

    const tempFault = tempResult.faultDetected;
    const humFault = humResult.faultDetected;

    let status = "NORMAL";
    let faultType = null;
    let severity = "NORMAL";
    let primaryMetric = "temperature";
    const faultyMetrics = [];

    if (tempFault && humFault) {
      status = "ANOMALY";
      faultType = "DUAL_SENSOR_STUCK_FAULT";
      severity = "CRITICAL";
      primaryMetric = "both";
      faultyMetrics.push("temperature", "humidity");
    } else if (tempFault) {
      status = "ANOMALY";
      faultType = "TEMP_SENSOR_STUCK_FAULT";
      severity = tempResult.confidence > 85 ? "CRITICAL" : "HIGH";
      primaryMetric = "temperature";
      faultyMetrics.push("temperature");
    } else if (humFault) {
      status = "ANOMALY";
      faultType = "HUMIDITY_SENSOR_STUCK_FAULT";
      severity = humResult.confidence > 85 ? "CRITICAL" : "HIGH";
      primaryMetric = "humidity";
      faultyMetrics.push("humidity");
    } else if (tempResult.stuckCycles >= 3 || humResult.stuckCycles >= 3) {
      status = "WARNING";
      severity = "WATCH";
    }

    const highestConfidence = Math.max(tempResult.confidence, humResult.confidence);
    const maxStuckCycles = Math.max(tempResult.stuckCycles, humResult.stuckCycles);

    // Geodesic neighbors summary
    const neighbors = getNeighborsWithinRadius(targetStation.id, allStations, this.maxRadiusKm);
    const nearestNeighborSummary = neighbors.slice(0, 2).map((n) => ({
      id: n.id,
      name: n.name,
      distanceKm: n.distanceKm,
      currentTemp: n.currentReading ? n.currentReading.temperature : n.baseTemp,
      currentHum: n.currentReading ? n.currentReading.humidity : n.baseHumidity
    }));

    let recommendedAction = "Operational nominal. No remediation required.";
    if (faultType === "DUAL_SENSOR_STUCK_FAULT") {
      recommendedAction = `Immediate hardware inspection required on ${targetStation.name} (${targetStation.id}). Both Temperature & Humidity sensors frozen. Ingest switched to synthetic spatial IDW stream from nearest neighbors (${nearestNeighborSummary.map((n) => n.id).join(", ")}).`;
    } else if (faultType === "TEMP_SENSOR_STUCK_FAULT") {
      recommendedAction = `Recalibrate temperature transducer at ${targetStation.name} (${targetStation.id}). Telemetry clamped at ${tempResult.currentValue}°C while perimeter ambient IDW expectation is ${tempResult.expectedValue}°C.`;
    } else if (faultType === "HUMIDITY_SENSOR_STUCK_FAULT") {
      recommendedAction = `Recalibrate hygrometer sensor at ${targetStation.name} (${targetStation.id}). Humidity clamped at ${humResult.currentValue}% while perimeter ambient IDW expectation is ${humResult.expectedValue}%.`;
    }

    return {
      stationId: targetStation.id,
      stationName: targetStation.name,
      status,
      faultType,
      severity,
      confidence: highestConfidence,
      consecutiveStuckCycles: maxStuckCycles,
      primaryMetric,
      faultyMetrics,
      currentValue: primaryMetric === "humidity" ? humResult.currentValue : tempResult.currentValue,
      expectedValue: primaryMetric === "humidity" ? humResult.expectedValue : tempResult.expectedValue,
      divergence: primaryMetric === "humidity" ? humResult.divergence : tempResult.divergence,
      metrics: {
        temperature: tempResult,
        humidity: humResult
      },
      nearestNeighbors: nearestNeighborSummary,
      recommendedAction
    };
  }
}

export const anomalyDetector = new AnomalyDetector();
