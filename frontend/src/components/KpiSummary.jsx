import React from "react";
import { Server, ShieldCheck, ShieldAlert, Compass, Gauge } from "lucide-react";

export const KpiSummary = ({ stations, alerts, faultStatus }) => {
  const totalStations = stations.length || 5;
  const activeAlerts = alerts.filter((a) => a.active);
  const isAnomaly = activeAlerts.length > 0;
  const targetStation = stations.find((s) => s.id === "STN-003");
  const maxConfidence = activeAlerts.length > 0 
    ? Math.max(...activeAlerts.map((a) => a.confidence))
    : targetStation?.anomalyReport?.confidence || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Total Nodes */}
      <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm hover:border-zinc-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider font-medium">
            Network Nodes
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

      {/* 2. Network Integrity */}
      <div
        className={`rounded-xl p-4 border transition-colors shadow-sm ${
          isAnomaly
            ? "border-rose-300 bg-rose-50/50"
            : "bg-white border-zinc-200 hover:border-zinc-300"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider font-medium">
            Network Status
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
            {isAnomaly ? `${activeAlerts.length} ANOMALY DETECTED` : "NOMINAL"}
          </span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-1">
          {isAnomaly ? "Hardware Flatline Verified" : "Zero-variance checks passing"}
        </p>
      </div>

      {/* 3. Spatial Radius */}
      <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm hover:border-zinc-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider font-medium">
            Spatial Correlator
          </span>
          <div className="p-2 rounded-lg bg-zinc-100 text-zinc-700">
            <Compass className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-extrabold text-zinc-900 font-mono">15.0</span>
          <span className="text-xs text-zinc-600 font-medium">km Radius</span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-1">Haversine + IDW Interpolation</p>
      </div>

      {/* 4. Peak Anomaly Confidence */}
      <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm hover:border-zinc-300 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider font-medium">
            AI Confidence Score
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
        <p className="text-[11px] text-zinc-500 mt-1">Multi-factor probability model</p>
      </div>
    </div>
  );
};
