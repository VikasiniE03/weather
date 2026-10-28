/**
 * Real-Time Telemetry Simulation Engine
 * Generates continuous realistic IoT sensor feeds for all 5 weather stations across Chennai,
 * runs the multi-stage anomaly detection engine, manages the persistent incident workflow,
 * creates targeted role-based notifications, dispatches cellular SMS alerts, and broadcasts
 * real-time updates via Socket.IO with fallback to atomic HTTP sync.
 */

import { STATIONS } from "../config/stations.js";
import { faultInjector } from "./faultInjector.js";
import { anomalyDetector } from "./anomalyDetector.js";
import { computeDistanceMatrix, getNeighborsWithinRadius } from "./spatialMath.js";
import { operatorManager } from "./operatorManager.js";
import { weatherAlertDetector } from "./weatherAlertDetector.js";
import { smsService } from "./smsService.js";
import { repository } from "../database/repository.js";

class TelemetryEngine {
  constructor(options = {}) {
    this.intervalMs = options.intervalMs || 5000;
    this.maxHistory = options.maxHistory || 50;
    this.timer = null;
    this.cycleCount = 0;
    this.distanceMatrix = computeDistanceMatrix(STATIONS);
    this.io = null; // Socket.IO instance

    // Initial station state setup
    this.stations = STATIONS.map((stn) => ({
      ...stn,
      currentReading: null,
      status: "NORMAL",
      isOnline: true,
      anomalyReport: null,
      weatherReport: null,
      lastUpdated: null
    }));

    // Time-series history buffers keyed by station ID
    this.history = {};
    for (const stn of STATIONS) {
      this.history[stn.id] = [];
    }

    // In-memory active alerts cache
    this.alerts = [];

    // Track last execution time for serverless clock synchronization
    this.lastTickTime = Date.now();

    // Pre-populate buffer with realistic historical baseline (30 cycles)
    this.warmUpHistory(30);
  }

  setSocketServer(io) {
    this.io = io;
  }

  setInterval(ms) {
    this.intervalMs = Math.max(1000, ms);
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = setInterval(() => this.tick(), this.intervalMs);
    }
  }

  getStationHash(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) {
      h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(h);
  }

  pseudoNoise(stationId, cycle, seed = 1) {
    const h = this.getStationHash(stationId);
    const x = Math.sin(h * 0.137 + cycle * 1.618 + seed * 9.283) * 43758.5453;
    return x - Math.floor(x) - 0.5;
  }

  advanceToNow() {
    const now = Date.now();
    if (!this.lastTickTime) {
      this.lastTickTime = now;
      return;
    }

    const elapsedMs = now - this.lastTickTime;
    const cyclesToAdvance = Math.floor(elapsedMs / this.intervalMs);

    if (cyclesToAdvance > 0) {
      const steps = Math.min(cyclesToAdvance, this.maxHistory);
      for (let i = 0; i < steps; i++) {
        this.tick();
      }
      this.lastTickTime = now;
    }
  }

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

    this.evaluateAllStations(false); // don't dispatch SMS during warmup
  }

  /**
   * Generate natural weather readings with realistic microclimatic offsets,
   * wind vectors, and rainfall dynamics.
   */
  generateNaturalTelemetry(station, cycle, timestamp) {
    // 1. Diurnal temperature wave
    const diurnalWave = Math.sin(cycle * 0.12 + station.elevation * 0.08) * 0.55;
    const microWave = Math.cos(cycle * 0.35 + station.lat * 10) * 0.25;
    const cycleVariation = Math.sin(cycle * 0.81 + station.elevation * 0.5) * 0.22;
    const sensorNoise = this.pseudoNoise(station.id, cycle, 1) * 0.2;
    const temp = Math.round((station.baseTemp + diurnalWave + microWave + cycleVariation + sensorNoise) * 100) / 100;

    // 2. Humidity (inversely correlated with temperature + coastal buffer)
    const diurnalHum = -diurnalWave * 1.8;
    const microHum = Math.sin(cycle * 0.32 + station.lon * 10) * 0.65;
    const humVariation = Math.cos(cycle * 0.67 + station.lat * 12) * 0.55;
    const humNoise = this.pseudoNoise(station.id, cycle, 2) * 0.4;
    const hum = Math.round((station.baseHumidity + diurnalHum + microHum + humVariation + humNoise) * 10) / 10;

    // 3. Barometric pressure
    const pressWave = Math.cos(cycle * 0.08) * 0.25;
    const pressNoise = this.pseudoNoise(station.id, cycle, 3) * 0.08;
    const press = Math.round((station.basePressure + pressWave + pressNoise) * 10) / 10;

    // 4. Wind speed & direction
    const windNoise = this.pseudoNoise(station.id, cycle, 4) * 2.5;
    const wind = Math.max(0, Math.round(((station.baseWindSpeed || 12.0) + Math.sin(cycle * 0.2) * 2.0 + windNoise) * 10) / 10);
    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE"];
    const dirIdx = Math.abs(Math.floor((this.getStationHash(station.id) + cycle * 0.05) % directions.length));
    const windDir = station.baseWindDirection || directions[dirIdx];

    // 5. Rainfall
    const rainNoise = this.pseudoNoise(station.id, cycle, 5);
    const rain = rainNoise > 0.4 ? Math.round((rainNoise * 1.5) * 10) / 10 : 0.0;

    return {
      timestamp: timestamp || new Date().toISOString(),
      cycle,
      stationId: station.id,
      temperature: temp,
      humidity: hum,
      pressure: press,
      windSpeed: wind,
      windDirection: windDir,
      rainfall: rain,
      isValid: true
    };
  }

  /**
   * Execute a single simulation cycle.
   */
  async tick() {
    this.cycleCount++;
    this.lastTickTime = Date.now();
    const timestamp = new Date().toISOString();

    for (const stn of this.stations) {
      // 1. Natural ambient reading
      const naturalReading = this.generateNaturalTelemetry(stn, this.cycleCount, timestamp);

      // 2. Severe weather emergency overrides (cyclone, heatwave, storm)
      const weatherMod = weatherAlertDetector.applyEmergencyReading(stn.id, naturalReading);
      const intermediateReading = weatherMod.reading;

      // 3. Fault Injection
      const { telemetry, isFaultInjected, faultType, faultMetric, stuckCycleCount, isOffline } =
        faultInjector.apply(stn.id, intermediateReading);

      // Check if station is offline
      stn.isOnline = !isOffline;
      if (isOffline) {
        stn.status = "OFFLINE";
      }

      const finalReading = {
        ...telemetry,
        timestamp,
        cycle: this.cycleCount,
        stationId: stn.id,
        isFaultInjected,
        faultType,
        faultMetric,
        stuckCycleCount,
        isOffline: Boolean(isOffline),
        isWeatherEmergency: weatherMod.isWeatherEmergency,
        weatherEmergencyType: weatherMod.emergency?.type || null
      };

      // 4. Time-series history buffer
      this.history[stn.id].push(finalReading);
      if (this.history[stn.id].length > this.maxHistory) {
        this.history[stn.id].shift();
      }

      // 5. Update station current reading
      stn.currentReading = finalReading;
      stn.lastUpdated = timestamp;

      // 6. Asynchronously persist reading to database
      repository.saveReading(finalReading).catch((err) =>
        console.warn(`[DATA] Error saving reading for ${stn.id}:`, err.message)
      );
    }

    // 7. Run Anomaly Detection across all stations
    await this.evaluateAllStations(true);

    // 8. Run Weather Hazard Evaluation
    await this.evaluateWeatherHazards(true);

    // 9. Broadcast via Socket.IO if active
    if (this.io) {
      this.io.emit("telemetry:tick", {
        cycle: this.cycleCount,
        timestamp,
        stations: this.getStations(),
        activeAlertsCount: this.alerts.filter((a) => a.active).length
      });
    }

    return {
      cycle: this.cycleCount,
      timestamp,
      faultStatus: faultInjector.getStatus(),
      activeAlertsCount: this.alerts.filter((a) => a.active).length,
      smsDispatchedCount: smsService.getSmsLog().length
    };
  }

  /**
   * Run spatial-temporal anomaly evaluation on all stations and manage persistent incident pipeline.
   */
  async evaluateAllStations(dispatchSms = true) {
    for (const stn of this.stations) {
      const stationHistory = this.history[stn.id] || [];
      const report = anomalyDetector.evaluateStation(stn, stationHistory, this.stations);

      if (stn.isOnline === false) {
        stn.status = "OFFLINE";
      } else if (stn.weatherReport?.isEmergency) {
        stn.status = "ANOMALY";
      } else {
        stn.status = report.status;
      }
      stn.anomalyReport = report;

      if (report.status === "ANOMALY" || report.status === "OFFLINE") {
        await this.recordOrUpdateIncident(stn, report, dispatchSms);
      } else if (report.status === "NORMAL") {
        await this.resolveActiveSensorAlerts(stn.id);
      }
    }
  }

  /**
   * Run Severe Weather evaluation on all stations.
   */
  async evaluateWeatherHazards(dispatchSms = true) {
    for (const stn of this.stations) {
      const reading = stn.currentReading;
      const hazard = weatherAlertDetector.evaluateWeatherReading(stn, reading);
      stn.weatherReport = hazard;

      if (hazard && hazard.isEmergency) {
        stn.status = "ANOMALY";
        await this.recordOrUpdateWeatherIncident(stn, hazard, dispatchSms);
      } else {
        await this.resolveActiveWeatherAlerts(stn.id);
      }
    }
  }

  /**
   * Persistent Incident Pipeline for Sensor Faults:
   * Deduplicates incidents across cycles, updates streaks, routes notifications to correct operator,
   * dispatches SMS with cooldown, and updates database records.
   */
  async recordOrUpdateIncident(station, report, dispatchSms = true) {
    const operator = operatorManager.getOperatorByStation(station.id);
    const existingActive = this.alerts.find(
      (a) => a.stationId === station.id && a.active && a.faultType === report.faultType
    );

    if (existingActive) {
      // Update in-memory alert
      existingActive.lastSeen = new Date().toISOString();
      existingActive.consecutiveCycles = report.consecutiveStuckCycles;
      existingActive.confidence = report.confidence;
      existingActive.divergence = report.divergence;
      existingActive.currentValue = report.currentValue;
      existingActive.expectedValue = report.expectedValue;
      existingActive.metrics = report.metrics;

      // Update persistent DB record
      const dbIncident = await repository.findActiveIncident(station.id, report.faultType);
      if (dbIncident) {
        await repository.saveIncident({
          ...dbIncident,
          streakCount: report.consecutiveStuckCycles,
          observedValue: report.currentValue,
          expectedValue: report.expectedValue,
          divergence: report.divergence,
          confidence: report.confidence,
          lastSeenAt: new Date().toISOString()
        });
      }
    } else {
      // Create new Incident ID
      const incidentId = `INC-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      const alertId = `ALT-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

      const newAlert = {
        id: alertId,
        incidentId,
        stationId: station.id,
        stationName: station.name,
        triggerCategory: "SENSOR_FAULT",
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
        reason: report.reason,
        recommendedAction: report.recommendedAction,
        operator: operator,
        smsStatus: "ATTEMPTED",
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        active: true
      };

      this.alerts.unshift(newAlert);
      if (this.alerts.length > 50) this.alerts.pop();

      // 1. Save Persistent Incident
      const savedIncident = await repository.saveIncident({
        incidentId,
        stationId: station.id,
        stationName: station.name,
        triggerCategory: "SENSOR_FAULT",
        faultType: report.faultType,
        primaryMetric: report.primaryMetric,
        faultyMetrics: report.faultyMetrics,
        severity: report.severity,
        status: "OPEN",
        observedValue: report.currentValue,
        expectedValue: report.expectedValue,
        divergence: report.divergence,
        streakCount: report.consecutiveStuckCycles,
        confidence: report.confidence,
        reason: report.reason,
        recommendedAction: report.recommendedAction,
        assignedOperator: operator
          ? {
              id: operator.id,
              name: operator.name,
              phone: operator.phone,
              email: operator.email,
              role: operator.role
            }
          : null
      });

      // 2. Create Targeted Dashboard Notifications:
      // A) For the assigned station operator
      if (operator) {
        await repository.createNotification({
          recipientRole: "operator",
          recipientStationId: station.id,
          stationId: station.id,
          incidentId,
          title: `Sensor Anomaly at ${station.name}`,
          message: `${report.faultType}: Observed ${report.currentValue} diverges from baseline (${report.expectedValue}). ${report.recommendedAction}`,
          severity: report.severity
        });
      }

      // B) For administrators
      await repository.createNotification({
        recipientRole: "admin",
        recipientStationId: null,
        stationId: station.id,
        incidentId,
        title: `[Admin Alert] ${station.id} - ${report.faultType}`,
        message: `${station.name}: ${report.reason}`,
        severity: report.severity
      });

      // 3. Dispatch SMS strictly to assigned station operator
      if (dispatchSms) {
        smsService.dispatchAlertSms({
          stationId: station.id,
          triggerType: "SENSOR_FAULT",
          severity: report.severity,
          details: { ...report, incidentId }
        }).catch((err) => console.error("SMS dispatch error:", err.message));
      }

      // 4. Socket.IO broadcast
      if (this.io) {
        this.io.emit("incident:new", savedIncident);
      }
    }
  }

  /**
   * Persistent Incident Pipeline for Serious Weather Hazards
   */
  async recordOrUpdateWeatherIncident(station, hazard, dispatchSms = true) {
    const operator = operatorManager.getOperatorByStation(station.id);
    const existing = this.alerts.find(
      (a) => a.stationId === station.id && a.active && a.alertType === hazard.alertType
    );

    if (existing) {
      existing.lastSeen = new Date().toISOString();
      existing.currentTemp = hazard.currentTemp;
      existing.currentHum = hazard.currentHum;
      existing.currentPress = hazard.currentPress;
    } else {
      const incidentId = `INC-WX-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
      const alertId = `WX-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

      const newAlert = {
        id: alertId,
        incidentId,
        stationId: station.id,
        stationName: station.name,
        triggerCategory: "WEATHER_EMERGENCY",
        isWeatherEmergency: true,
        alertType: hazard.alertType,
        faultType: hazard.label || hazard.alertType,
        label: hazard.label,
        severity: hazard.severity,
        confidence: 99.8,
        primaryMetric: hazard.triggerMetric,
        currentValue:
          hazard.triggerMetric === "pressure"
            ? hazard.currentPress
            : hazard.triggerMetric === "temperature"
            ? hazard.currentTemp
            : hazard.currentHum,
        currentTemp: hazard.currentTemp,
        currentHum: hazard.currentHum,
        currentPress: hazard.currentPress,
        divergence: 0,
        consecutiveCycles: 1,
        reason: hazard.description,
        recommendedAction: hazard.recommendedAction,
        operator: operator,
        smsStatus: "ATTEMPTED",
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        active: true
      };

      this.alerts.unshift(newAlert);
      if (this.alerts.length > 50) this.alerts.pop();

      // Save Persistent Incident
      const savedIncident = await repository.saveIncident({
        incidentId,
        stationId: station.id,
        stationName: station.name,
        triggerCategory: "WEATHER_EMERGENCY",
        faultType: hazard.label || hazard.alertType,
        primaryMetric: hazard.triggerMetric,
        faultyMetrics: ["atmospheric_conditions"],
        severity: hazard.severity,
        status: "OPEN",
        observedValue: newAlert.currentValue,
        expectedValue: hazard.threshold || null,
        reason: hazard.description,
        recommendedAction: hazard.recommendedAction,
        assignedOperator: operator
      });

      // Target notifications
      await repository.createNotification({
        recipientRole: "operator",
        recipientStationId: station.id,
        stationId: station.id,
        incidentId,
        title: `Weather Alert: ${hazard.label}`,
        message: hazard.description,
        severity: hazard.severity
      });

      await repository.createNotification({
        recipientRole: "admin",
        recipientStationId: null,
        stationId: station.id,
        incidentId,
        title: `[Weather Emergency] ${station.name}`,
        message: hazard.description,
        severity: hazard.severity
      });

      // Trigger operator SMS
      if (dispatchSms) {
        smsService.dispatchAlertSms({
          stationId: station.id,
          triggerType: "WEATHER_EMERGENCY",
          severity: hazard.severity,
          details: { ...hazard, incidentId }
        }).catch((err) => console.error("SMS dispatch error:", err.message));
      }

      if (this.io) {
        this.io.emit("incident:new", savedIncident);
      }
    }
  }

  async resolveActiveSensorAlerts(stationId) {
    for (const alert of this.alerts) {
      if (alert.stationId === stationId && alert.active && alert.triggerCategory === "SENSOR_FAULT") {
        alert.active = false;
        alert.resolvedAt = new Date().toISOString();

        if (alert.incidentId) {
          await repository.resolveIncident(alert.incidentId, {
            userId: "SYSTEM_RECOVERY",
            name: "Automated Self-Healing / Normal Reading Verification",
            role: "system",
            email: ""
          }, "Sensor telemetry recovered to normal dynamic baseline");
        }
      }
    }
  }

  async resolveActiveWeatherAlerts(stationId) {
    for (const alert of this.alerts) {
      if (alert.stationId === stationId && alert.active && alert.triggerCategory === "WEATHER_EMERGENCY") {
        alert.active = false;
        alert.resolvedAt = new Date().toISOString();

        if (alert.incidentId) {
          await repository.resolveIncident(alert.incidentId, {
            userId: "SYSTEM_RECOVERY",
            name: "Atmospheric Calibrated Recovery",
            role: "system",
            email: ""
          }, "Atmospheric conditions normalized within microclimatic criteria");
        }
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
      isOnline: s.isOnline !== false,
      operator: operatorManager.getOperatorByStation(s.id),
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
   */
  getComparisonData(targetId = "STN-003", customNeighbors = null) {
    this.advanceToNow();
    const targetHist = this.history[targetId] || [];

    // Automatically find nearest neighbors for chosen targetId using Haversine distance
    let neighborIds = customNeighbors;
    if (!neighborIds || neighborIds.length === 0) {
      const neighbors = getNeighborsWithinRadius(targetId, STATIONS, 20.0, false);
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
        [`${targetId}_press`]: targetPoint.pressure,
        [`${targetId}_wind`]: targetPoint.windSpeed,
        [`${targetId}_isStuck`]: targetPoint.isFaultInjected,
        [`${targetId}_faultMetric`]: targetPoint.faultMetric,
        [`${targetId}_isWeatherEmergency`]: targetPoint.isWeatherEmergency
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
        entry.divergence = Math.round(Math.abs(targetPoint.temperature - entry.neighborAvg) * 100) / 100;
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
   */
  getSyncPayload(targetId = "STN-003", customNeighbors = null) {
    this.advanceToNow();
    return {
      success: true,
      cycle: this.cycleCount,
      timestamp: new Date().toISOString(),
      intervalMs: this.intervalMs,
      stations: this.getStations(),
      comparison: this.getComparisonData(targetId, customNeighbors),
      alerts: this.getAlerts(),
      operators: operatorManager.getAllOperators(),
      smsLog: smsService.getSmsLog(),
      weatherEmergencies: weatherAlertDetector.getActiveEmergencies(),
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
    weatherAlertDetector.clearEmergencies();
    smsService.clearSmsLog();
    operatorManager.reset();
    this.cycleCount = 0;
    this.alerts = [];
    for (const stn of STATIONS) {
      this.history[stn.id] = [];
      const stationObj = this.stations.find((s) => s.id === stn.id);
      if (stationObj) {
        stationObj.isOnline = true;
        stationObj.status = "NORMAL";
      }
    }
    this.warmUpHistory(30);

    // Audit log
    repository.logAudit("SIMULATION_RESET", { name: "Simulator Control", role: "admin" }, null, {
      cycleCount: 0
    });

    return {
      success: true,
      message: "Telemetry engine, weather emergencies, and SMS logs safely reset to baseline."
    };
  }
}

export const telemetryEngine = new TelemetryEngine();
