/**
 * Universal Multi-Station Fault Injection Engine
 * Supports simulating hardware sensor faults across ALL 5 weather stations
 * for Temperature (°C), Humidity (%), or Dual Sensors (Both).
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
        metric: "both",
        stuckTemperature: stn.baseTemp,
        stuckHumidity: stn.baseHumidity,
        stuckPressure: stn.basePressure,
        cycleCount: 0,
        lastToggledAt: null
      };
    }

    // Specific preset for Station 3
    this.stationFaults["STN-003"].stuckTemperature = 32.40;
    this.stationFaults["STN-003"].stuckHumidity = 68.0;
  }

  /**
   * Toggle or update fault state on any station and metric.
   * @param {Object} options { stationId, metric, enabled }
   * @returns {Object} Current status
   */
  toggle(options = {}) {
    const stationId = options.stationId || this.targetStationId;
    const metric = options.metric || this.targetMetric || "both";

    this.targetStationId = stationId;
    this.targetMetric = metric;

    const stnFault = this.stationFaults[stationId];
    if (!stnFault) return this.getStatus();

    if (typeof options.enabled === "boolean") {
      stnFault.enabled = options.enabled;
    } else {
      stnFault.enabled = !stnFault.enabled;
    }

    stnFault.metric = metric;
    if (options.stuckTemperature !== undefined) stnFault.stuckTemperature = options.stuckTemperature;
    if (options.stuckHumidity !== undefined) stnFault.stuckHumidity = options.stuckHumidity;

    if (!stnFault.enabled) {
      stnFault.cycleCount = 0;
    }
    stnFault.lastToggledAt = new Date().toISOString();

    // Mirror to global convenience flags
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
   * Apply fault injection during telemetry generation.
   * Clamps temperature, humidity, or both if fault is active on stationId.
   */
  apply(stationId, rawTelemetry) {
    const stnFault = this.stationFaults[stationId];

    if (stnFault && stnFault.enabled) {
      stnFault.cycleCount += 1;
      const metric = stnFault.metric;

      const modified = {
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
      stationFaults: this.stationFaults,
      activeStationsCount: Object.values(this.stationFaults).filter((f) => f.enabled).length
    };
  }

  reset() {
    for (const stnId in this.stationFaults) {
      this.stationFaults[stnId].enabled = false;
      this.stationFaults[stnId].cycleCount = 0;
      this.stationFaults[stnId].lastToggledAt = null;
    }
    this.enabled = false;
    this.targetStationId = "STN-003";
    this.targetMetric = "both";
  }
}

export const faultInjector = new FaultInjector();
