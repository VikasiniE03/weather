/**
 * Universal Multi-Station Fault & Anomaly Injection Engine
 * Supports simulating hardware sensor faults across ALL 5 weather stations:
 * 1. Stuck Sensor (Temperature, Humidity, or Both)
 * 2. Invalid Readings (e.g., Humidity > 100%, negative wind speed, temperature out of bounds)
 * 3. Sudden Spikes / Drops
 * 4. Offline Sensor / Communication Failure
 * 5. Spatial Deviation / Local Discrepancy
 */

import { STATIONS, FAULT_CONFIG } from "../config/stations.js";

class FaultInjector {
  constructor() {
    this.targetStationId = "STN-003"; // Default focused target
    this.targetMetric = "both"; // 'temperature' | 'humidity' | 'both'
    this.enabled = false;
    this.thresholdCycles = FAULT_CONFIG.stuckThresholdCycles || 5;

    // Per-station fault configurations
    this.stationFaults = {};
    for (const stn of STATIONS) {
      this.stationFaults[stn.id] = {
        stationId: stn.id,
        enabled: false,
        faultMode: "STUCK", // 'STUCK' | 'INVALID_BOUNDS' | 'SUDDEN_SPIKE' | 'OFFLINE' | 'SPATIAL_DEVIATION'
        metric: "both",
        stuckTemperature: stn.baseTemp,
        stuckHumidity: stn.baseHumidity,
        stuckPressure: stn.basePressure,
        spikeOffset: 15.0, // °C for spike
        invalidValue: 135.0, // for out-of-bounds humidity
        isOffline: false,
        cycleCount: 0,
        lastToggledAt: null
      };
    }

    // Default preset for Station 3 (Guindy Tech Park)
    this.stationFaults["STN-003"].stuckTemperature = 32.40;
    this.stationFaults["STN-003"].stuckHumidity = 68.0;
  }

  /**
   * Toggle or update fault state on any station and metric.
   * @param {Object} options { stationId, metric, enabled, faultMode, stuckTemperature, stuckHumidity, isOffline }
   * @returns {Object} Current status
   */
  toggle(options = {}) {
    const stationId = options.stationId || this.targetStationId;
    const metric = options.metric || this.targetMetric || "both";
    const faultMode = options.faultMode || "STUCK";

    this.targetStationId = stationId;
    this.targetMetric = metric;

    const stnFault = this.stationFaults[stationId];
    if (!stnFault) return this.getStatus();

    const willBeEnabled =
      typeof options.enabled === "boolean" ? options.enabled : !stnFault.enabled;

    // Strict single-station isolation when enabling a new fault
    if (willBeEnabled) {
      for (const id in this.stationFaults) {
        if (id !== stationId) {
          this.stationFaults[id].enabled = false;
          this.stationFaults[id].isOffline = false;
          this.stationFaults[id].cycleCount = 0;
        }
      }
    }

    stnFault.enabled = willBeEnabled;
    stnFault.faultMode = faultMode;
    stnFault.metric = metric;
    stnFault.isOffline = options.isOffline !== undefined ? options.isOffline : faultMode === "OFFLINE" && willBeEnabled;

    if (options.stuckTemperature !== undefined) stnFault.stuckTemperature = options.stuckTemperature;
    if (options.stuckHumidity !== undefined) stnFault.stuckHumidity = options.stuckHumidity;
    if (options.invalidValue !== undefined) stnFault.invalidValue = options.invalidValue;
    if (options.spikeOffset !== undefined) stnFault.spikeOffset = options.spikeOffset;

    if (!stnFault.enabled) {
      stnFault.cycleCount = 0;
      stnFault.isOffline = false;
    }
    stnFault.lastToggledAt = new Date().toISOString();

    this.enabled = stnFault.enabled;

    return this.getStatus();
  }

  /**
   * Set target station focus.
   */
  setTargetStation(stationId, metric = null) {
    if (this.stationFaults[stationId]) {
      this.targetStationId = stationId;
      if (metric) this.targetMetric = metric;
      this.enabled = this.stationFaults[stationId].enabled;
    }
    return this.getStatus();
  }

  /**
   * Set offline sensor state for a station.
   */
  setStationOffline(stationId, isOffline = true) {
    if (this.stationFaults[stationId]) {
      this.stationFaults[stationId].isOffline = isOffline;
      this.stationFaults[stationId].enabled = isOffline;
      this.stationFaults[stationId].faultMode = isOffline ? "OFFLINE" : "STUCK";
    }
    return this.getStatus();
  }

  /**
   * Apply fault injection during telemetry generation.
   */
  apply(stationId, rawTelemetry) {
    const stnFault = this.stationFaults[stationId];

    if (stnFault && stnFault.enabled) {
      stnFault.cycleCount += 1;
      const metric = stnFault.metric;
      const mode = stnFault.faultMode;

      // 1. OFFLINE SENSOR MODE
      if (mode === "OFFLINE" || stnFault.isOffline) {
        return {
          telemetry: rawTelemetry,
          isFaultInjected: true,
          isOffline: true,
          faultType: "OFFLINE",
          faultMetric: "connectivity",
          stuckCycleCount: stnFault.cycleCount
        };
      }

      // 2. INVALID READING (OUT-OF-BOUNDS)
      if (mode === "INVALID_BOUNDS") {
        const modified = { ...rawTelemetry };
        if (metric === "humidity" || metric === "both") {
          modified.humidity = 138.5; // Invalid > 100%
        }
        if (metric === "temperature" || metric === "both") {
          modified.temperature = 78.4; // Invalid > 65°C
        }
        modified.windSpeed = -5.2; // Negative wind speed
        return {
          telemetry: modified,
          isFaultInjected: true,
          faultType: "INVALID_BOUNDS",
          faultMetric: metric,
          stuckCycleCount: stnFault.cycleCount
        };
      }

      // 3. SUDDEN SPIKE
      if (mode === "SUDDEN_SPIKE") {
        const modified = { ...rawTelemetry };
        if (metric === "temperature" || metric === "both") {
          modified.temperature = Math.round((rawTelemetry.temperature + (stnFault.spikeOffset || 15.0)) * 100) / 100;
        }
        if (metric === "humidity" || metric === "both") {
          modified.humidity = Math.max(10, Math.round((rawTelemetry.humidity - 25.0) * 10) / 10);
        }
        return {
          telemetry: modified,
          isFaultInjected: true,
          faultType: "SUDDEN_SPIKE",
          faultMetric: metric,
          stuckCycleCount: stnFault.cycleCount
        };
      }

      // 4. SPATIAL DEVIATION (artificial persistent microclimate drift)
      if (mode === "SPATIAL_DEVIATION") {
        const modified = { ...rawTelemetry };
        if (metric === "temperature" || metric === "both") {
          modified.temperature = Math.round((rawTelemetry.temperature + 5.8) * 100) / 100;
        }
        if (metric === "humidity" || metric === "both") {
          modified.humidity = Math.round((rawTelemetry.humidity + 22.0) * 10) / 10;
        }
        return {
          telemetry: modified,
          isFaultInjected: true,
          faultType: "SPATIAL_DEVIATION",
          faultMetric: metric,
          stuckCycleCount: stnFault.cycleCount
        };
      }

      // 5. STUCK SENSOR (default)
      const modified = {
        ...rawTelemetry,
        temperature:
          metric === "temperature" || metric === "both"
            ? stnFault.stuckTemperature
            : rawTelemetry.temperature,
        humidity:
          metric === "humidity" || metric === "both"
            ? stnFault.stuckHumidity
            : rawTelemetry.humidity,
        pressure: rawTelemetry.pressure
      };

      return {
        telemetry: modified,
        isFaultInjected: true,
        faultType: "STUCK",
        faultMetric: metric,
        stuckCycleCount: stnFault.cycleCount
      };
    }

    if (stnFault) {
      stnFault.cycleCount = 0;
    }

    return {
      telemetry: rawTelemetry,
      isFaultInjected: false,
      faultType: null,
      faultMetric: null,
      stuckCycleCount: 0
    };
  }

  getStatus() {
    const currentTarget = this.stationFaults[this.targetStationId] || {};
    const anyActive = Object.values(this.stationFaults).some((f) => f.enabled);

    return {
      enabled: currentTarget.enabled || anyActive,
      targetStationId: this.targetStationId,
      targetMetric: this.targetMetric,
      thresholdCycles: this.thresholdCycles,
      stuckCycleCount: currentTarget.cycleCount || 0,
      stuckTemperature: currentTarget.stuckTemperature,
      stuckHumidity: currentTarget.stuckHumidity,
      faultMode: currentTarget.faultMode || "STUCK",
      isOffline: Boolean(currentTarget.isOffline),
      stationFaults: this.stationFaults,
      activeStationsCount: Object.values(this.stationFaults).filter((f) => f.enabled).length
    };
  }

  reset() {
    for (const stnId in this.stationFaults) {
      this.stationFaults[stnId].enabled = false;
      this.stationFaults[stnId].isOffline = false;
      this.stationFaults[stnId].faultMode = "STUCK";
      this.stationFaults[stnId].cycleCount = 0;
      this.stationFaults[stnId].lastToggledAt = null;
    }
    this.enabled = false;
    this.targetStationId = "STN-003";
    this.targetMetric = "both";
  }
}

export const faultInjector = new FaultInjector();
