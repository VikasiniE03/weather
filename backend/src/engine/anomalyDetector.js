/**
 * AERO-SENSE Anomaly Detection Engine
 * 
 * Multi-Stage Spatial-Temporal Sensor Anomaly Evaluation:
 * - Stage 1: Physical Validity Inspection (out-of-bounds metrics, negative wind speed, humidity > 100%)
 * - Stage 2: Temporal Consistency & Rate-of-Change Analysis (sudden spikes/drops)
 * - Stage 3: Zero-Variance Streak Analysis (stuck transducers >= 5 cycles)
 * - Stage 4: Spatial Neighbor Comparison via Haversine & Inverse Distance Weighting (IDW)
 *            (Healthy neighbor baseline, excluding faulty or offline nodes)
 * - Stage 5: Multi-Factor Explainable Confidence Score & Incident Classification
 */

import { getNeighborsWithinRadius, calculateIDWInterpolation } from "./spatialMath.js";
import { FAULT_CONFIG } from "../config/stations.js";

export class AnomalyDetector {
  constructor(config = {}) {
    this.stuckThresholdCycles = config.stuckThresholdCycles || FAULT_CONFIG.stuckThresholdCycles || 5;
    this.maxRadiusKm = config.maxRadiusKm || FAULT_CONFIG.maxRadiusKm || 15.0;
    this.confidenceThreshold = config.confidenceThreshold || 65.0;
    this.spikeTempThreshold = config.spikeTempThreshold || FAULT_CONFIG.spikeTempThreshold || 5.0;
    this.spikeHumidityThreshold = config.spikeHumidityThreshold || FAULT_CONFIG.spikeHumidityThreshold || 18.0;
    this.spatialDeviationThreshold = config.spatialDeviationThreshold || FAULT_CONFIG.spatialDeviationThreshold || 3.5;
    this.spatialDeviationHumThreshold = config.spatialDeviationHumThreshold || FAULT_CONFIG.spatialDeviationHumThreshold || 15.0;
    this.validityRanges = FAULT_CONFIG.validityRanges || {
      temperature: { min: -10, max: 65 },
      humidity: { min: 0, max: 100 },
      pressure: { min: 870, max: 1085 },
      windSpeed: { min: 0, max: 250 },
      rainfall: { min: 0, max: 300 }
    };
  }

  /**
   * Check if a reading has physically invalid sensor values.
   */
  checkPhysicalValidity(reading) {
    if (!reading) return null;

    // 1. Humidity range [0, 100%]
    if (reading.humidity < this.validityRanges.humidity.min || reading.humidity > this.validityRanges.humidity.max) {
      return {
        faultType: "INVALID_READING_OUT_OF_BOUNDS",
        sensorType: "humidity",
        observedValue: reading.humidity,
        expectedBaseline: "0 - 100%",
        reason: `Physical impossibility: Relative humidity reading of ${reading.humidity}% is outside atmospheric boundary (0% - 100%). Hygrometer sensor transducer corrupted or short-circuited.`,
        severity: "CRITICAL",
        confidence: 99.5
      };
    }

    // 2. Negative wind speed
    if (reading.windSpeed !== undefined && reading.windSpeed < this.validityRanges.windSpeed.min) {
      return {
        faultType: "INVALID_READING_OUT_OF_BOUNDS",
        sensorType: "windSpeed",
        observedValue: reading.windSpeed,
        expectedBaseline: ">= 0 km/h",
        reason: `Physical impossibility: Negative wind speed (${reading.windSpeed} km/h) reported by anemometer. Signal line inverted or optical encoder failure.`,
        severity: "HIGH",
        confidence: 99.0
      };
    }

    // 3. Extreme temperature out of range
    if (reading.temperature < this.validityRanges.temperature.min || reading.temperature > this.validityRanges.temperature.max) {
      return {
        faultType: "INVALID_READING_OUT_OF_BOUNDS",
        sensorType: "temperature",
        observedValue: reading.temperature,
        expectedBaseline: "-10°C to 65°C",
        reason: `Physical impossibility: Temperature reading of ${reading.temperature}°C is outside valid meteorological operational range. Thermistor open-loop or voltage rail surge.`,
        severity: "CRITICAL",
        confidence: 99.8
      };
    }

    // 4. Barometric pressure out of range
    if (reading.pressure < this.validityRanges.pressure.min || reading.pressure > this.validityRanges.pressure.max) {
      return {
        faultType: "INVALID_READING_OUT_OF_BOUNDS",
        sensorType: "pressure",
        observedValue: reading.pressure,
        expectedBaseline: "870 - 1085 hPa",
        reason: `Physical impossibility: Barometric pressure of ${reading.pressure} hPa is outside valid atmospheric limits. Piezoresistive pressure cell diaphragm rupture suspected.`,
        severity: "CRITICAL",
        confidence: 99.2
      };
    }

    return null;
  }

  /**
   * Check for sudden spike or drop (rate-of-change anomaly).
   */
  checkRateOfChange(history, metric = "temperature") {
    if (!history || history.length < 2) return null;
    const current = history[history.length - 1][metric];
    const prev = history[history.length - 2][metric];
    const delta = Math.abs(current - prev);

    const threshold = metric === "humidity" ? this.spikeHumidityThreshold : this.spikeTempThreshold;

    if (delta >= threshold) {
      return {
        faultType: "SUDDEN_SPIKE_DROP_FAULT",
        sensorType: metric,
        observedValue: current,
        prevValue: prev,
        delta: Math.round(delta * 100) / 100,
        threshold,
        reason: `Unrealistic temporal spike: ${metric} shifted by ${Math.round(delta * 100) / 100}${metric === "temperature" ? "°C" : "%"} within 1 cycle (Threshold: ${threshold}). Rate of change exceeds thermodynamic atmosphere transfer limits.`,
        severity: "HIGH",
        confidence: 91.5
      };
    }

    return null;
  }

  /**
   * Evaluate a single metric (temperature or humidity) on target station.
   */
  evaluateSingleMetric(targetStation, history, allStations, metric = "temperature") {
    const currentReading = targetStation.currentReading || history[history.length - 1];
    const currentValue = currentReading ? currentReading[metric] : null;

    if (currentValue === null || currentValue === undefined) {
      return {
        metric,
        currentValue: 0,
        expectedValue: 0,
        divergence: 0,
        stuckCycles: 0,
        isTemporallyStuck: false,
        confidence: 0,
        faultDetected: false
      };
    }

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

    // Temporal stuck flag
    const isTemporallyStuck = stuckCycles >= this.stuckThresholdCycles && windowVariance < 0.0001;

    // Stage 2: Haversine Healthy Neighbors
    const neighbors = getNeighborsWithinRadius(targetStation.id, allStations, this.maxRadiusKm, true);

    // Stage 3: Spatial IDW Interpolation on Healthy Baseline
    const idwResult = calculateIDWInterpolation(neighbors, metric, 1.5, true);
    const expectedValue = idwResult.expectedValue !== null ? idwResult.expectedValue : currentValue;
    const divergence = Math.round(Math.abs(currentValue - expectedValue) * 100) / 100;
    const neighborVariance = idwResult.neighborVariance || 0;
    const neighborStdDev = idwResult.neighborStdDev || 0;

    // Spatial deviation check (without being stuck)
    const devThreshold = metric === "humidity" ? this.spatialDeviationHumThreshold : this.spatialDeviationThreshold;
    const isSpatiallyDeviant = divergence >= devThreshold && idwResult.validNeighborCount >= 2 && neighborStdDev < 2.0;

    // Stage 4: Multi-Factor Explainable Confidence Score Modeling (0 - 100%)
    // Factors:
    // 1. Streak Factor: weight 45 - 65% based on consecutive frozen cycles
    // 2. Spatial Divergence Factor: weight 0 - 22% proportional to deviation from neighbor baseline
    // 3. Environmental Activity Factor: weight 0 - 15% (rewards confidence when neighboring sensors are dynamic)
    let confidence = 0;
    let faultDetected = false;
    let faultMode = null;

    if (isTemporallyStuck) {
      faultMode = "STUCK_SENSOR";
      const streakFactor = Math.min(65, 45 + (stuckCycles - this.stuckThresholdCycles) * 5);
      const divergenceMultiplier = metric === "humidity" ? 4 : 15;
      const divergenceFactor = Math.min(22, divergence * divergenceMultiplier);
      const dynamicThreshold = metric === "humidity" ? 0.3 : 0.1;
      const dynamicMultiplier = metric === "humidity" ? 15 : 35;
      const dynamicFactor = neighborStdDev > dynamicThreshold ? Math.min(15, neighborStdDev * dynamicMultiplier) : 0;

      confidence = Math.min(99.2, streakFactor + divergenceFactor + dynamicFactor);
      confidence = Math.round(confidence * 10) / 10;

      if (confidence >= this.confidenceThreshold) {
        faultDetected = true;
      }
    } else if (isSpatiallyDeviant) {
      faultMode = "SPATIAL_DEVIATION";
      // Confidence in spatial deviation depends on consistency among neighbors (low neighborStdDev)
      const consistencyBonus = Math.max(0, 20 - neighborStdDev * 8);
      confidence = Math.min(88, 60 + (divergence - devThreshold) * 4 + consistencyBonus);
      confidence = Math.round(confidence * 10) / 10;
      faultDetected = confidence >= this.confidenceThreshold;
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
      isSpatiallyDeviant,
      faultMode,
      windowVariance: Math.round(windowVariance * 10000) / 10000,
      confidence,
      faultDetected,
      neighborStdDev,
      neighborVariance,
      validNeighborCount: idwResult.validNeighborCount
    };
  }

  /**
   * Evaluate all metrics and complete station health.
   */
  evaluateStation(targetStation, history, allStations) {
    // 0. Connectivity / Offline Sensor Check
    if (targetStation.isOnline === false || targetStation.status === "OFFLINE") {
      return {
        stationId: targetStation.id,
        stationName: targetStation.name,
        status: "OFFLINE",
        faultType: "SENSOR_OFFLINE_COMMUNICATION_FAILURE",
        severity: "CRITICAL",
        confidence: 100,
        primaryMetric: "connectivity",
        faultyMetrics: ["telemetry_link"],
        consecutiveStuckCycles: 0,
        currentValue: null,
        expectedValue: "ONLINE (Heartbeat < 25s)",
        divergence: 0,
        reason: `Station ${targetStation.name} (${targetStation.id}) telemetry heartbeat disconnected or packet carrier dropped. No transmission packets received.`,
        recommendedAction: `Inspect field cellular transceiver and power supply at ${targetStation.location}. Radio telemetry stream is completely silent.`,
        nearestNeighbors: [],
        metrics: {}
      };
    }

    if (!history || history.length < 2) {
      return {
        stationId: targetStation.id,
        stationName: targetStation.name,
        status: "NORMAL",
        confidence: 0,
        faultType: null,
        message: "Insufficient history"
      };
    }

    const currentReading = targetStation.currentReading || history[history.length - 1];

    // 1. Stage 1: Physical Validity Inspection
    const validityError = this.checkPhysicalValidity(currentReading);
    if (validityError) {
      return {
        stationId: targetStation.id,
        stationName: targetStation.name,
        status: "ANOMALY",
        faultType: validityError.faultType,
        severity: validityError.severity,
        confidence: validityError.confidence,
        primaryMetric: validityError.sensorType,
        faultyMetrics: [validityError.sensorType],
        consecutiveStuckCycles: 1,
        currentValue: validityError.observedValue,
        expectedValue: validityError.expectedBaseline,
        divergence: 99.9,
        reason: validityError.reason,
        recommendedAction: `Immediate field transducer replacement required for ${validityError.sensorType} at ${targetStation.name}. Reading is physically impossible.`,
        nearestNeighbors: [],
        metrics: {}
      };
    }

    // 2. Stage 2: Sudden Rate-of-Change (Spike/Drop) Check
    const tempSpike = this.checkRateOfChange(history, "temperature");
    const humSpike = this.checkRateOfChange(history, "humidity");
    if (tempSpike || humSpike) {
      const spike = tempSpike || humSpike;
      return {
        stationId: targetStation.id,
        stationName: targetStation.name,
        status: "ANOMALY",
        faultType: spike.faultType,
        severity: spike.severity,
        confidence: spike.confidence,
        primaryMetric: spike.sensorType,
        faultyMetrics: [spike.sensorType],
        consecutiveStuckCycles: 1,
        currentValue: spike.observedValue,
        expectedValue: spike.prevValue,
        divergence: spike.delta,
        reason: spike.reason,
        recommendedAction: `Check electrical shielding and grounding on ${spike.sensorType} transducer at ${targetStation.name}. Transient signal surge detected.`,
        nearestNeighbors: [],
        metrics: {}
      };
    }

    // 3. Stage 3 & 4: Zero-Variance Streak & Spatial IDW Deviation
    const tempResult = this.evaluateSingleMetric(targetStation, history, allStations, "temperature");
    const humResult = this.evaluateSingleMetric(targetStation, history, allStations, "humidity");

    const tempFault = tempResult.faultDetected;
    const humFault = humResult.faultDetected;

    let status = "NORMAL";
    let faultType = null;
    let severity = "NORMAL";
    let primaryMetric = "temperature";
    const faultyMetrics = [];
    let reason = "All sensors operating within healthy microclimatic bounds.";

    if (tempFault && humFault) {
      status = "ANOMALY";
      faultType = "DUAL_SENSOR_STUCK_FAULT";
      severity = "CRITICAL";
      primaryMetric = "both";
      faultyMetrics.push("temperature", "humidity");
      reason = `Both Temperature (${tempResult.currentValue}°C) and Humidity (${humResult.currentValue}%) are completely frozen for ${Math.max(tempResult.stuckCycles, humResult.stuckCycles)} consecutive cycles while nearby stations are actively fluctuating.`;
    } else if (tempFault) {
      status = "ANOMALY";
      faultType = tempResult.faultMode === "SPATIAL_DEVIATION" ? "SPATIAL_DEVIATION_FAULT" : "TEMP_SENSOR_STUCK_FAULT";
      severity = tempResult.confidence > 85 ? "CRITICAL" : "HIGH";
      primaryMetric = "temperature";
      faultyMetrics.push("temperature");
      reason = tempResult.faultMode === "SPATIAL_DEVIATION"
        ? `Spatial Discrepancy: Temperature (${tempResult.currentValue}°C) diverges by ${tempResult.divergence}°C from healthy neighboring stations IDW baseline (${tempResult.expectedValue}°C).`
        : `Stuck Sensor: Temperature clamped at ${tempResult.currentValue}°C across ${tempResult.stuckCycles} consecutive telemetry cycles with zero variance. Neighbor IDW expects ${tempResult.expectedValue}°C.`;
    } else if (humFault) {
      status = "ANOMALY";
      faultType = humResult.faultMode === "SPATIAL_DEVIATION" ? "SPATIAL_DEVIATION_FAULT" : "HUMIDITY_SENSOR_STUCK_FAULT";
      severity = humResult.confidence > 85 ? "CRITICAL" : "HIGH";
      primaryMetric = "humidity";
      faultyMetrics.push("humidity");
      reason = humResult.faultMode === "SPATIAL_DEVIATION"
        ? `Spatial Discrepancy: Relative humidity (${humResult.currentValue}%) diverges by ${humResult.divergence}% from healthy neighboring stations IDW baseline (${humResult.expectedValue}%).`
        : `Stuck Sensor: Relative humidity frozen at ${humResult.currentValue}% across ${humResult.stuckCycles} consecutive telemetry cycles with zero variance. Neighbor IDW expects ${humResult.expectedValue}%.`;
    } else if (tempResult.stuckCycles >= 3 || humResult.stuckCycles >= 3) {
      status = "WARNING";
      severity = "WATCH";
      reason = `Early warning: Sensor reading has remained unchanged for ${Math.max(tempResult.stuckCycles, humResult.stuckCycles)} cycles. Approaching stuck threshold (${this.stuckThresholdCycles} cycles).`;
    }

    const highestConfidence = Math.max(tempResult.confidence, humResult.confidence);
    const maxStuckCycles = Math.max(tempResult.stuckCycles, humResult.stuckCycles);

    // Geodesic healthy neighbors summary
    const neighbors = getNeighborsWithinRadius(targetStation.id, allStations, this.maxRadiusKm, true);
    const nearestNeighborSummary = neighbors.slice(0, 3).map((n) => ({
      id: n.id,
      name: n.name,
      distanceKm: n.distanceKm,
      currentTemp: n.currentReading ? n.currentReading.temperature : n.baseTemp,
      currentHum: n.currentReading ? n.currentReading.humidity : n.baseHumidity,
      status: n.status || "NORMAL"
    }));

    let recommendedAction = "Operational nominal. No remediation required.";
    if (faultType === "DUAL_SENSOR_STUCK_FAULT") {
      recommendedAction = `Immediate hardware inspection required on ${targetStation.name} (${targetStation.id}). Both Temperature & Humidity sensors frozen. Ingest switched to synthetic spatial IDW stream from nearest healthy stations (${nearestNeighborSummary.map((n) => n.id).join(", ")}).`;
    } else if (faultType === "TEMP_SENSOR_STUCK_FAULT") {
      recommendedAction = `Recalibrate temperature transducer at ${targetStation.name} (${targetStation.id}). Telemetry clamped at ${tempResult.currentValue}°C while perimeter ambient IDW expectation is ${tempResult.expectedValue}°C.`;
    } else if (faultType === "HUMIDITY_SENSOR_STUCK_FAULT") {
      recommendedAction = `Recalibrate hygrometer sensor at ${targetStation.name} (${targetStation.id}). Humidity clamped at ${humResult.currentValue}% while perimeter ambient IDW expectation is ${humResult.expectedValue}%.`;
    } else if (faultType === "SPATIAL_DEVIATION_FAULT") {
      recommendedAction = `Cross-verify microclimate sensor at ${targetStation.name} (${targetStation.id}). Telemetry exhibits significant spatial discrepancy from nearby stations. Verify local shade/heat sources or sensor drift.`;
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
      reason,
      recommendedAction,
      nearestNeighbors: nearestNeighborSummary,
      metrics: {
        temperature: tempResult,
        humidity: humResult
      }
    };
  }
}

export const anomalyDetector = new AnomalyDetector();
