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

    // Pre-populate buffer with realistic historical baseline (30 cycles)
    this.warmUpHistory(30);
  }

  /**
   * Pre-warm history buffer so graphs look populated upon first load.
   */
  warmUpHistory(points = 30) {
    const now = Date.now();
    const stepMs = this.intervalMs;

    for (let i = points; i >= 1; i--) {
      const timestamp = new Date(now - i * stepMs).toISOString();
      const syntheticCycle = this.cycleCount++;

      for (const stn of this.stations) {
        const reading = this.generateNaturalTelemetry(stn, syntheticCycle, timestamp);
        this.history[stn.id].push(reading);
      }
    }

    for (const stn of this.stations) {
      const last = this.history[stn.id][this.history[stn.id].length - 1];
      stn.currentReading = last;
      stn.lastUpdated = last.timestamp;
    }

    this.evaluateAllStations();
  }

  /**
   * Generate natural weather readings with realistic microclimate offsets and stochastic noise.
   */
  generateNaturalTelemetry(station, cycle, timestamp) {
    const wavePhase = cycle * 0.15 + station.elevation * 0.1;
    const diurnalTempOffset = Math.sin(wavePhase) * 0.55;

    // Temperature with ±0.25°C stochastic noise
    const noiseTemp = (Math.random() - 0.5) * 0.5;
    const temp = Math.round((station.baseTemp + diurnalTempOffset + noiseTemp) * 100) / 100;

    // Humidity negatively correlated with temperature + natural noise
    const noiseHum = (Math.random() - 0.5) * 0.8;
    const hum = Math.round((station.baseHumidity - diurnalTempOffset * 1.8 + noiseHum) * 10) / 10;

    // Pressure subtle barometric tide
    const noisePress = (Math.random() - 0.5) * 0.2;
    const press = Math.round((station.basePressure + Math.cos(wavePhase * 0.7) * 0.3 + noisePress) * 10) / 10;

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
    return this.stations.map((s) => ({
      ...s,
      distanceMatrix: this.distanceMatrix[s.id]
    }));
  }

  getStationHistory(stationId) {
    return this.history[stationId] || [];
  }

  /**
   * Get merged historical comparison dataset for ANY selected station and its nearest neighbors.
   * Includes both temperature and humidity streams!
   */
  getComparisonData(targetId = "STN-003", customNeighbors = null) {
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

  getAlerts(activeOnly = false) {
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
