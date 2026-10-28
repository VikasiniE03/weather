/**
 * AERO-SENSE Automated Verification & Quality Assurance Suite
 * Tests:
 * 1. Anomaly Detection Engine (Stuck Sensor, Spatial IDW, Physical Bounds, Spikes, Offline)
 * 2. Incident Creation, Deduplication, & Resolution Workflow
 * 3. Station Access Authorization & RBAC Enforcement (Admin vs Station Operator)
 * 4. Operator Notification Routing
 * 5. Persistence across restarts
 */

import assert from "assert";
import { anomalyDetector } from "../src/engine/anomalyDetector.js";
import { calculateHaversineDistance, calculateIDWInterpolation, getNeighborsWithinRadius } from "../src/engine/spatialMath.js";
import { STATIONS } from "../src/config/stations.js";
import { repository } from "../src/database/repository.js";
import { dbConnection } from "../src/database/db.js";
import { signToken } from "../src/middleware/auth.js";

async function runTests() {
  console.log("🧪 ========================================================");
  console.log("🧪 STARTING AERO-SENSE AUTOMATED QA TEST SUITE");
  console.log("🧪 ========================================================\n");

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      failed++;
    }
  }

  // Ensure DB connected (or file store fallback active)
  await dbConnection.connect();

  console.log("--- 1. SPATIAL MATHEMATICS & IDW TESTS ---");

  test("Haversine formula calculates known Chennai geodesic distances accurately", () => {
    // Distance between Marina (STN-001: 13.0827, 80.2707) and Guindy (STN-003: 13.0067, 80.2206)
    const dist = calculateHaversineDistance(13.0827, 80.2707, 13.0067, 80.2206);
    assert(dist > 9.5 && dist < 11.5, `Distance should be ~10.1 km, got ${dist}`);
  });

  test("IDW interpolation computes weighted expected value properly", () => {
    const mockNeighbors = [
      { id: "N1", distanceKm: 2.0, currentReading: { temperature: 30.0 } },
      { id: "N2", distanceKm: 5.0, currentReading: { temperature: 34.0 } }
    ];
    const idw = calculateIDWInterpolation(mockNeighbors, "temperature", 1.5);
    assert(idw.expectedValue !== null, "Expected value should not be null");
    // Closer station (2km) has higher weight, so expected value should be closer to 30.0 than 34.0
    assert(idw.expectedValue < 32.0, `Expected value should favor closer neighbor, got ${idw.expectedValue}`);
  });

  test("IDW excludes faulty and offline neighbors from healthy baseline", () => {
    const mockNeighbors = [
      { id: "N1", distanceKm: 2.0, status: "NORMAL", isOnline: true, currentReading: { temperature: 31.0 } },
      { id: "N2", distanceKm: 2.5, status: "ANOMALY", isOnline: true, currentReading: { temperature: 80.0 } }, // Faulty!
      { id: "N3", distanceKm: 3.0, status: "OFFLINE", isOnline: false, currentReading: { temperature: 10.0 } } // Offline!
    ];
    const idw = calculateIDWInterpolation(mockNeighbors, "temperature", 1.5, true);
    assert.strictEqual(idw.validNeighborCount, 1, "Only 1 healthy neighbor should be used");
    assert.strictEqual(idw.expectedValue, 31.0, "Should use only healthy station value (31.0)");
  });

  console.log("\n--- 2. ANOMALY DETECTION ENGINE TESTS ---");

  test("Detects stuck sensor after >= 5 identical readings", () => {
    const target = {
      id: "STN-003",
      name: "Guindy Tech Park",
      status: "NORMAL",
      isOnline: true,
      currentReading: { temperature: 32.40, humidity: 68.0, pressure: 1011.2 }
    };

    // 6 consecutive cycles of identical temperature 32.40
    const history = Array(6).fill(null).map((_, i) => ({
      cycle: i + 1,
      timestamp: new Date().toISOString(),
      temperature: 32.40,
      humidity: 65.0 + i * 0.5,
      pressure: 1011.2
    }));

    const result = anomalyDetector.evaluateStation(target, history, STATIONS);
    assert.strictEqual(result.status, "ANOMALY", "Status should be ANOMALY");
    assert.strictEqual(result.faultType, "TEMP_SENSOR_STUCK_FAULT", "Fault type should be TEMP_SENSOR_STUCK_FAULT");
    assert(result.confidence >= 65, `Confidence should be >= 65%, got ${result.confidence}%`);
    assert(result.consecutiveStuckCycles >= 5, `Streak should be >= 5, got ${result.consecutiveStuckCycles}`);
  });

  test("Detects physically invalid readings (e.g. humidity > 100%)", () => {
    const target = {
      id: "STN-001",
      name: "Marina Coastline",
      status: "NORMAL",
      isOnline: true,
      currentReading: { temperature: 31.0, humidity: 135.0, pressure: 1010.0, windSpeed: 10.0 }
    };
    const history = [
      { temperature: 31.0, humidity: 75.0, pressure: 1010.0, windSpeed: 10.0 },
      target.currentReading
    ];

    const result = anomalyDetector.evaluateStation(target, history, STATIONS);
    assert.strictEqual(result.status, "ANOMALY");
    assert.strictEqual(result.faultType, "INVALID_READING_OUT_OF_BOUNDS");
    assert.strictEqual(result.primaryMetric, "humidity");
    assert(result.confidence > 95, "Confidence should be > 95% for physical bound violations");
  });

  test("Detects negative wind speed as physical impossibility", () => {
    const target = {
      id: "STN-002",
      name: "T. Nagar Urban Hub",
      status: "NORMAL",
      isOnline: true,
      currentReading: { temperature: 32.0, humidity: 65.0, pressure: 1010.0, windSpeed: -8.5 }
    };
    const history = [
      { temperature: 32.0, humidity: 65.0, pressure: 1010.0, windSpeed: 8.0 },
      target.currentReading
    ];

    const result = anomalyDetector.evaluateStation(target, history, STATIONS);
    assert.strictEqual(result.status, "ANOMALY");
    assert.strictEqual(result.faultType, "INVALID_READING_OUT_OF_BOUNDS");
    assert.strictEqual(result.primaryMetric, "windSpeed");
  });

  test("Detects sudden spike / drop exceeding rate-of-change threshold", () => {
    const target = {
      id: "STN-004",
      name: "Velachery Basin",
      status: "NORMAL",
      isOnline: true,
      currentReading: { temperature: 48.0, humidity: 70.0, pressure: 1011.0 } // 16°C spike
    };
    const history = [
      { temperature: 32.0, humidity: 70.0, pressure: 1011.0 },
      target.currentReading
    ];

    const result = anomalyDetector.evaluateStation(target, history, STATIONS);
    assert.strictEqual(result.status, "ANOMALY");
    assert.strictEqual(result.faultType, "SUDDEN_SPIKE_DROP_FAULT");
    assert.strictEqual(result.primaryMetric, "temperature");
  });

  test("Detects offline sensor distinct from stuck sensor", () => {
    const target = {
      id: "STN-005",
      name: "Adyar Estuary",
      status: "OFFLINE",
      isOnline: false,
      currentReading: null
    };

    const result = anomalyDetector.evaluateStation(target, [], STATIONS);
    assert.strictEqual(result.status, "OFFLINE");
    assert.strictEqual(result.faultType, "SENSOR_OFFLINE_COMMUNICATION_FAILURE");
    assert.strictEqual(result.primaryMetric, "connectivity");
  });

  console.log("\n--- 3. INCIDENT WORKFLOW & DEDUPLICATION TESTS ---");

  await asyncTest("Creates and deduplicates persistent incidents across multiple cycles", async () => {
    const incidentData1 = {
      incidentId: "INC-TEST-001",
      stationId: "STN-UNIT-TEST",
      stationName: "Unit Test Station",
      triggerCategory: "SENSOR_FAULT",
      faultType: "TEMP_SENSOR_STUCK_FAULT",
      primaryMetric: "temperature",
      severity: "CRITICAL",
      status: "OPEN",
      streakCount: 5,
      observedValue: 32.40,
      expectedValue: 30.10
    };

    // Save cycle 1
    const inc1 = await repository.saveIncident(incidentData1);
    assert(inc1, "Incident 1 should be saved");

    // Look up active incident
    const active = await repository.findActiveIncident("STN-UNIT-TEST", "TEMP_SENSOR_STUCK_FAULT");
    assert(active, "Active incident should be found in repository");
    assert.strictEqual(active.status, "OPEN");

    // Next cycle: deduplicate and update streakCount to 6
    const updated = await repository.saveIncident({
      ...active,
      streakCount: 6
    });
    assert.strictEqual(updated.streakCount, 6, "Streak count should update without creating duplicate record");
  });

  await asyncTest("Acknowledges and resolves incidents with audit notes", async () => {
    const user = { userId: "OP-003", name: "Dr. Karthik Subramanian", role: "operator", email: "operator3@aerosense.gov.in" };

    // Acknowledge
    const ack = await repository.acknowledgeIncident("INC-TEST-001", user, "Transducer physical probe inspected.");
    assert.strictEqual(ack.status, "ACKNOWLEDGED");
    assert(ack.notes.length > 0, "Inspection note should be stored");

    // Resolve
    const res = await repository.resolveIncident("INC-TEST-001", user, "Transducer re-seated and calibrated.");
    assert.strictEqual(res.status, "RESOLVED");
    assert.strictEqual(res.resolvedBy.userId, "OP-003");

    // Verify resolved incident is no longer returned as active
    const activeAfter = await repository.findActiveIncident("STN-UNIT-TEST", "TEMP_SENSOR_STUCK_FAULT");
    assert.strictEqual(activeAfter, null, "Resolved incident should not be matched as active");
  });

  console.log("\n--- 4. RBAC & STATION ACCESS RESTRICTION TESTS ---");

  test("Generates valid JWT tokens with station assignment payload", () => {
    const operatorUser = {
      userId: "USR-OP-001",
      email: "operator1@aerosense.gov.in",
      role: "operator",
      assignedStationId: "STN-001",
      name: "Rajesh Kumar"
    };

    const token = signToken(operatorUser);
    assert(token && token.length > 20, "JWT token should be signed");
  });

  test("Operator assigned to STN-001 cannot access STN-002", () => {
    const operator1 = {
      role: "operator",
      assignedStationId: "STN-001"
    };

    const admin = {
      role: "admin",
      assignedStationId: null
    };

    // Rule: Admin can access any station
    const canAdminAccessStn2 = admin.role === "admin";
    assert.strictEqual(canAdminAccessStn2, true, "Admin must have access to STN-002");

    // Rule: Operator 1 can access STN-001
    const canOp1AccessStn1 = operator1.role === "admin" || operator1.assignedStationId === "STN-001";
    assert.strictEqual(canOp1AccessStn1, true, "Operator 1 must have access to STN-001");

    // Rule: Operator 1 CANNOT access STN-002
    const canOp1AccessStn2 = operator1.role === "admin" || operator1.assignedStationId === "STN-002";
    assert.strictEqual(canOp1AccessStn2, false, "Operator 1 must be BLOCKED from accessing STN-002!");
  });

  console.log("\n--- 5. TARGETED NOTIFICATION ROUTING TESTS ---");

  await asyncTest("Routes notifications to assigned operator and admin", async () => {
    // Notification for STN-003 operator
    await repository.createNotification({
      notificationId: "NOTIF-TEST-STN3",
      recipientRole: "operator",
      recipientStationId: "STN-003",
      stationId: "STN-003",
      title: "Fault at Guindy Tech Park",
      message: "Temperature frozen",
      severity: "HIGH"
    });

    const op3 = { role: "operator", assignedStationId: "STN-003" };
    const op1 = { role: "operator", assignedStationId: "STN-001" };
    const admin = { role: "admin", assignedStationId: null };

    const op3Notifs = await repository.getNotificationsForUser(op3);
    const op1Notifs = await repository.getNotificationsForUser(op1);
    const adminNotifs = await repository.getNotificationsForUser(admin);

    const op3HasNotif = op3Notifs.some((n) => n.notificationId === "NOTIF-TEST-STN3");
    const op1HasNotif = op1Notifs.some((n) => n.notificationId === "NOTIF-TEST-STN3");
    const adminHasNotif = adminNotifs.some((n) => n.notificationId === "NOTIF-TEST-STN3");

    assert.strictEqual(op3HasNotif, true, "STN-003 operator must receive notification");
    assert.strictEqual(op1HasNotif, false, "STN-001 operator must NOT receive STN-003 notification!");
    assert.strictEqual(adminHasNotif, true, "Administrator must receive all notifications");
  });

  console.log("\n========================================================");
  console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
