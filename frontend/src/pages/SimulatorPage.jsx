import React, { useState, useEffect } from "react";
import {
  fetchStations,
  getFaultStatus,
  toggleFault,
  triggerManualTick,
  resetSimulation,
  setSimulationInterval,
  toggleSimulationPlayback,
  simulateWeatherEmergency,
  clearWeatherEmergencies
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Sliders,
  AlertTriangle,
  Radio,
  Clock,
  Send,
  CloudLightning,
  Flame,
  CloudRain,
  ShieldAlert,
  Activity,
  CheckCircle2
} from "lucide-react";

export function SimulatorPage() {
  const { isAdmin } = useAuth();
  const [stations, setStations] = useState([]);
  const [faultStatus, setFaultStatus] = useState(null);
  const [selectedStationId, setSelectedStationId] = useState("STN-003");
  const [selectedMetric, setSelectedMetric] = useState("both"); // 'temperature' | 'humidity' | 'both'
  const [selectedInterval, setSelectedInterval] = useState(5000);
  const [isRunning, setIsRunning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Custom values for stuck/invalid
  const [customTemp, setCustomTemp] = useState("32.40");
  const [customHum, setCustomHum] = useState("68.00");

  const loadStatus = async () => {
    try {
      const [stnRes, faultRes] = await Promise.all([fetchStations(), getFaultStatus()]);
      if (stnRes.success && stnRes.data) setStations(stnRes.data);
      if (faultRes.success && faultRes.data) {
        setFaultStatus(faultRes.data);
        if (faultRes.intervalMs) setSelectedInterval(faultRes.intervalMs);
        if (faultRes.isRunning !== undefined) setIsRunning(faultRes.isRunning);
      }
    } catch (err) {
      console.warn("Simulator status error:", err.message);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleInjectFault = async (mode = "STUCK") => {
    setLoading(true);
    try {
      const res = await toggleFault({
        stationId: selectedStationId,
        metric: selectedMetric,
        enabled: true,
        faultMode: mode,
        stuckTemperature: parseFloat(customTemp) || 32.40,
        stuckHumidity: parseFloat(customHum) || 68.00
      });
      setFeedback(res.message);
      setTimeout(() => setFeedback(null), 4000);
      await loadStatus();
    } catch (err) {
      alert("Fault injection failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreNormal = async () => {
    setLoading(true);
    try {
      const res = await toggleFault({
        stationId: selectedStationId,
        enabled: false
      });
      setFeedback(`Restored normal dynamic readings on ${selectedStationId}.`);
      setTimeout(() => setFeedback(null), 4000);
      await loadStatus();
    } catch (err) {
      alert("Restore failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualTick = async () => {
    setLoading(true);
    try {
      const res = await triggerManualTick();
      setFeedback("Telemetry advanced by 1 cycle.");
      setTimeout(() => setFeedback(null), 2500);
      await loadStatus();
    } catch (err) {
      alert("Tick failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlayback = async () => {
    try {
      const res = await toggleSimulationPlayback(isRunning ? "stop" : "start");
      setIsRunning(res.isRunning);
      setFeedback(res.message);
      setTimeout(() => setFeedback(null), 2500);
    } catch (err) {
      alert("Playback toggle error: " + err.message);
    }
  };

  const handleIntervalChange = async (ms) => {
    setSelectedInterval(ms);
    try {
      await setSimulationInterval(ms);
      setFeedback(`Simulation tick rate set to ${ms / 1000}s`);
      setTimeout(() => setFeedback(null), 2500);
    } catch (err) {
      console.warn("Interval update failed:", err.message);
    }
  };

  const handleEmergencySim = async (type) => {
    setLoading(true);
    try {
      const res = await simulateWeatherEmergency(selectedStationId, type);
      setFeedback(res.message);
      setTimeout(() => setFeedback(null), 4000);
      await loadStatus();
    } catch (err) {
      alert("Emergency simulation error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSimulation = async () => {
    if (!window.confirm("Reset simulation to initial baseline state?")) return;
    setLoading(true);
    try {
      await resetSimulation();
      setFeedback("Simulation successfully reset to baseline.");
      setTimeout(() => setFeedback(null), 3000);
      await loadStatus();
    } catch (err) {
      alert("Reset error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const targetStation = stations.find((s) => s.id === selectedStationId);
  const currentFault = faultStatus?.stationFaults?.[selectedStationId] || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Station Telemetry & Fault Injection Studio
            </h1>
            <span className="text-xs font-mono font-bold bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full border border-rose-200">
              Admin Simulator
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            Simulate hardware transducer failures, out-of-bounds readings, offline sensor conditions, and extreme weather hazards
          </p>
        </div>

        {/* Playback & Manual Controls */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          <button
            onClick={handleTogglePlayback}
            className={`px-3 py-1.5 rounded-xl border flex items-center space-x-1.5 transition-all ${
              isRunning
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : "bg-amber-50 text-amber-800 border-amber-300"
            }`}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isRunning ? "Running" : "Paused"}</span>
          </button>

          <button
            onClick={handleManualTick}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-medium flex items-center space-x-1"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Tick (1 Cycle)</span>
          </button>

          <button
            onClick={handleResetSimulation}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-medium flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-500" />
            <span>Reset Baseline</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-zinc-900 text-white text-xs font-mono flex items-center justify-between shadow-sm animate-in fade-in">
          <span>⚡ {feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Target Station & Cadence Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Station Focus Selector */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-card font-mono text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <span className="font-bold text-zinc-900 uppercase">1. Select Target Node</span>
            <span className="text-[10px] text-zinc-400">All 5 Stations Eligible</span>
          </div>

          <div className="space-y-1.5">
            {stations.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedStationId(s.id)}
                className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                  selectedStationId === s.id
                    ? "bg-zinc-900 text-white border-zinc-900 font-bold shadow-sm"
                    : "bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold">{s.id}</span>
                    <span>{s.name}</span>
                  </div>
                  <div className={`text-[10px] mt-0.5 ${selectedStationId === s.id ? "text-zinc-400" : "text-zinc-500"}`}>
                    {s.zone}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    s.status === "ANOMALY"
                      ? "bg-rose-500 text-white"
                      : s.status === "OFFLINE"
                      ? "bg-zinc-500 text-white"
                      : selectedStationId === s.id
                      ? "bg-emerald-500 text-white"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {s.status}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Simulation Rate & Parameters */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-card font-mono text-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <span className="font-bold text-zinc-900 uppercase">2. Cadence & Transducer Clamping</span>
            <Clock className="w-4 h-4 text-zinc-400" />
          </div>

          <div>
            <label className="block text-zinc-500 mb-1.5">Simulation Cycle Interval:</label>
            <div className="grid grid-cols-3 gap-2">
              {[2000, 5000, 10000].map((ms) => (
                <button
                  key={ms}
                  onClick={() => handleIntervalChange(ms)}
                  className={`py-2 rounded-xl border font-bold text-center transition-all ${
                    selectedInterval === ms
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                      : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {ms / 1000}s
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-zinc-500 mb-1.5">Sensor Metric Scope:</label>
            <div className="grid grid-cols-3 gap-2">
              {["both", "temperature", "humidity"].map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedMetric(m)}
                  className={`py-2 rounded-xl border capitalize font-bold text-center transition-all ${
                    selectedMetric === m
                      ? "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                      : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-zinc-500 mb-1">Clamped Temp (°C):</label>
              <input
                type="text"
                value={customTemp}
                onChange={(e) => setCustomTemp(e.target.value)}
                className="w-full p-2 rounded-xl border border-zinc-300 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-zinc-500 mb-1">Clamped Hum (%):</label>
              <input
                type="text"
                value={customHum}
                onChange={(e) => setCustomHum(e.target.value)}
                className="w-full p-2 rounded-xl border border-zinc-300 font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Live Packet Telemetry Inspector */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-card font-mono text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
            <span className="font-bold text-zinc-900 uppercase">3. Live Node Telemetry Feed</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>

          <div className="p-3 rounded-xl bg-zinc-950 text-emerald-400 font-mono text-[11px] space-y-1 overflow-x-auto">
            <div>// Target Node: {selectedStationId} ({targetStation?.name})</div>
            <div>Temp: {targetStation?.currentReading?.temperature?.toFixed(2) ?? "--"}°C</div>
            <div>Humidity: {targetStation?.currentReading?.humidity?.toFixed(1) ?? "--"}%</div>
            <div>Pressure: {targetStation?.currentReading?.pressure?.toFixed(1) ?? "--"} hPa</div>
            <div>Wind: {targetStation?.currentReading?.windSpeed?.toFixed(1) ?? "--"} km/h ({targetStation?.currentReading?.windDirection || "E"})</div>
            <div>Precipitation: {targetStation?.currentReading?.rainfall?.toFixed(1) ?? "0.0"} mm/h</div>
            <div>Cycle Count: #{targetStation?.currentReading?.cycle ?? "--"}</div>
            <div>Status: <span className={targetStation?.status === "ANOMALY" ? "text-rose-400 font-bold" : "text-emerald-400"}>{targetStation?.status}</span></div>
            <div>Stuck Streak: {currentFault.cycleCount || 0} cycles</div>
          </div>

          <div className="pt-2 text-[11px] text-zinc-500">
            Detector Pipeline: Real-time evaluation runs every {selectedInterval / 1000}s. Any clamped or invalid reading generates an immediate persistent incident.
          </div>
        </div>
      </div>

      {/* Interactive Fault Injection Triggers */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-card space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <div>
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-zinc-900">
              Sensor Transducer Fault Injection Controls
            </h3>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Target Node: <strong className="text-zinc-800">{selectedStationId} ({targetStation?.name})</strong>
            </p>
          </div>

          {currentFault.enabled && (
            <button
              onClick={handleRestoreNormal}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-xs font-semibold shadow-sm transition-all"
            >
              Restore Normal Dynamics
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 font-mono text-xs">
          {/* 1. Stuck Sensor */}
          <button
            onClick={() => handleInjectFault("STUCK")}
            disabled={loading}
            className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/70 text-left space-y-1.5 transition-all group"
          >
            <div className="flex items-center justify-between font-bold text-rose-900">
              <span>Stuck Sensor</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-[11px] text-rose-700">
              Freezes readings at {customTemp}°C / {customHum}% across consecutive cycles with zero variance.
            </p>
          </button>

          {/* 2. Invalid Bounds */}
          <button
            onClick={() => handleInjectFault("INVALID_BOUNDS")}
            disabled={loading}
            className="p-4 rounded-xl border border-purple-200 bg-purple-50/70 hover:bg-purple-100/70 text-left space-y-1.5 transition-all group"
          >
            <div className="flex items-center justify-between font-bold text-purple-900">
              <span>Invalid Reading</span>
              <ShieldAlert className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-[11px] text-purple-700">
              Injects physically impossible telemetry (Humidity: 138%, Negative wind speed: -5.2 km/h).
            </p>
          </button>

          {/* 3. Sudden Spike */}
          <button
            onClick={() => handleInjectFault("SUDDEN_SPIKE")}
            disabled={loading}
            className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/70 text-left space-y-1.5 transition-all group"
          >
            <div className="flex items-center justify-between font-bold text-amber-900">
              <span>Sudden Spike</span>
              <Zap className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-[11px] text-amber-700">
              Induces rapid +15°C temperature jump in 1 cycle, violating thermodynamic rate-of-change.
            </p>
          </button>

          {/* 4. Offline Sensor */}
          <button
            onClick={() => handleInjectFault("OFFLINE")}
            disabled={loading}
            className="p-4 rounded-xl border border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-left space-y-1.5 transition-all group"
          >
            <div className="flex items-center justify-between font-bold text-zinc-900">
              <span>Offline Node</span>
              <Radio className="w-4 h-4 text-zinc-600" />
            </div>
            <p className="text-[11px] text-zinc-600">
              Simulates complete telemetry heartbeat dropout and transceiver carrier loss.
            </p>
          </button>

          {/* 5. Spatial Deviation */}
          <button
            onClick={() => handleInjectFault("SPATIAL_DEVIATION")}
            disabled={loading}
            className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-left space-y-1.5 transition-all group"
          >
            <div className="flex items-center justify-between font-bold text-blue-900">
              <span>Spatial Drift</span>
              <Sliders className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-[11px] text-blue-700">
              Artificially offsets target reading by +5.8°C against neighboring IDW baseline.
            </p>
          </button>
        </div>
      </div>

      {/* Severe Weather Hazard Simulation */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <div>
            <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-zinc-900">
              Severe Meteorological Threat Simulation (IMD Criteria)
            </h3>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Simulates real-world environmental crises to verify operator cellular alerts & emergency dispatch
            </p>
          </div>

          <button
            onClick={() => clearWeatherEmergencies().then(() => loadStatus())}
            className="px-3 py-1.5 rounded-xl border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-mono text-xs"
          >
            Clear Weather Hazards
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
          <button
            onClick={() => handleEmergencySim("CYCLONE")}
            className="p-4 rounded-xl border border-cyan-200 bg-cyan-50/70 hover:bg-cyan-100/70 text-left space-y-1 transition-all"
          >
            <div className="flex items-center justify-between font-bold text-cyan-950">
              <span>Tropical Cyclone</span>
              <CloudLightning className="w-4 h-4 text-cyan-600" />
            </div>
            <p className="text-[11px] text-cyan-800">
              Deep barometric vortex (992.8 hPa, 96.2% RH). Triggers IMD Code Red Cyclone Surge.
            </p>
          </button>

          <button
            onClick={() => handleEmergencySim("HEATWAVE")}
            className="p-4 rounded-xl border border-orange-200 bg-orange-50/70 hover:bg-orange-100/70 text-left space-y-1 transition-all"
          >
            <div className="flex items-center justify-between font-bold text-orange-950">
              <span>Severe Heatwave</span>
              <Flame className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-[11px] text-orange-800">
              Ambient temperature spikes to 42.4°C exceeding hazardous urban threshold.
            </p>
          </button>

          <button
            onClick={() => handleEmergencySim("FLOOD_STORM")}
            className="p-4 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-left space-y-1 transition-all"
          >
            <div className="flex items-center justify-between font-bold text-blue-950">
              <span>Cloudburst & Inundation</span>
              <CloudRain className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-[11px] text-blue-800">
              Supersaturated atmospheric column (98.4% RH, 996 hPa) with severe urban flood hazard.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default SimulatorPage;
