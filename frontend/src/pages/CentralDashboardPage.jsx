import React, { useState, useEffect, useCallback } from "react";
import { FaultControlBanner } from "../components/FaultControlBanner";
import { KpiSummary } from "../components/KpiSummary";
import { StationGrid } from "../components/StationGrid";
import { TelemetryChart } from "../components/TelemetryChart";
import { SpatialRadarMap } from "../components/SpatialRadarMap";
import { AlertFeed } from "../components/AlertFeed";
import { AlgorithmExplainerModal } from "../components/AlgorithmExplainerModal";
import { OperatorSmsModal } from "../components/OperatorSmsModal";
import {
  fetchSyncData,
  clearAlerts,
  toggleFault,
  triggerManualTick,
  resetSimulation
} from "../services/api";

export function CentralDashboardPage() {
  const [stations, setStations] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [comparisonNeighbors, setComparisonNeighbors] = useState(["STN-004", "STN-005"]);
  const [alerts, setAlerts] = useState([]);
  const [operators, setOperators] = useState([]);
  const [smsLog, setSmsLog] = useState([]);
  const [weatherEmergencies, setWeatherEmergencies] = useState({});
  const [faultStatus, setFaultStatus] = useState(null);
  const [selectedStationId, setSelectedStationId] = useState("STN-003");
  const [selectedMetric, setSelectedMetric] = useState("both");
  const [chartMetric, setChartMetric] = useState("temperature");
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Modals
  const [isExplainerOpen, setIsExplainerOpen] = useState(false);
  const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);

  // Sync data fetcher
  const refreshData = useCallback(async (targetStnId = selectedStationId) => {
    try {
      const res = await fetchSyncData(targetStnId);
      if (res.success) {
        if (res.stations) setStations(res.stations);
        if (res.comparison?.data) {
          setComparisonData(res.comparison.data);
          if (res.comparison.neighborIds) setComparisonNeighbors(res.comparison.neighborIds);
        }
        if (res.alerts) setAlerts(res.alerts);
        if (res.operators) setOperators(res.operators);
        if (res.smsLog) setSmsLog(res.smsLog);
        if (res.weatherEmergencies) setWeatherEmergencies(res.weatherEmergencies);
        if (res.faultStatus) setFaultStatus(res.faultStatus);
      }
    } catch (err) {
      console.warn("Telemetry sync warning:", err.message);
    }
  }, [selectedStationId]);

  // Polling loop
  useEffect(() => {
    let isMounted = true;
    let timerId = null;
    let isPolling = false;

    const poll = async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        await refreshData(selectedStationId);
      } finally {
        isPolling = false;
        if (isMounted) {
          timerId = setTimeout(poll, 2500);
        }
      }
    };

    poll();

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [refreshData, selectedStationId]);

  // Target Station Selection
  const handleSelectStation = async (stationId) => {
    setSelectedStationId(stationId);
    await refreshData(stationId);
  };

  // Toggle Fault Injection
  const handleToggleFault = async (stationId = selectedStationId, metric = selectedMetric, operatorMobile = null) => {
    setLoading(true);
    try {
      const res = await toggleFault({
        stationId: stationId || selectedStationId,
        metric: metric || selectedMetric,
        operatorMobile: operatorMobile ? operatorMobile.trim() : undefined
      });
      if (res.success) {
        setFaultStatus(res.faultStatus);
        setActionMessage(res.message);
        setTimeout(() => setActionMessage(null), 5000);
        await refreshData(stationId || selectedStationId);
      }
    } catch (err) {
      console.error("Fault toggle error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Step Manual Tick
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

  // Clear Alerts
  const handleClearAlerts = async () => {
    try {
      await clearAlerts();
      await refreshData(selectedStationId);
    } catch (err) {
      console.error("Clear alerts error:", err);
    }
  };

  const targetStation = stations.find((s) => s.id === selectedStationId);

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Action Banner */}
      {actionMessage && (
        <div className="mb-4 p-3 rounded-xl bg-zinc-900 text-white border border-zinc-800 text-xs font-mono flex items-center justify-between shadow-xs animate-in fade-in duration-150">
          <span>⚡ {actionMessage}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. Master Fault & Severe Weather Control Panel */}
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
        weatherEmergencies={weatherEmergencies}
        onWeatherChange={() => refreshData(selectedStationId)}
        onSmsSent={() => refreshData(selectedStationId)}
      />

      {/* 2. KPI Summary Bar */}
      <KpiSummary
        stations={stations}
        alerts={alerts}
        smsLog={smsLog}
        operators={operators}
        faultStatus={faultStatus}
        selectedStationId={selectedStationId}
        onOpenOperatorModal={() => setIsOperatorModalOpen(true)}
      />

      {/* 3. 5 Stations Status Grid */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-zinc-900">Regional Weather Stations (Chennai Grid)</h2>
            <p className="text-xs text-zinc-500">Click any card to designate as active comparison target, or click "Dashboard" to enter individual station telemetry</p>
          </div>
          <span className="text-xs font-mono font-medium text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-full border border-zinc-200">
            5 Active Nodes
          </span>
        </div>
        <StationGrid
          stations={stations}
          selectedStationId={selectedStationId}
          onSelectStation={handleSelectStation}
          faultStatus={faultStatus}
          onSmsSent={() => refreshData(selectedStationId)}
        />
      </div>

      {/* 4. Comparative Visual Analytics & Spatial Radar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Time Series Comparison Chart */}
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

        {/* Spatial Radar / Geodesic Topology */}
        <div className="lg:col-span-1">
          <SpatialRadarMap
            stations={stations}
            faultStatus={faultStatus}
            selectedStationId={selectedStationId}
          />
        </div>
      </div>

      {/* 5. Active Incident Log & Alerts */}
      <AlertFeed
        alerts={alerts}
        onClearAlerts={handleClearAlerts}
      />

      {/* Blueprints / Explainer Modal */}
      <AlgorithmExplainerModal
        isOpen={isExplainerOpen}
        onClose={() => setIsExplainerOpen(false)}
      />

      {/* Operators & SMS Modal */}
      <OperatorSmsModal
        isOpen={isOperatorModalOpen}
        onClose={() => setIsOperatorModalOpen(false)}
        operators={operators}
        smsLog={smsLog}
        stations={stations}
        onRefresh={() => refreshData(selectedStationId)}
      />
    </main>
  );
}

export default CentralDashboardPage;
