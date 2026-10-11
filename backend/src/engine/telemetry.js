/**
 * Real-Time Telemetry Simulation Engine
 * Generates continuous mock sensor feeds for all 5 weather stations across Chennai,
 * supports multi-station and multi-metric fault injection, runs dual-metric anomaly detection,
 * and maintains dynamic neighbor comparison time-series.
 */

import { STATIONS } from "../config/stations.js";
import { faultInjector } from "./faultInjector.js";
import { anomalyDetector } from "./anomalyDetector.js";
import { computeDistanceMatrix, getNeighborsWithinRadius } from "./spatialMath.js";

class TelemetryEngine {
  constructor(options = {}) {
    this.intervalMs = options.intervalMs || 5000;
    this.maxHistory = options.maxHistory || 50;
    this.timer = null;
    this.cycleCount = 0;
    this.distanceMatrix = computeDistanceMatrix(STATIONS);

    // Initial station state setup
    this.stations = STATIONS.map((stn) => ({
      ...stn,
      currentReading: null,
      status: "NORMAL",
      anomalyReport: null,
      lastUpdated: null
    }));

    // Time-series history buffers keyed by station ID
    this.history = {};
    for (const stn of STATIONS) {
      this.history[stn.id] = [];
    }

    // Historical alerts log
    this.alerts = [];

    // Track last execution time for serverless clock synchronization
    this.lastTickTime = Date.now();

    // Pre-populate buffer with realistic historical baseline (30 cycles)
    this.warmUpHistory(30);
  }

  /**
   * Deterministic station hash for reproducible pseudo-noise.
   */
  getStationHash(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) {
      h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(h);
  }

  /**
   * High-quality deterministic pseudo-noise in range [-0.5, 0.5].
   * Ensures identical cycles always produce consistent physical readings across server restarts.
   */
  pseudoNoise(stationId, cycle, seed = 1) {
    const h = this.getStationHash(stationId);
    const x = Math.sin(h * 0.137 + cycle * 1.618 + seed * 9.283) * 43758.5453;
    return (x - Math.floor(x)) - 0.5;
  }

  /**
   * Automatically advance simulation cycles based on elapsed real-world time.
   * Ensures smooth, continuous real-time telemetry on both persistent servers and Vercel serverless.
   */
  advanceToNow() {
    const now = Date.now();
    if (!this.lastTickTime) {
      this.lastTickTime = now;
      return;
    }

    const elapsedMs = now - this.lastTickTime;
    const cyclesToAdvance = Math.floor(elapsedMs / this.intervalMs);

    if (cyclesToAdvance > 0) {
      // Advance at most maxHistory steps so long idle periods don't trigger large loops
      const steps = Math.min(cyclesToAdvance, this.maxHistory);
      for (let i = 0; i < steps; i++) {
        this.tick();
      }
      this.lastTickTime = now;
    }
  }

  /**
   * Pre-warm history buffer so graphs look populated upon first load.
   */
  warmUpHistory(points = 30) {
    const now = Date.now();
    const stepMs = this.intervalMs;

    this.history = {};
    for (const stn of STATIONS) {
      this.history[stn.id] = [];
    }

    const startCycle = Math.max(0, this.cycleCount);
    for (let i = points; i >= 1; i--) {
      const timestamp = new Date(now - i * stepMs).toISOString();
      const syntheticCycle = startCycle + (points - i);

      for (const stn of this.stations) {
        const reading = this.generateNaturalTelemetry(stn, syntheticCycle, timestamp);
        this.history[stn.id].push(reading);
      }
    }

    this.cycleCount = startCycle + points;
    this.lastTickTime = now;

    for (const stn of this.stations) {
      const last = this.history[stn.id][this.history[stn.id].length - 1];
      stn.currentReading = last;
      stn.lastUpdated = last.timestamp;
    }

    this.evaluateAllStations();
  }

  /**
   * Generate natural weather readings with realistic microclimate offsets and deterministic noise.
   */
  generateNaturalTelemetry(station, cycle, timestamp) {
    // Diurnal atmospheric wave (gentle sinusoidal cycle)
    const diurnalWave = Math.sin((cycle * 0.12) + (station.elevation * 0.08)) * 0.45;

    // Micro-climate local spatial oscillation
    const microWave = Math.cos((cycle * 0.35) + (station.lat * 10)) * 0.15;

    // Subtle deterministic physical fluctuation (±0.08°C)
    const sensorNoise = this.pseudoNoise(station.id, cycle, 1) * 0.16;

    // Temperature reading
    const temp = Math.round((station.baseTemp + diurnalWave + microWave + sensorNoise) * 100) / 100;

    // Humidity negatively correlated with temperature + micro-climate moisture variations
    const diurnalHum = -diurnalWave * 1.8;
    const microHum = Math.sin((cycle * 0.32) + (station.lon * 10)) * 0.35;
    const humNoise = this.pseudoNoise(station.id, cycle, 2) * 0.3;
    const hum = Math.round((station.baseHumidity + diurnalHum + microHum + humNoise) * 10) / 10;

    // Barometric pressure subtle atmospheric tide
    const pressWave = Math.cos(cycle * 0.08) * 0.25;
    const pressNoise = this.pseudoNoise(station.id, cycle, 3) * 0.08;
    const press = Math.round((station.basePressure + pressWave + pressNoise) * 10) / 10;

    return {
      timestamp: timestamp || new Date().toISOString(),
      cycle,
      stationId: station.id,
      temperature: temp,
      humidity: hum,
      pressure: press
    };
  }

  /**
   * Execute a single simulation cycle.
   */
  tick() {
    this.cycleCount++;
    this.lastTickTime = Date.now();
    const timestamp = new Date().toISOString();

    for (const stn of this.stations) {
      // 1. Generate natural ambient reading
      const naturalReading = this.generateNaturalTelemetry(stn, this.cycleCount, timestamp);

      // 2. Pass through Fault Injector (supports any station & temperature/humidity)
      const { telemetry, isFaultInjected, faultMetric, stuckCycleCount } = faultInjector.apply(
        stn.id,
        naturalReading
      );

      const finalReading = {
        ...telemetry,
        timestamp,
        cycle: this.cycleCount,
        stationId: stn.id,
        isFaultInjected,
        faultMetric,
        stuckCycleCount
      };

      // 3. Store in time-series history
      this.history[stn.id].push(finalReading);
      if (this.history[stn.id].length > this.maxHistory) {
        this.history[stn.id].shift();
      }

      // 4. Update station current state
      stn.currentReading = finalReading;
      stn.lastUpdated = timestamp;
    }

    // 5. Run Anomaly Detection across all stations for BOTH metrics
    this.evaluateAllStations();

    return {
      cycle: this.cycleCount,
      timestamp,
      faultStatus: faultInjector.getStatus(),
      activeAlertsCount: this.alerts.filter((a) => a.active).length
    };
  }

  /**
   * Run spatial-temporal anomaly evaluation on all stations and manage alerts.
   */
  evaluateAllStations() {
    for (const stn of this.stations) {
      const stationHistory = this.history[stn.id] || [];
      const report = anomalyDetector.evaluateStation(stn, stationHistory, this.stations);

      stn.status = report.status;
      stn.anomalyReport = report;

      if (report.status === "ANOMALY") {
        this.recordAlert(stn, report);
      } else {
        this.resolveActiveAlerts(stn.id);
      }
    }
  }

  /**
   * Record or update an anomaly alert in the active log.
   */
  recordAlert(station, report) {
    const existingActive = this.alerts.find(
      (a) => a.stationId === station.id && a.active && a.faultType === report.faultType
    );

    if (existingActive) {
      existingActive.lastSeen = new Date().toISOString();
      existingActive.consecutiveCycles = report.consecutiveStuckCycles;
      existingActive.confidence = report.confidence;
      existingActive.divergence = report.divergence;
      existingActive.currentValue = report.currentValue;
      existingActive.expectedValue = report.expectedValue;
      existingActive.metrics = report.metrics;
    } else {
      const newAlert = {
        id: `ALT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
        stationId: station.id,
        stationName: station.name,
        faultType: report.faultType,
        primaryMetric: report.primaryMetric,
        faultyMetrics: report.faultyMetrics,
        severity: report.severity,
        confidence: report.confidence,
        currentValue: report.currentValue,
        expectedValue: report.expectedValue,
        divergence: report.divergence,
        consecutiveCycles: report.consecutiveStuckCycles,
        metrics: report.metrics,
        nearestNeighbors: report.nearestNeighbors,
        recommendedAction: report.recommendedAction,
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        active: true
      };

      this.alerts.unshift(newAlert);
      if (this.alerts.length > 50) this.alerts.pop();
    }
  }

  resolveActiveAlerts(stationId) {
    for (const alert of this.alerts) {
      if (alert.stationId === stationId && alert.active) {
        alert.active = false;
        alert.resolvedAt = new Date().toISOString();
      }
    }
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick();
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getStations() {
    this.advanceToNow();
    return this.stations.map((s) => ({
      ...s,
      distanceMatrix: this.distanceMatrix[s.id]
    }));
  }

  getStationReading(stationId) {
    const stn = this.stations.find((s) => s.id === stationId);
    return stn?.currentReading || null;
  }

  getStationHistory(stationId) {
    this.advanceToNow();
    return this.history[stationId] || [];
  }

  /**
   * Get merged historical comparison dataset for ANY selected station and its nearest neighbors.
   * Includes both temperature and humidity streams!
   */
  getComparisonData(targetId = "STN-003", customNeighbors = null) {
    this.advanceToNow();
    const targetHist = this.history[targetId] || [];

    // Automatically find nearest neighbors for the chosen targetId using Haversine distance
    let neighborIds = customNeighbors;
    if (!neighborIds || neighborIds.length === 0) {
      const neighbors = getNeighborsWithinRadius(targetId, STATIONS, 20.0);
      neighborIds = neighbors.slice(0, 2).map((n) => n.id);
    }

    const comparison = [];

    for (let i = 0; i < targetHist.length; i++) {
      const targetPoint = targetHist[i];
      const entry = {
        time: targetPoint.timestamp.split("T")[1].slice(0, 8),
        timestamp: targetPoint.timestamp,
        cycle: targetPoint.cycle,
        targetId,
        // Target Station metrics
        [targetId]: targetPoint.temperature,
        [`${targetId}_hum`]: targetPoint.humidity,
        [`${targetId}_isStuck`]: targetPoint.isFaultInjected,
        [`${targetId}_faultMetric`]: targetPoint.faultMetric
      };

      let tempSum = 0;
      let humSum = 0;
      let count = 0;

      for (const nId of neighborIds) {
        const nHist = this.history[nId];
        if (nHist && nHist[i]) {
          entry[nId] = nHist[i].temperature;
          entry[`${nId}_hum`] = nHist[i].humidity;
          tempSum += nHist[i].temperature;
          humSum += nHist[i].humidity;
          count++;
        }
      }

      if (count > 0) {
        entry.neighborAvg = Math.round((tempSum / count) * 100) / 100;
        entry.neighborHumAvg = Math.round((humSum / count) * 10) / 10;
      }

      comparison.push(entry);
    }

    return {
      targetId,
      neighborIds,
      data: comparison
    };
  }

  /**
   * Unified atomic sync payload for real-time frontend dashboard.
   * Prevents race conditions and guarantees complete synchronization across all widgets.
   */
  getSyncPayload(targetId = "STN-003", customNeighbors = null) {
    this.advanceToNow();
    return {
      success: true,
      cycle: this.cycleCount,
      timestamp: new Date().toISOString(),
      stations: this.getStations(),
      comparison: this.getComparisonData(targetId, customNeighbors),
      alerts: this.getAlerts(),
      faultStatus: faultInjector.getStatus()
    };
  }

  getAlerts(activeOnly = false) {
    this.advanceToNow();
    if (activeOnly) {
      return this.alerts.filter((a) => a.active);
    }
    return this.alerts;
  }

  clearAlerts() {
    this.alerts = [];
    return { success: true, message: "Alerts cleared" };
  }

  reset() {
    faultInjector.reset();
    this.cycleCount = 0;
    this.alerts = [];
    for (const stn of STATIONS) {
      this.history[stn.id] = [];
    }
    this.warmUpHistory(30);
    return { success: true, message: "Telemetry engine reset to baseline." };
  }
}

export const telemetryEngine = new TelemetryEngine();
