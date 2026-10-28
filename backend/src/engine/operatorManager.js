import { STATIONS } from "../config/stations.js";
import { repository } from "../database/repository.js";

/**
 * Station Operator Management Engine
 * Handles operator directory, role assignment, contact configuration,
 * and SMS notification preferences for all 5 weather stations.
 */
class OperatorManager {
  constructor() {
    this.operators = {};
    this.init();
  }

  init() {
    this.operators = {};
    for (const stn of STATIONS) {
      if (stn.operator) {
        this.operators[stn.id] = {
          ...stn.operator,
          stationId: stn.id,
          stationName: stn.name,
          stationCode: stn.code,
          stationZone: stn.zone,
          lastAlertSent: null,
          totalSmsDispatched: 0
        };
      }
    }
  }

  /**
   * Get all operators with their assigned station metadata
   */
  getAllOperators() {
    return Object.values(this.operators);
  }

  /**
   * Get operator assigned to a specific station
   */
  getOperatorByStation(stationId) {
    return this.operators[stationId] || null;
  }

  /**
   * Update operator details (e.g., custom phone number for testing)
   */
  updateOperator(stationId, updates = {}) {
    const existing = this.operators[stationId];
    if (!existing) {
      throw new Error(`Station operator for ${stationId} not found`);
    }

    this.operators[stationId] = {
      ...existing,
      ...updates,
      stationId: existing.stationId,
      stationName: existing.stationName,
      stationCode: existing.stationCode
    };

    // Update persistent station record asynchronously
    const stn = STATIONS.find((s) => s.id === stationId);
    if (stn) {
      repository.upsertStation({
        ...stn,
        operator: this.operators[stationId]
      }).catch((e) => console.warn("Error updating station operator in db:", e.message));
    }

    return this.operators[stationId];
  }

  /**
   * Record SMS dispatch for operator
   */
  recordSmsSent(stationId, timestamp = new Date().toISOString()) {
    if (this.operators[stationId]) {
      this.operators[stationId].lastAlertSent = timestamp;
      this.operators[stationId].totalSmsDispatched =
        (this.operators[stationId].totalSmsDispatched || 0) + 1;
    }
  }

  /**
   * Reset operator list to factory default settings
   */
  reset() {
    this.init();
    return { success: true, message: "Operators reset to default roster." };
  }
}

export const operatorManager = new OperatorManager();
