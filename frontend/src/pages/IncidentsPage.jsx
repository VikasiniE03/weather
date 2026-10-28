import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  fetchIncidents,
  acknowledgeIncident,
  resolveIncident,
  addIncidentNote
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  MessageSquare,
  ShieldAlert,
  ArrowRight,
  Check,
  RefreshCw,
  Plus
} from "lucide-react";

export function IncidentsPage() {
  const { currentUser, isAdmin } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadIncidents = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await fetchIncidents(params);
      if (res.success && res.data) {
        setIncidents(res.data);
      }
    } catch (err) {
      console.warn("Error loading incidents:", err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadIncidents();
    const interval = setInterval(loadIncidents, 4000);
    return () => clearInterval(interval);
  }, [loadIncidents]);

  const handleAcknowledge = async (incidentId) => {
    setActionLoading(true);
    try {
      await acknowledgeIncident(incidentId, "Acknowledged from incident control board.");
      setFeedback(`Incident ${incidentId} acknowledged.`);
      setTimeout(() => setFeedback(null), 3000);
      await loadIncidents();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async (incidentId) => {
    const resNote = prompt("Enter resolution notes:", "Transducer inspected and verified nominal.");
    if (!resNote) return;

    setActionLoading(true);
    try {
      await resolveIncident(incidentId, resNote);
      setFeedback(`Incident ${incidentId} resolved.`);
      setTimeout(() => setFeedback(null), 3000);
      await loadIncidents();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddNote = async (incidentId) => {
    if (!noteText.trim()) return;
    setActionLoading(true);
    try {
      await addIncidentNote(incidentId, noteText.trim());
      setNoteText("");
      await loadIncidents();
      // Update selected incident notes locally
      const updated = await fetchIncidents({ stationId: currentUser?.assignedStationId });
      if (updated.data) {
        const found = updated.data.find((i) => i.incidentId === incidentId);
        if (found) setSelectedIncident(found);
      }
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Sensor Anomaly Incidents & Resolution
            </h1>
            <span className="text-xs font-mono font-bold bg-zinc-100 text-zinc-700 px-2.5 py-0.5 rounded-full border border-zinc-200">
              {incidents.length} Records
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            {isAdmin
              ? "All 5 Chennai weather stations monitored • Full administrative control"
              : `Station Boundary: ${currentUser?.assignedStationId || "Unassigned"} • Assigned Operator Access`}
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-zinc-400 flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </span>
          <div className="inline-flex rounded-xl bg-zinc-100 p-1 text-xs font-mono">
            <button
              onClick={() => setStatusFilter("")}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === "" ? "bg-white text-zinc-900 font-bold shadow-sm" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("OPEN")}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === "OPEN" ? "bg-white text-rose-700 font-bold shadow-sm" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setStatusFilter("ACKNOWLEDGED")}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === "ACKNOWLEDGED" ? "bg-white text-amber-700 font-bold shadow-sm" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Acknowledged
            </button>
            <button
              onClick={() => setStatusFilter("RESOLVED")}
              className={`px-3 py-1 rounded-lg transition-all ${
                statusFilter === "RESOLVED" ? "bg-white text-emerald-700 font-bold shadow-sm" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Resolved
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-zinc-900 text-white text-xs font-mono flex items-center justify-between shadow-sm animate-in fade-in">
          <span>⚡ {feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Incidents Table / Cards */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-12 text-center text-xs font-mono text-zinc-500 flex items-center justify-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin text-zinc-900" />
            <span>Loading incidents database...</span>
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <h3 className="font-bold text-sm text-zinc-900 font-mono">No Incidents Found</h3>
            <p className="text-xs text-zinc-500 font-mono mt-1">
              All sensors for your authorized station are operating nominally within spatial-temporal thresholds.
            </p>
          </div>
        ) : (
          incidents.map((inc) => {
            const isOpen = inc.status === "OPEN";
            const isAck = inc.status === "ACKNOWLEDGED";
            const isResolved = inc.status === "RESOLVED";

            return (
              <div
                key={inc.incidentId}
                className={`p-5 rounded-2xl border bg-white shadow-card transition-all ${
                  isOpen
                    ? "border-rose-300 ring-1 ring-rose-200"
                    : isAck
                    ? "border-amber-300 ring-1 ring-amber-200"
                    : "border-zinc-200"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-zinc-900">{inc.incidentId}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-800">
                        {inc.stationName} ({inc.stationId})
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          inc.severity === "CRITICAL"
                            ? "bg-rose-600 text-white"
                            : inc.severity === "HIGH"
                            ? "bg-rose-500 text-white"
                            : "bg-amber-500 text-white"
                        }`}
                      >
                        {inc.severity}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                          isOpen
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : isAck
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {inc.status}
                      </span>
                      <span className="text-xs font-mono text-zinc-400">
                        {new Date(inc.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-zinc-900 font-mono">
                      {inc.faultType}: {inc.reason || "Sensor reading deviates from spatial neighborhood"}
                    </h4>

                    <div className="text-xs font-mono text-zinc-600 flex flex-wrap items-center gap-4">
                      <span>Observed: <strong>{inc.observedValue ?? "--"}</strong></span>
                      <span>Expected Baseline: <strong>{inc.expectedValue ?? "--"}</strong></span>
                      <span>Discrepancy: <strong>{inc.divergence ?? 0}</strong></span>
                      <span>Streak: <strong>{inc.streakCount} cycles</strong></span>
                      <span>Confidence Score: <strong>{inc.confidence}%</strong></span>
                    </div>

                    {inc.recommendedAction && (
                      <div className="text-xs font-mono text-zinc-700 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                        <strong className="text-zinc-900">Recommended Action: </strong>
                        {inc.recommendedAction}
                      </div>
                    )}

                    {/* Inspection Notes */}
                    {inc.notes && inc.notes.length > 0 && (
                      <div className="pt-2 space-y-1">
                        <div className="text-[10px] font-mono font-bold uppercase text-zinc-400">
                          Field Log Notes:
                        </div>
                        {inc.notes.map((n, idx) => (
                          <div key={idx} className="text-xs font-mono bg-zinc-100 p-2 rounded-lg text-zinc-800">
                            <span className="font-bold text-zinc-900">{n.authorName} ({n.authorRole}): </span>
                            {n.text}
                            <span className="text-[10px] text-zinc-400 ml-2">
                              {new Date(n.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                    <Link
                      to={`/station/${inc.stationId}`}
                      className="px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-mono text-xs flex items-center justify-center space-x-1"
                    >
                      <span>Open Station</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    {isOpen && (
                      <button
                        onClick={() => handleAcknowledge(inc.incidentId)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-mono text-xs font-semibold flex items-center justify-center space-x-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Acknowledge</span>
                      </button>
                    )}

                    {!isResolved && (
                      <button
                        onClick={() => handleResolve(inc.incidentId)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-semibold flex items-center justify-center space-x-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Resolve</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default IncidentsPage;
