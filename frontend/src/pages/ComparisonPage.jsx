import React, { useState, useEffect, useCallback } from "react";
import { fetchStations, fetchComparisonData } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { GitCompare, MapPin, Sliders, Shield, AlertCircle, Info, RefreshCw } from "lucide-react";

export function ComparisonPage() {
  const { currentUser, isAdmin } = useAuth();
  const [stations, setStations] = useState([]);
  const [targetStationId, setTargetStationId] = useState(
    currentUser?.role === "operator" ? currentUser.assignedStationId || "STN-001" : "STN-003"
  );
  const [selectedNeighbors, setSelectedNeighbors] = useState(["STN-004", "STN-005"]);
  const [selectedMetric, setSelectedMetric] = useState("temperature"); // 'temperature' | 'humidity' | 'pressure' | 'windSpeed'
  const [comparisonData, setComparisonData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load stations
  useEffect(() => {
    fetchStations().then((res) => {
      if (res.success && res.data) {
        setStations(res.data);
      }
    });
  }, []);

  // Update targetStationId if operator is logged in
  useEffect(() => {
    if (currentUser?.role === "operator" && currentUser.assignedStationId) {
      setTargetStationId(currentUser.assignedStationId);
    }
  }, [currentUser]);

  const loadComparison = useCallback(async () => {
    try {
      const res = await fetchComparisonData(targetStationId, selectedNeighbors);
      if (res.success && res.data) {
        setComparisonData(res.data);
      }
    } catch (err) {
      console.warn("Failed to load comparison data:", err.message);
    } finally {
      setLoading(false);
    }
  }, [targetStationId, selectedNeighbors]);

  useEffect(() => {
    loadComparison();
    const interval = setInterval(loadComparison, 3000);
    return () => clearInterval(interval);
  }, [loadComparison]);

  const targetStation = stations.find((s) => s.id === targetStationId);
  const isOperator = currentUser?.role === "operator";

  const handleNeighborToggle = (nId) => {
    if (selectedNeighbors.includes(nId)) {
      if (selectedNeighbors.length > 1) {
        setSelectedNeighbors(selectedNeighbors.filter((id) => id !== nId));
      }
    } else {
      setSelectedNeighbors([...selectedNeighbors, nId]);
    }
  };

  const metricColors = {
    target: "#E11D48",
    baseline: "#059669",
    neighbor0: "#2563EB",
    neighbor1: "#7C3AED",
    neighbor2: "#D97706"
  };

  const getMetricKey = (stnId, metric) => {
    if (metric === "humidity") return `${stnId}_hum`;
    if (metric === "pressure") return `${stnId}_press`;
    if (metric === "windSpeed") return `${stnId}_wind`;
    return stnId;
  };

  const getBaselineKey = (metric) => {
    if (metric === "humidity") return "neighborHumAvg";
    return "neighborAvg";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Spatial Neighborhood & IDW Comparison
            </h1>
            <span className="text-xs font-mono font-bold bg-zinc-100 text-zinc-700 px-2.5 py-0.5 rounded-full border border-zinc-200">
              Inverse Distance Weighting
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            Compare target station telemetry against weighted spatial baseline of healthy neighbors within 15 km
          </p>
        </div>

        {/* Metric Selector */}
        <div className="flex items-center space-x-1.5 bg-zinc-100 p-1 rounded-xl text-xs font-mono">
          <button
            onClick={() => setSelectedMetric("temperature")}
            className={`px-3 py-1 rounded-lg transition-all ${
              selectedMetric === "temperature" ? "bg-white text-zinc-900 font-bold shadow-sm" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Temperature
          </button>
          <button
            onClick={() => setSelectedMetric("humidity")}
            className={`px-3 py-1 rounded-lg transition-all ${
              selectedMetric === "humidity" ? "bg-white text-zinc-900 font-bold shadow-sm" : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Humidity
          </button>
        </div>
      </div>

      {/* Control Panel: Target and Neighbor Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Target Station Selector */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-card font-mono text-xs space-y-3">
          <div className="flex items-center space-x-2 text-zinc-800 font-bold uppercase tracking-wider pb-2 border-b border-zinc-100">
            <GitCompare className="w-4 h-4 text-rose-600" />
            <span>Target Station</span>
          </div>

          {isOperator ? (
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
              <span className="text-zinc-400">Authorized Target:</span>
              <div className="font-bold text-sm text-zinc-900 mt-1">
                {targetStation?.name} ({targetStation?.id})
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">
                Operator restricted to assigned station per RBAC.
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-zinc-500 mb-1.5">Select Target for Analysis:</label>
              <select
                value={targetStationId}
                onChange={(e) => setTargetStationId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-zinc-300 bg-white font-mono text-xs focus:ring-2 focus:ring-zinc-900 focus:outline-none"
              >
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} — {s.name} ({s.zone})
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetStation && (
            <div className="text-[11px] space-y-1 text-zinc-600 pt-2 border-t border-zinc-100">
              <div>Zone: <strong className="text-zinc-800">{targetStation.zone}</strong></div>
              <div>Elevation: <strong className="text-zinc-800">{targetStation.elevation}m</strong></div>
              <div>Current Reading: <strong className="text-zinc-900">{targetStation.currentReading?.[selectedMetric] ?? "--"}{selectedMetric === "temperature" ? "°C" : "%"}</strong></div>
              <div>Status: <span className={`font-bold ${targetStation.status === "ANOMALY" ? "text-rose-600" : "text-emerald-600"}`}>{targetStation.status}</span></div>
            </div>
          )}
        </div>

        {/* Neighboring Stations Selector */}
        <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-zinc-200 shadow-card font-mono text-xs space-y-3">
          <div className="flex items-center space-x-2 text-zinc-800 font-bold uppercase tracking-wider pb-2 border-b border-zinc-100">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span>Select Neighboring Baseline Nodes (Geodesic Matrix)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {stations
              .filter((s) => s.id !== targetStationId)
              .map((s) => {
                const isChecked = selectedNeighbors.includes(s.id);
                const distance = targetStation?.distanceMatrix?.[s.id] || "--";
                return (
                  <label
                    key={s.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      isChecked
                        ? "bg-blue-50 border-blue-200 text-blue-950 font-bold"
                        : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleNeighborToggle(s.id)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div>{s.name} ({s.id})</div>
                        <div className="text-[10px] text-zinc-500 font-normal">Distance: {distance} km • {s.zone}</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold">
                      {s.currentReading?.[selectedMetric] ?? "--"}{selectedMetric === "temperature" ? "°C" : "%"}
                    </span>
                  </label>
                );
              })}
          </div>
        </div>
      </div>

      {/* Main Comparative Time-Series Chart */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <div>
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-zinc-800">
              Spatial Trajectory vs Geodesic Baseline
            </h3>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Target ({targetStationId}) compared against IDW calculated expectation
            </p>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            Continuous sequential stream
          </span>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={comparisonData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" vertical={false} />
              <XAxis
                dataKey="time"
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
              />
              <Legend wrapperStyle={{ fontFamily: "JetBrains Mono", fontSize: "11px", paddingTop: "8px" }} />

              {/* Target Station Line */}
              <Line
                type="monotone"
                dataKey={getMetricKey(targetStationId, selectedMetric)}
                name={`Target [${targetStationId}]`}
                stroke={metricColors.target}
                strokeWidth={3}
                dot={false}
              />

              {/* IDW Baseline Line */}
              <Line
                type="monotone"
                dataKey={getBaselineKey(selectedMetric)}
                name="IDW Spatial Baseline"
                stroke={metricColors.baseline}
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
              />

              {/* Neighbor Lines */}
              {selectedNeighbors.map((nId, idx) => (
                <Line
                  key={nId}
                  type="monotone"
                  dataKey={getMetricKey(nId, selectedMetric)}
                  name={`Neighbor [${nId}]`}
                  stroke={idx === 0 ? metricColors.neighbor0 : idx === 1 ? metricColors.neighbor1 : metricColors.neighbor2}
                  strokeWidth={1.5}
                  strokeOpacity={0.7}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Explainability / Reasoning Box */}
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 font-mono text-xs text-zinc-700 space-y-2">
          <div className="flex items-center space-x-2 font-bold text-zinc-900">
            <Info className="w-4 h-4 text-zinc-600" />
            <span>Mathematical Interpretation & Spatial Deviation Analysis:</span>
          </div>
          <p className="leading-relaxed text-[11px]">
            The Inverse Distance Weighting (IDW) baseline assigns dynamic weights proportional to <code className="bg-zinc-200 px-1 py-0.5 rounded">1 / (distance^1.5)</code> from healthy surrounding stations.
            Legitimate local temperature variations exist across urban heat islands (such as T. Nagar) and maritime coastline stations (Marina Beach). The anomaly engine suppresses false positives by verifying neighbor variance; only when a transducer completely flatlines with zero window variance OR exhibits statistically abnormal divergence from all surrounding stations is a hardware transducer fault declared.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ComparisonPage;
