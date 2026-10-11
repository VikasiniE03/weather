import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { FaultControlBanner } from "./components/FaultControlBanner";
import { KpiSummary } from "./components/KpiSummary";
import { StationGrid } from "./components/StationGrid";
import { TelemetryChart } from "./components/TelemetryChart";
import { SpatialRadarMap } from "./components/SpatialRadarMap";
import { AlertFeed } from "./components/AlertFeed";
import { AlgorithmExplainerModal } from "./components/AlgorithmExplainerModal";
import {
  fetchStations,
  fetchComparisonData,
  fetchAlerts,
  clearAlerts,
  getFaultStatus,
  toggleFault,
  triggerManualTick,
  resetSimulation
} from "./services/api";

export function App() {
  const [stations, setStations] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [comparisonNeighbors, setComparisonNeighbors] = useState(["STN-004", "STN-005"]);
  const [alerts, setAlerts] = useState([]);
  const [faultStatus, setFaultStatus] = useState(null);
  const [selectedStationId, setSelectedStationId] = useState("STN-003");
  const [selectedMetric, setSelectedMetric] = useState("both"); // for fault injector: 'temperature' | 'humidity' | 'both'
  const [chartMetric, setChartMetric] = useState("temperature"); // for chart view: 'temperature' | 'humidity'
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Modals
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);

  // Central refresh function - dynamic for selectedStationId
  const refreshData = useCallback(async (targetStnId = selectedStationId) => {
    try {
      const [stnRes, compRes, alertRes, faultRes] = await Promise.all([
        fetchStations(),
        fetchComparisonData(targetStnId),
        fetchAlerts(),
        getFaultStatus()
      ]);

      if (stnRes.success) setStations(stnRes.data);
      if (compRes.success) {
        setComparisonData(compRes.data);
        if (compRes.neighbors) setComparisonNeighbors(compRes.neighbors);
      }
      if (alertRes.success) setAlerts(alertRes.data);
      if (faultRes.success) setFaultStatus(faultRes.data);
    } catch (err) {
      console.warn("Telemetry polling sync:", err.message);
    }
  }, [selectedStationId]);

  // Initial load and periodic polling every 2.5 seconds
  useEffect(() => {
    refreshData(selectedStationId);
    const interval = setInterval(() => {
      refreshData(selectedStationId);
    }, 2500);
    return () => clearInterval(interval);
  }, [refreshData, selectedStationId]);

  // Handler: Select Active Station (All 5 Stations accessible)
  const handleSelectStation = async (stationId) => {
    setSelectedStationId(stationId);
    await refreshData(stationId);
  };

  // Handler: Toggle Fault State on ANY station and metric
  const handleToggleFault = async (stationId = selectedStationId, metric = selectedMetric) => {
    setLoading(true);
    try {
      const res = await toggleFault({
        stationId: stationId || selectedStationId,
        metric: metric || selectedMetric
      });
      if (res.success) {
        setFaultStatus(res.faultStatus);
        setActionMessage(res.message);
        setTimeout(() => setActionMessage(null), 4000);
        await refreshData(stationId || selectedStationId);
      }
    } catch (err) {
      console.error("Fault toggle error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handler: Step Manual Tick
  const handleManualTick = async () => {
    setLoading(true);
    try {
      const res = await triggerManualTick();
      if (res.success) {
        await refreshData(selectedStationId);
      }
    } catch (err) {
      console.error("Tick error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handler: Reset Simulation
  const handleReset = async () => {
    if (!window.confirm("Reset simulation to initial baseline state?")) return;
    setLoading(true);
    try {
      await resetSimulation();
      setSelectedStationId("STN-003");
      setSelectedMetric("both");
      await refreshData("STN-003");
      setActionMessage("Simulation successfully reset to baseline.");
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      console.error("Reset error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handler: Clear Alerts
  const handleClearAlerts = async () => {
    try {
      await clearAlerts();
      await refreshData(selectedStationId);
    } catch (err) {
      console.error("Clear alerts error:", err);
    }
  };

  const targetStation = stations.find((s) => s.id === selectedStationId);
  const activeAlertCount = alerts.filter((a) => a.active).length;

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Application Header */}
      <Header
        isLive={true}
        onManualTick={handleManualTick}
        onReset={handleReset}
        onOpenExplainer={() => setIsExplainerOpen(true)}
        activeAlertCount={activeAlertCount}
      />

      {/* Main Command Center Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Floating Action Banner */}
        {actionMessage && (
          <div className="mb-4 p-3 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-xs font-mono flex items-center justify-between shadow-glowCyan animate-in fade-in duration-150">
            <span>⚡ {actionMessage}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. Master Fault Injection Control Panel (Supports All 5 Stations & Temperature/Humidity) */}
        <FaultControlBanner
          stations={stations}
          selectedStationId={selectedStationId}
          onSelectStation={handleSelectStation}
          selectedMetric={selectedMetric}
          onSelectMetric={setSelectedMetric}
          faultStatus={faultStatus}
          onToggleFault={handleToggleFault}
          onManualTick={handleManualTick}
          loading={loading}
        />

        {/* 2. KPI Summary Bar */}
        <KpiSummary
          stations={stations}
          alerts={alerts}
          faultStatus={faultStatus}
        />

        {/* 3. 5 Stations Status Grid (Click any station to inspect & test) */}
        <StationGrid
          stations={stations}
          selectedStationId={selectedStationId}
          onSelectStation={handleSelectStation}
          faultStatus={faultStatus}
        />

        {/* 4. Comparative Visual Analytics & Spatial Radar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Time Series Comparison Chart (Dynamic for Selected Station & Metric) */}
          <div className="lg:col-span-2">
            <TelemetryChart
              comparisonData={comparisonData}
              faultStatus={faultStatus}
              targetId={selectedStationId}
              targetStation={targetStation}
              neighborIds={comparisonNeighbors}
              selectedMetric={chartMetric}
              onSelectMetric={setChartMetric}
            />
          </div>

          {/* Spatial Radar / Geodesic Topology (Dynamic Center) */}
          <div className="lg:col-span-1">
            <SpatialRadarMap
              stations={stations}
              faultStatus={faultStatus}
              selectedStationId={selectedStationId}
            />
          </div>
        </div>

        {/* 5. Active Incident Log & Mitigation Feed */}
        <AlertFeed
          alerts={alerts}
          onClearAlerts={handleClearAlerts}
        />
      </main>

      {/* Algorithm Blueprint Modal */}
      <AlgorithmExplainerModal
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-[#1F2E45] bg-[#090D15] py-4 text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            AERO-SENSE // Smart India Hackathon (SIH 2026) • Multi-Station Dual-Metric Anomaly Detection
          </div>
          <div className="flex items-center space-x-4 text-slate-400">
            <span>Model: Spatial-Temporal Haversine + IDW</span>
            <span>Target: {selectedStationId}</span>
            <span className="text-emerald-400">Status: Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
