import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import { dbConnection } from "../src/database/db.js";
import { seedDatabase } from "../src/scripts/seed.js";
import { repository } from "../src/database/repository.js";

test("AERO-SENSE HTTP API & End-to-End Workflow Integration Test", async (t) => {
  // Ensure DB is initialized and seeded
  await dbConnection.connect();
  await seedDatabase();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. Health check
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.status, "healthy");
    assert.ok(health.database.activeDriver);
    console.log("  ✅ [PASS] GET /api/health returns 200 with active storage driver:", health.database.activeDriver);

    // 2. Demo credentials endpoint
    const credsRes = await fetch(`${baseUrl}/api/auth/demo-credentials`);
    assert.equal(credsRes.status, 200);
    const creds = await credsRes.json();
    assert.equal(creds.success, true);
    assert.equal(creds.roles.length, 6);
    console.log("  ✅ [PASS] GET /api/auth/demo-credentials provides admin and 5 station operators");

    // 3. Login as Operator 1 (STN-001)
    const op1LoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "operator1@aerosense.gov.in",
        password: "Operator@12345"
      })
    });
    assert.equal(op1LoginRes.status, 200);
    const op1Login = await op1LoginRes.json();
    assert.equal(op1Login.success, true);
    assert.ok(op1Login.token);
    assert.equal(op1Login.user.assignedStationId, "STN-001");
    const op1Token = op1Login.token;
    console.log("  ✅ [PASS] Operator 1 successfully logged in and received JWT with STN-001 assignment");

    // 4. Operator 1 accesses STN-001 (Allowed)
    const op1AllowedRes = await fetch(`${baseUrl}/api/stations/STN-001`, {
      headers: { Authorization: `Bearer ${op1Token}` }
    });
    assert.equal(op1AllowedRes.status, 200);
    const stn1Data = await op1AllowedRes.json();
    assert.equal(stn1Data.data.id, "STN-001");
    console.log("  ✅ [PASS] Operator 1 successfully retrieved STN-001 data");

    // 5. Operator 1 attempts to access STN-002 (Forbidden 403)
    const op1ForbiddenRes = await fetch(`${baseUrl}/api/stations/STN-002`, {
      headers: { Authorization: `Bearer ${op1Token}` }
    });
    assert.equal(op1ForbiddenRes.status, 403);
    const forbiddenBody = await op1ForbiddenRes.json();
    assert.equal(forbiddenBody.code, "ACCESS_DENIED");
    console.log("  ✅ [PASS] Operator 1 blocked from accessing STN-002 with HTTP 403 Forbidden");

    // 6. Login as Admin
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@aerosense.gov.in",
        password: "Admin@12345"
      })
    });
    assert.equal(adminLoginRes.status, 200);
    const adminLogin = await adminLoginRes.json();
    assert.equal(adminLogin.user.role, "admin");
    const adminToken = adminLogin.token;
    console.log("  ✅ [PASS] Admin successfully logged in with role 'admin'");

    // 7. Admin accesses STN-002 (Allowed)
    const adminStn2Res = await fetch(`${baseUrl}/api/stations/STN-002`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(adminStn2Res.status, 200);
    console.log("  ✅ [PASS] Admin successfully accessed STN-002");

    // 8. Inject stuck sensor fault on STN-003 via API
    const faultToggleRes = await fetch(`${baseUrl}/api/fault/toggle`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        stationId: "STN-003",
        metric: "temperature"
      })
    });
    assert.equal(faultToggleRes.status, 200);
    const faultStatus = await faultToggleRes.json();
    assert.equal(faultStatus.success, true);
    console.log("  ✅ [PASS] Admin toggled stuck-sensor fault injection on STN-003");

    // 9. Advance ticks to exceed 5 consecutive cycles
    for (let i = 0; i < 6; i++) {
      const tickRes = await fetch(`${baseUrl}/api/fault/tick`, {
        method: "POST",
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(tickRes.status, 200);
    }
    console.log("  ✅ [PASS] Advanced 6 telemetry cycles to trigger stuck sensor threshold");

    // 10. Check incidents for STN-003
    const incidentsRes = await fetch(`${baseUrl}/api/incidents?stationId=STN-003`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(incidentsRes.status, 200);
    const incidentsList = await incidentsRes.json();
    const incidents = incidentsList.data || [];
    assert.ok(incidents.length > 0);
    const activeIncident = incidents.find((inc) => inc.status === "OPEN" && inc.stationId === "STN-003");
    assert.ok(activeIncident, "Expected an OPEN incident on STN-003");
    assert.ok(activeIncident.faultType.includes("STUCK"));
    console.log(`  ✅ [PASS] Persistent incident created: ${activeIncident.incidentId} (${activeIncident.faultType}, Severity: ${activeIncident.severity})`);

    // 11. Check SMS dispatch log for STN-003
    const smsLogRes = await fetch(`${baseUrl}/api/sms/log`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(smsLogRes.status, 200);
    const smsLog = await smsLogRes.json();
    const logs = smsLog.data || [];
    assert.ok(logs.length > 0);
    const stn3Sms = logs.find((l) => l.stationId === "STN-003");
    assert.ok(stn3Sms);
    const statusText = stn3Sms.status || stn3Sms.deliveryStatus || "";
    assert.ok(statusText.includes("SIMULATED") || statusText.includes("DELIVERED"));
    console.log(`  ✅ [PASS] SMS dispatch logged for ${stn3Sms.operatorName || stn3Sms.recipientName} (${stn3Sms.recipientPhone}): ${statusText}`);

    // 12. Login as Operator 3 (STN-003) and acknowledge incident
    const op3LoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "operator3@aerosense.gov.in",
        password: "Operator@12345"
      })
    });
    const op3Login = await op3LoginRes.json();
    const op3Token = op3Login.token;

    const ackRes = await fetch(`${baseUrl}/api/incidents/${activeIncident.incidentId}/acknowledge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${op3Token}`
      },
      body: JSON.stringify({ notes: "Dispatched technician to Guindy Tech Park to verify sensor thermistor." })
    });
    assert.equal(ackRes.status, 200);
    const ackData = await ackRes.json();
    const ackIncident = ackData.data || ackData.incident;
    assert.equal(ackIncident.status, "ACKNOWLEDGED");
    console.log("  ✅ [PASS] Operator 3 acknowledged incident with inspection note");

    // 13. Resolve incident
    const resolveRes = await fetch(`${baseUrl}/api/incidents/${activeIncident.incidentId}/resolve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${op3Token}`
      },
      body: JSON.stringify({ resolutionNote: "Thermistor cleaned and re-calibrated. Readings normal." })
    });
    assert.equal(resolveRes.status, 200);
    const resolvedData = await resolveRes.json();
    const resolvedIncident = resolvedData.data || resolvedData.incident;
    assert.equal(resolvedIncident.status, "RESOLVED");
    console.log("  ✅ [PASS] Operator 3 resolved incident with resolution audit notes");

  } finally {
    server.close();
  }
});
