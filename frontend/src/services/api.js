/**
 * API Service for AeroSense Anomaly Detection Engine
 * Interfaces with backend endpoints for all 5 stations and dual metrics.
 */

const API_BASE = "/api";

export async function fetchStations() {
  const res = await fetch(`${API_BASE}/stations`);
  if (!res.ok) throw new Error(`HTTP error ${res.status} while fetching stations`);
  return res.json();
}

export async function fetchComparisonData(targetId = "STN-003", neighbors = null) {
  const params = new URLSearchParams({ targetId });
  if (neighbors && neighbors.length > 0) {
    params.set("neighbors", neighbors.join(","));
  }
  const res = await fetch(`${API_BASE}/stations/comparison?${params}`);
  if (!res.ok) throw new Error(`HTTP error ${res.status} while fetching comparison data`);
  return res.json();
}

export async function fetchStationHistory(id) {
  const res = await fetch(`${API_BASE}/stations/${id}/history`);
  if (!res.ok) throw new Error(`HTTP error ${res.status} while fetching history for ${id}`);
  return res.json();
}

export async function fetchAlerts(activeOnly = false) {
  const res = await fetch(`${API_BASE}/alerts${activeOnly ? "?activeOnly=true" : ""}`);
  if (!res.ok) throw new Error(`HTTP error ${res.status} while fetching alerts`);
  return res.json();
}

export async function clearAlerts() {
  const res = await fetch(`${API_BASE}/alerts/clear`, { method: "POST" });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while clearing alerts`);
  return res.json();
}

export async function getFaultStatus() {
  const res = await fetch(`${API_BASE}/fault/status`);
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while toggling fault`);
  return res.json();
}

export async function selectFaultTarget(stationId, metric = null) {
  const res = await fetch(`${API_BASE}/fault/select`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stationId, metric })
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while selecting fault target`);
  return res.json();
}

export async function triggerManualTick() {
  const res = await fetch(`${API_BASE}/fault/tick`, { method: "POST" });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while triggering tick`);
  return res.json();
}

export async function resetSimulation() {
  const res = await fetch(`${API_BASE}/fault/reset`, { method: "POST" });
  if (!res.ok) throw new Error(`HTTP error ${res.status} while resetting simulation`);
  return res.json();
}
