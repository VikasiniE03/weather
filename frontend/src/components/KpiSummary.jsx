import React from "react";
import { Server, ShieldCheck, ShieldAlert, Compass, Gauge, Smartphone, Users } from "lucide-react";

export const KpiSummary = ({
  stations = [],
  alerts = [],
  faultStatus,
  smsLog = [],
  operators = [],
  selectedStationId = "STN-003",
  onOpenOperatorModal
}) => {
  const totalStations = stations.length || 5;
  const activeAlerts = alerts.filter((a) => a.active);
  const isAnomaly = activeAlerts.length > 0;
  const targetStation = stations.find((s) => s.id === selectedStationId) || stations[0];
  const maxConfidence = activeAlerts.length > 0 
    ? Math.max(...activeAlerts.map((a) => a.confidence))
    : targetStation?.anomalyReport?.confidence || 0;
  const smsDispatchedCount = smsLog.length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {/* 1. Total Nodes */}
      <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm hover:border-zinc-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider font-medium">
            Weather Stations
          </span>
          <div className="p-2 rounded-lg bg-zinc-100 text-zinc-700">
            <Server className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-extrabold text-zinc-900 font-mono">{totalStations}</span>
          <span className="text-xs text-emerald-700 font-medium">/ 5 Online (100%)</span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-1">Metropolitan IoT Sensor Grid</p>
      </div>

      {/* 2. Station Operators */}
      <div
        onClick={onOpenOperatorModal}
        className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm hover:border-zinc-300 transition-colors cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider font-medium">
            Station Operators
          </span>
          <div className="p-2 rounded-lg bg-zinc-100 text-zinc-700 group-hover:bg-zinc-900 group-hover:text-white transition-colors">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-extrabold text-zinc-900 font-mono">5</span>
          <span className="text-xs text-emerald-700 font-medium">/ 5 Assigned</span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-1">Direct SMS Alert Ready</p>
      </div>

      {/* 3. Cellular SMS Alerts */}
      <div
        onClick={onOpenOperatorModal}
        className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm hover:border-zinc-300 transition-colors cursor-pointer group"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider font-medium">
            Cellular SMS Alerts
          </span>
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Smartphone className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-extrabold text-zinc-900 font-mono">{smsDispatchedCount}</span>
          <span className="text-xs text-emerald-700 font-medium">Delivered</span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-1">Airtel / Jio / GSM Gateway</p>
      </div>

      {/* 4. Network Status */}
      <div
        className={`rounded-xl p-4 border transition-colors shadow-sm ${
          isAnomaly
            ? "border-rose-300 bg-rose-50/50"
            : "bg-white border-zinc-200 hover:border-zinc-300"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider font-medium">
            Network Integrity
          </span>
          <div
            className={`p-2 rounded-lg ${
              isAnomaly ? "bg-rose-100 text-rose-600 animate-pulse" : "bg-zinc-100 text-zinc-700"
            }`}
          >
            {isAnomaly ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span
            className={`text-xl font-bold font-mono ${
              isAnomaly ? "text-rose-600" : "text-emerald-700"
            }`}
          >
            {isAnomaly ? `${activeAlerts.length} INCIDENTS` : "NOMINAL"}
          </span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-1">
          {isAnomaly ? "Operator SMS Dispatched" : "Sensors & Weather Normal"}
        </p>
      </div>

      {/* 5. Peak Anomaly Confidence */}
      <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm hover:border-zinc-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider font-medium">
            AI Confidence
          </span>
          <div
            className={`p-2 rounded-lg ${
              maxConfidence > 65
                ? "bg-rose-100 text-rose-600"
                : maxConfidence > 0
                ? "bg-amber-100 text-amber-700"
                : "bg-zinc-100 text-zinc-700"
            }`}
          >
            <Gauge className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span
            className={`text-2xl font-extrabold font-mono ${
              maxConfidence > 65
                ? "text-rose-600"
                : maxConfidence > 0
                ? "text-amber-700"
                : "text-zinc-900"
            }`}
          >
            {maxConfidence > 0 ? `${maxConfidence}%` : "0%"}
          </span>
          <span className="text-xs text-zinc-500 font-medium">
            {maxConfidence > 65 ? "Critical" : maxConfidence > 0 ? "Watch" : "Nominal"}
          </span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-1">Spatial IDW + Zero-Variance</p>
      </div>
    </div>
  );
};
