import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  fetchStationDetails,
  fetchStationHistory,
  acknowledgeIncident,
  resolveIncident,
  addIncidentNote,
  sendTestSms
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Compass,
  Droplets,
  Gauge,
  MapPin,
  MessageSquare,
  Radio,
  RefreshCw,
  Send,
  Shield,
  Thermometer,
  Wind,
  Zap,
  Check,
  UserCheck
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from "recharts";

export function StationDashboardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin, isAuthorizedForStation } = useAuth();

  const [station, setStation] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'sensors' | 'history' | 'incidents'
  const [selectedMetric, setSelectedMetric] = useState("temperature");

  // Incident action state
  const [noteInputs, setNoteInputs] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  // Check station-level authorization
  useEffect(() => {
    if (currentUser && !isAuthorizedForStation(id)) {
      navigate("/access-denied", {
        state: {
          attemptedStationId: id,
          assignedStationId: currentUser.assignedStationId
        }
      });
    }
  }, [currentUser, id, isAuthorizedForStation, navigate]);

  const loadData = useCallback(async () => {
    try {
      const res = await fetchStationDetails(id);
      if (res.success && res.data) {
        setStation(res.data);
        if (res.data.history) setHistory(res.data.history);
      }
      setError(null);
    } catch (err) {
      if (err.status === 403) {
        navigate("/access-denied", {
          state: {
            attemptedStationId: id,
            assignedStationId: currentUser?.assignedStationId
          }
        });
      } else {
        setError(err.message || "Failed to load station telemetry");
      }
    } finally {
      setLoading(false);
    }
  }, [id, navigate, currentUser]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleAcknowledge = async (incidentId) => {
    setActionLoading(true);
    try {
      const note = noteInputs[incidentId] || "";
      await acknowledgeIncident(incidentId, note);
      setFeedbackMessage(`Incident ${incidentId} successfully acknowledged.`);
      setTimeout(() => setFeedbackMessage(null), 4000);
      await loadData();
    } catch (err) {
      alert("Error acknowledging incident: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async (incidentId) => {
    const resolutionNote = prompt("Enter resolution summary / field verification note:", "Sensor inspected, recalibrated, and nominal.");
    if (!resolutionNote) return;

    setActionLoading(true);
    try {
      await resolveIncident(incidentId, resolutionNote);
      setFeedbackMessage(`Incident ${incidentId} resolved.`);
      setTimeout(() => setFeedbackMessage(null), 4000);
      await loadData();
    } catch (err) {
      alert("Error resolving incident: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendTestAlert = async () => {
    try {
      const res = await sendTestSms(id);
      setFeedbackMessage(res.message || "Test alert transmitted to assigned operator.");
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err) {
      alert("Test alert error: " + err.message);
    }
  };

  if (loading && !station) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="flex items-center space-x-3 text-zinc-600 font-mono text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-zinc-900" />
          <span>Connecting to Station Telemetry Node {id}...</span>
        </div>
      </div>
    );
  }

  if (error || !station) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] p-6 max-w-4xl mx-auto flex flex-col justify-center">
        <div className="p-6 rounded-2xl bg-white border border-rose-200 shadow-sm">
          <div className="flex items-center space-x-3 text-rose-600 mb-3">
            <AlertTriangle className="w-6 h-6" />
            <h2 className="text-lg font-bold">Station Access Error</h2>
          </div>
          <p className="text-sm text-zinc-600 mb-4">{error || "Station not found"}</p>
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-xs font-mono px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Central Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const reading = station.currentReading || {};
  const isOnline = station.isOnline !== false;
  const isAnomaly = station.status === "ANOMALY";
  const isWarning = station.status === "WARNING";
  const anomalyReport = station.anomalyReport || {};
  const recentIncidents = station.recentIncidents || [];
  const operator = station.operator || {};
  const sensorHealth = station.sensorHealth || {};

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-zinc-900 flex flex-col font-sans pb-12">
      {/* Station Sub-Header Banner */}
      <div className="bg-white border-b border-zinc-200 px-4 sm:px-6 lg:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-600 transition-colors"
              title="Return to Central Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-3">
                <span className="text-xs font-mono font-bold bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded border border-zinc-200">
                  {station.id}
                </span>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
                  {station.name}
                </h1>
                <span
                  className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium ${
                    !isOnline
                      ? "bg-zinc-100 text-zinc-600 border border-zinc-300"
                      : isAnomaly
                      ? "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                      : isWarning
                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      !isOnline ? "bg-zinc-400" : isAnomaly ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                  />
                  <span>{!isOnline ? "OFFLINE" : isAnomaly ? "ANOMALY DETECTED" : isWarning ? "WARNING" : "OPERATIONAL NOMINAL"}</span>
                </span>
              </div>
              <div className="flex items-center space-x-4 text-xs text-zinc-500 font-mono mt-1">
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{station.location}</span>
                </span>
                <span>•</span>
                <span>Lat: {station.lat.toFixed(4)}°, Lon: {station.lon.toFixed(4)}°</span>
                <span>•</span>
                <span>Elev: {station.elevation}m</span>
                <span>•</span>
                <span>Zone: {station.zone}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSendTestAlert}
              className="inline-flex items-center space-x-2 text-xs font-mono font-medium px-3.5 py-2 rounded-xl bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 shadow-sm transition-all"
            >
              <Send className="w-3.5 h-3.5 text-blue-600" />
              <span>Verify SMS Link</span>
            </button>
            <div className="text-right text-xs font-mono text-zinc-500 hidden sm:block">
              <div>Last Packet:</div>
              <div className="font-semibold text-zinc-800">
                {station.lastUpdated ? new Date(station.lastUpdated).toLocaleTimeString() : "--:--:--"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {feedbackMessage && (
          <div className="p-3 rounded-xl bg-zinc-900 text-white text-xs font-mono flex items-center justify-between shadow-sm animate-in fade-in">
            <span>⚡ {feedbackMessage}</span>
            <button onClick={() => setFeedbackMessage(null)} className="text-zinc-400 hover:text-white">✕</button>
          </div>
        )}

        {/* 1. Critical Anomaly Resolution Banner (if active) */}
        {isAnomaly && (
          <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-rose-600 text-white">
                      {anomalyReport.severity || "HIGH"} SEVERITY
                    </span>
                    <h3 className="font-bold text-rose-950 text-base">
                      {anomalyReport.faultType || "Sensor Transducer Anomaly"}
                    </h3>
                  </div>
                  <p className="text-xs text-rose-800 font-mono mt-1.5 leading-relaxed">
                    {anomalyReport.reason || "Sensor reading deviates from spatial neighborhood baseline."}
                  </p>
                  <div className="mt-3 p-3 rounded-xl bg-white/80 border border-rose-200 text-xs text-zinc-800 font-mono">
                    <strong className="text-rose-900 font-semibold">Suggested Action: </strong>
                    {anomalyReport.recommendedAction || "Inspect and recalibrate station transducer."}
                  </div>
                  <div className="mt-2 text-xs font-mono text-zinc-600 flex items-center space-x-4">
                    <span>Observed: <strong>{anomalyReport.currentValue}</strong></span>
                    <span>Neighbor Baseline: <strong>{anomalyReport.expectedValue}</strong></span>
                    <span>Discrepancy: <strong>{anomalyReport.divergence}</strong></span>
                    <span>Confidence Score: <strong>{anomalyReport.confidence}%</strong></span>
                  </div>
                </div>
              </div>

              {/* Operator Quick Resolve Action */}
              <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
                {recentIncidents[0]?.status === "OPEN" && (
                  <button
                    onClick={() => handleAcknowledge(recentIncidents[0].incidentId)}
                    disabled={actionLoading}
                    className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-mono font-medium rounded-xl shadow-sm transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Acknowledge</span>
                  </button>
                )}
                <button
                  onClick={() => handleResolve(recentIncidents[0]?.incidentId || `INC-${station.id}`)}
                  disabled={actionLoading}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-medium rounded-xl shadow-sm transition-all flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Resolve & Clear</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Key Sensor Telemetry Cards (Real-time readings) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Temperature */}
          <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-card">
            <div className="flex items-center justify-between text-zinc-500 mb-1">
              <span className="text-xs font-mono font-medium">Temperature</span>
              <Thermometer className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-900">
              {reading.temperature !== undefined ? `${reading.temperature.toFixed(1)}°C` : "--"}
            </div>
            <div className="text-[11px] font-mono text-zinc-500 mt-1 flex items-center justify-between">
              <span>Base: {station.baseTemp}°C</span>
              <span className={reading.isFaultInjected && reading.faultMetric?.includes("temp") ? "text-rose-600 font-bold" : "text-emerald-600"}>
                {reading.isFaultInjected && reading.faultMetric?.includes("temp") ? "FROZEN" : "NOMINAL"}
              </span>
            </div>
          </div>

          {/* Humidity */}
          <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-card">
            <div className="flex items-center justify-between text-zinc-500 mb-1">
              <span className="text-xs font-mono font-medium">Humidity</span>
              <Droplets className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-900">
              {reading.humidity !== undefined ? `${reading.humidity.toFixed(1)}%` : "--"}
            </div>
            <div className="text-[11px] font-mono text-zinc-500 mt-1 flex items-center justify-between">
              <span>Base: {station.baseHumidity}%</span>
              <span className={reading.isFaultInjected && reading.faultMetric?.includes("hum") ? "text-rose-600 font-bold" : "text-emerald-600"}>
                {reading.isFaultInjected && reading.faultMetric?.includes("hum") ? "FROZEN" : "NOMINAL"}
              </span>
            </div>
          </div>

          {/* Pressure */}
          <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-card">
            <div className="flex items-center justify-between text-zinc-500 mb-1">
              <span className="text-xs font-mono font-medium">Pressure</span>
              <Gauge className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-900">
              {reading.pressure !== undefined ? `${reading.pressure.toFixed(1)}` : "--"}
            </div>
            <div className="text-[11px] font-mono text-zinc-500 mt-1">
              <span>hPa • Atmospheric Tide</span>
            </div>
          </div>

          {/* Wind Speed */}
          <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-card">
            <div className="flex items-center justify-between text-zinc-500 mb-1">
              <span className="text-xs font-mono font-medium">Wind Vector</span>
              <Wind className="w-4 h-4 text-teal-500" />
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-900">
              {reading.windSpeed !== undefined ? `${reading.windSpeed.toFixed(1)}` : "--"}
              <span className="text-xs font-normal text-zinc-500 ml-1">km/h</span>
            </div>
            <div className="text-[11px] font-mono text-zinc-500 mt-1 flex items-center justify-between">
              <span>Heading:</span>
              <span className="font-bold text-zinc-700">{reading.windDirection || station.baseWindDirection || "E"}</span>
            </div>
          </div>

          {/* Rainfall */}
          <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-card">
            <div className="flex items-center justify-between text-zinc-500 mb-1">
              <span className="text-xs font-mono font-medium">Precipitation</span>
              <Droplets className="w-4 h-4 text-cyan-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-zinc-900">
              {reading.rainfall !== undefined ? `${reading.rainfall.toFixed(1)}` : "0.0"}
              <span className="text-xs font-normal text-zinc-500 ml-1">mm/h</span>
            </div>
            <div className="text-[11px] font-mono text-zinc-500 mt-1">
              <span>Pluviometer Rate</span>
            </div>
          </div>

          {/* Connectivity & Node Status */}
          <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-card">
            <div className="flex items-center justify-between text-zinc-500 mb-1">
              <span className="text-xs font-mono font-medium">Telemetry Link</span>
              <Radio className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-xl font-bold font-mono text-zinc-900 flex items-center space-x-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-rose-500"}`} />
              <span>{isOnline ? "ONLINE" : "OFFLINE"}</span>
            </div>
            <div className="text-[11px] font-mono text-zinc-500 mt-1">
              <span>Cycle #{reading.cycle || station.currentReading?.cycle || "--"}</span>
            </div>
          </div>
        </div>

        {/* 3. Sensor Health & Hardware Diagnosis Breakdown */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-card">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-zinc-700" />
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-zinc-800">
                Individual Sensor Array Health Diagnostics
              </h3>
            </div>
            <span className="text-xs font-mono text-zinc-500">
              Sampling interval: 5.0s • Geodesic Radius: 15 km
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {Object.entries(sensorHealth).map(([key, s]) => {
              const isFault = s.status === "FAULT";
              const isWeather = s.status === "WEATHER_ALERT";
              return (
                <div
                  key={key}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isFault
                      ? "bg-rose-50 border-rose-300"
                      : isWeather
                      ? "bg-amber-50 border-amber-300"
                      : "bg-zinc-50 border-zinc-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase font-mono text-zinc-700">{key}</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isFault
                          ? "bg-rose-600 text-white"
                          : isWeather
                          ? "bg-amber-600 text-white"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 font-mono mt-1 truncate">{s.label}</div>
                  <div className="text-sm font-bold font-mono text-zinc-900 mt-2">
                    {s.reading !== undefined ? `${s.reading} ${s.unit}` : s.speed !== undefined ? `${s.speed} ${s.unit}` : `${s.rainfall || 0} ${s.unit}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Historical Time-Series Graph */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-zinc-200">
            <div>
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-zinc-800">
                Live Sensor Telemetry History ({history.length} samples)
              </h3>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                Real-time microclimatic telemetry stream for {station.name}
              </p>
            </div>

            <div className="flex items-center space-x-1.5 bg-zinc-100 p-1 rounded-xl text-xs font-mono">
              <button
                onClick={() => setSelectedMetric("temperature")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  selectedMetric === "temperature"
                    ? "bg-white text-zinc-900 shadow-sm font-bold"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Temperature (°C)
              </button>
              <button
                onClick={() => setSelectedMetric("humidity")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  selectedMetric === "humidity"
                    ? "bg-white text-zinc-900 shadow-sm font-bold"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Humidity (%)
              </button>
              <button
                onClick={() => setSelectedMetric("pressure")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  selectedMetric === "pressure"
                    ? "bg-white text-zinc-900 shadow-sm font-bold"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Pressure (hPa)
              </button>
              <button
                onClick={() => setSelectedMetric("windSpeed")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  selectedMetric === "windSpeed"
                    ? "bg-white text-zinc-900 shadow-sm font-bold"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Wind (km/h)
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={selectedMetric === "temperature" ? "#E11D48" : selectedMetric === "humidity" ? "#2563EB" : "#0D9488"}
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="95%"
                      stopColor={selectedMetric === "temperature" ? "#E11D48" : selectedMetric === "humidity" ? "#2563EB" : "#0D9488"}
                      stopOpacity={0.0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(t) => (t ? t.split("T")[1]?.slice(0, 8) : "")}
                  stroke="#9CA3AF"
                  fontSize={11}
                  fontFamily="JetBrains Mono"
                />
                <YAxis stroke="#9CA3AF" fontSize={11} domain={["auto", "auto"]} fontFamily="JetBrains Mono" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181B",
                    borderRadius: "12px",
                    border: "none",
                    color: "#fff",
                    fontFamily: "JetBrains Mono",
                    fontSize: "11px"
                  }}
                  labelFormatter={(t) => `Timestamp: ${t}`}
                />
                <Area
                  type="monotone"
                  dataKey={selectedMetric}
                  name={selectedMetric.toUpperCase()}
                  stroke={selectedMetric === "temperature" ? "#E11D48" : selectedMetric === "humidity" ? "#2563EB" : "#0D9488"}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#metricGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5. Assigned Operator & Field Incident Log */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Operator Information Card */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-card">
            <div className="flex items-center space-x-2 border-b border-zinc-200 pb-3 mb-4">
              <UserCheck className="w-4 h-4 text-zinc-700" />
              <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-zinc-800">
                Designated Station Operator
              </h3>
            </div>
            <div className="space-y-3 font-mono text-xs">
              <div>
                <span className="text-zinc-400">Name:</span>
                <div className="font-bold text-zinc-900 text-sm mt-0.5">{operator.name || "Unassigned"}</div>
              </div>
              <div>
                <span className="text-zinc-400">Role:</span>
                <div className="text-zinc-700 mt-0.5">{operator.role || "Station Field Technician"}</div>
              </div>
              <div>
                <span className="text-zinc-400">Cellular Contact:</span>
                <div className="font-bold text-zinc-900 text-sm mt-0.5">{operator.phone || "Not Configured"}</div>
              </div>
              <div>
                <span className="text-zinc-400">Official Email:</span>
                <div className="text-zinc-700 mt-0.5">{operator.email || "operator@aerosense.gov.in"}</div>
              </div>
              <div>
                <span className="text-zinc-400">Shift Schedule:</span>
                <div className="text-zinc-700 mt-0.5">{operator.shift || "General (09:00 - 18:00 IST)"}</div>
              </div>
              <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-zinc-500">
                <span>SMS Notifications:</span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                  {operator.smsAlertsEnabled ? "ENABLED" : "DISABLED"}
                </span>
              </div>
            </div>
          </div>

          {/* Station Incidents & History */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 p-5 shadow-card">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-zinc-700" />
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-zinc-800">
                  Station Incident Audit Log
                </h3>
              </div>
              <span className="text-xs font-mono text-zinc-500">
                {recentIncidents.length} recorded events
              </span>
            </div>

            {recentIncidents.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-zinc-400">
                No past sensor incidents recorded for this station. System nominal.
              </div>
            ) : (
              <div className="space-y-3">
                {recentIncidents.map((inc) => (
                  <div
                    key={inc.incidentId}
                    className={`p-3.5 rounded-xl border font-mono text-xs space-y-2 ${
                      inc.status === "OPEN"
                        ? "bg-rose-50 border-rose-200 text-rose-950"
                        : inc.status === "ACKNOWLEDGED"
                        ? "bg-amber-50 border-amber-200 text-amber-950"
                        : "bg-zinc-50 border-zinc-200 text-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold">{inc.incidentId}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800">
                          {inc.faultType}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          inc.status === "OPEN"
                            ? "bg-rose-600 text-white"
                            : inc.status === "ACKNOWLEDGED"
                            ? "bg-amber-600 text-white"
                            : "bg-emerald-600 text-white"
                        }`}
                      >
                        {inc.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-600 leading-relaxed">
                      {inc.reason || inc.recommendedAction}
                    </div>

                    <div className="text-[10px] text-zinc-500 flex flex-wrap items-center gap-3">
                      <span>Streak: {inc.streakCount} cycles</span>
                      <span>Confidence: {inc.confidence}%</span>
                      <span>Time: {new Date(inc.createdAt || inc.lastSeenAt).toLocaleTimeString()}</span>
                      {inc.resolvedAt && (
                        <span className="text-emerald-700 font-semibold">
                          Resolved at {new Date(inc.resolvedAt).toLocaleTimeString()}
                        </span>
                      )}
                    </div>

                    {/* Incident Inspection Notes */}
                    {inc.notes && inc.notes.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-zinc-200/60 space-y-1">
                        <div className="text-[10px] font-bold text-zinc-500">Inspection Notes:</div>
                        {inc.notes.map((n, idx) => (
                          <div key={idx} className="text-[11px] text-zinc-700 bg-white/70 p-1.5 rounded">
                            <span className="font-semibold text-zinc-900">{n.authorName}: </span>
                            {n.text}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Operator Action Bar for Open/Acknowledged Incidents */}
                    {inc.status !== "RESOLVED" && (
                      <div className="pt-2 border-t border-zinc-200 flex items-center justify-end space-x-2">
                        {inc.status === "OPEN" && (
                          <button
                            onClick={() => handleAcknowledge(inc.incidentId)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-semibold rounded"
                          >
                            Acknowledge
                          </button>
                        )}
                        <button
                          onClick={() => handleResolve(inc.incidentId)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold rounded"
                        >
                          Resolve
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StationDashboardPage;
