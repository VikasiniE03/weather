/**
 * API Service for AeroSense Anomaly Detection Engine
 * Interfaces with backend endpoints for all 5 stations, dual metrics,
 * authentication, incidents, notifications, simulator controls, and SMS logs.
 */

const API_BASE = "/api";

// Local token management
let authToken = localStorage.getItem("aerosense_token") || null;

export function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem("aerosense_token", token);
  } else {
    localStorage.removeItem("aerosense_token");
  }
}

export function getAuthToken() {
  return authToken || localStorage.getItem("aerosense_token");
}

function getHeaders(customHeaders = {}) {
  const headers = { ...customHeaders };
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// ================= AUTHENTICATION =================
export async function loginUser(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");
  if (data.token) {
    setAuthToken(data.token);
  }
  return data;
}

export async function fetchCurrentUser() {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getHeaders()
    });
    if (!res.ok) {
      if (res.status === 401) {
        setAuthToken(null);
      }
      return null;
    }
    return await res.json();
  } catch (err) {
    return null;
  }
}

export async function logoutUser() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: getHeaders()
    });
  } finally {
    setAuthToken(null);
  }
}

export async function fetchDemoCredentials() {
  const res = await fetch(`${API_BASE}/auth/demo-credentials`);
  if (!res.ok) throw new Error("Failed to fetch demo credentials");
  return res.json();
}

// ================= TELEMETRY & STATIONS =================
export async function fetchSyncData(targetId = "STN-003", neighbors = null) {
  const params = new URLSearchParams({ targetId });
  if (neighbors && neighbors.length > 0) {
    params.set("neighbors", neighbors.join(","));
  }
  const res = await fetch(`${API_BASE}/sync?${params}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while fetching sync data`);
  return res.json();
}

export async function fetchStations() {
  const res = await fetch(`${API_BASE}/stations`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while fetching stations`);
  return res.json();
}

export async function fetchStationDetails(stationId) {
  const res = await fetch(`${API_BASE}/stations/${stationId}`, {
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || `HTTP error ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function fetchComparisonData(targetId = "STN-003", neighbors = null) {
  const params = new URLSearchParams({ targetId });
  if (neighbors && neighbors.length > 0) {
    params.set("neighbors", neighbors.join(","));
  }
  const res = await fetch(`${API_BASE}/stations/comparison?${params}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while fetching comparison data`);
  return res.json();
}

export async function fetchStationHistory(id) {
  const res = await fetch(`${API_BASE}/stations/${id}/history`, {
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || data.message || `HTTP error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ================= ALERTS & INCIDENTS =================
export async function fetchAlerts(activeOnly = false) {
  const res = await fetch(`${API_BASE}/alerts${activeOnly ? "?activeOnly=true" : ""}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while fetching alerts`);
  return res.json();
}

export async function clearAlerts() {
  const res = await fetch(`${API_BASE}/alerts/clear`, {
    method: "POST",
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while clearing alerts`);
  return res.json();
}

export async function fetchIncidents(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/incidents${query ? `?${query}` : ""}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while fetching incidents`);
  return res.json();
}

export async function fetchIncidentDetails(id) {
  const res = await fetch(`${API_BASE}/incidents/${id}`, {
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP error ${res.status}`);
  return data;
}

export async function acknowledgeIncident(id, note = "") {
  const res = await fetch(`${API_BASE}/incidents/${id}/acknowledge`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ note })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP error ${res.status}`);
  return data;
}

export async function resolveIncident(id, resolutionNote = "") {
  const res = await fetch(`${API_BASE}/incidents/${id}/resolve`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ resolutionNote })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP error ${res.status}`);
  return data;
}

export async function addIncidentNote(id, text) {
  const res = await fetch(`${API_BASE}/incidents/${id}/notes`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ text })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP error ${res.status}`);
  return data;
}

// ================= NOTIFICATIONS =================
export async function fetchNotifications(unreadOnly = false) {
  const res = await fetch(`${API_BASE}/notifications${unreadOnly ? "?unreadOnly=true" : ""}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while fetching notifications`);
  return res.json();
}

export async function fetchUnreadNotificationCount() {
  const res = await fetch(`${API_BASE}/notifications/unread-count`, {
    headers: getHeaders()
  });
  if (!res.ok) return { success: true, unreadCount: 0 };
  return res.json();
}

export async function markNotificationRead(id) {
  const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
    method: "PUT",
    headers: getHeaders()
  });
  return res.json();
}

export async function markAllNotificationsRead() {
  const res = await fetch(`${API_BASE}/notifications/read-all`, {
    method: "PUT",
    headers: getHeaders()
  });
  return res.json();
}

// ================= SIMULATOR & FAULT CONTROL =================
export async function getFaultStatus() {
  const res = await fetch(`${API_BASE}/fault/status`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while getting fault status`);
  return res.json();
}

export async function toggleFault(payload = {}) {
  let body = {};
  if (typeof payload === "boolean") {
    body = { enabled: payload };
  } else if (typeof payload === "object") {
    body = payload;
  }

  const res = await fetch(`${API_BASE}/fault/toggle`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP error ${res.status}`);
  return data;
}

export async function selectFaultTarget(stationId, metric = null) {
  const res = await fetch(`${API_BASE}/fault/select`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ stationId, metric })
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while selecting fault target`);
  return res.json();
}

export async function triggerManualTick() {
  const res = await fetch(`${API_BASE}/fault/tick`, {
    method: "POST",
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while triggering tick`);
  return res.json();
}

export async function setSimulationInterval(intervalMs) {
  const res = await fetch(`${API_BASE}/fault/interval`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ intervalMs })
  });
  return res.json();
}

export async function toggleSimulationPlayback(action = "toggle") {
  const res = await fetch(`${API_BASE}/fault/playback`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ action })
  });
  return res.json();
}

export async function resetSimulation() {
  const res = await fetch(`${API_BASE}/fault/reset`, {
    method: "POST",
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while resetting simulation`);
  return res.json();
}

// ================= OPERATORS & SMS =================
export async function fetchOperators() {
  const res = await fetch(`${API_BASE}/operators`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while fetching operators`);
  return res.json();
}

export async function updateOperator(stationId, updates = {}) {
  const res = await fetch(`${API_BASE}/operators/${stationId}`, {
    method: "PUT",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while updating operator`);
  return res.json();
}

export async function resetOperators() {
  const res = await fetch(`${API_BASE}/operators/reset`, {
    method: "POST",
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while resetting operators`);
  return res.json();
}

export async function fetchSmsConfig() {
  const res = await fetch(`${API_BASE}/sms/config`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while fetching SMS config`);
  return res.json();
}

export async function updateSmsConfig(config = {}) {
  const res = await fetch(`${API_BASE}/sms/config`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(config)
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while updating SMS config`);
  return res.json();
}

export async function fetchSmsLog() {
  const res = await fetch(`${API_BASE}/sms/log`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while fetching SMS log`);
  return res.json();
}

export async function sendTestSms(stationId, customPhone = null, customMessage = null) {
  const res = await fetch(`${API_BASE}/sms/send-test`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ stationId, customPhone, customMessage })
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while dispatching test SMS`);
  return res.json();
}

export async function clearSmsLog() {
  const res = await fetch(`${API_BASE}/sms/clear`, {
    method: "POST",
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while clearing SMS log`);
  return res.json();
}

export async function simulateWeatherEmergency(stationId, type = "CYCLONE", operatorMobile = null) {
  const res = await fetch(`${API_BASE}/weather/simulate`, {
    method: "POST",
    headers: getHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ stationId, type, operatorMobile })
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while simulating weather emergency`);
  return res.json();
}

export async function clearWeatherEmergencies() {
  const res = await fetch(`${API_BASE}/weather/clear`, {
    method: "POST",
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while clearing weather emergencies`);
  return res.json();
}

export async function fetchAuditLogs(limit = 100) {
  const res = await fetch(`${API_BASE}/audit-logs?limit=${limit}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while fetching audit logs`);
  return res.json();
}
