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
      <div className="glass-panel rounded-xl p-4 border border-[#1F2E45] hover:border-cyan-500/40 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            Network Nodes
          </span>
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Server className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-extrabold text-white font-mono">{totalStations}</span>
          <span className="text-xs text-emerald-400 font-medium">/ 5 Online (100%)</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Chennai Metropolitan IoT Grid</p>
      </div>

      {/* 2. Network Integrity */}
      <div
        className={`glass-panel rounded-xl p-4 border transition-colors ${
          isAnomaly
            ? "border-rose-500/50 bg-rose-950/20"
            : "border-[#1F2E45] hover:border-emerald-500/40"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            Network Status
          </span>
          <div
            className={`p-2 rounded-lg ${
              isAnomaly ? "bg-rose-500/20 text-rose-400 animate-pulse" : "bg-emerald-500/10 text-emerald-400"
            }`}
          >
            {isAnomaly ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span
            className={`text-xl font-bold font-mono ${
              isAnomaly ? "text-rose-400" : "text-emerald-400"
            }`}
          >
            {isAnomaly ? "1 ANOMALY DETECTED" : "NOMINAL"}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          {isAnomaly ? "STN-003 Sensor Frozen" : "Zero-variance checks passing"}
        </p>
      </div>

      {/* 3. Spatial Radius */}
      <div className="glass-panel rounded-xl p-4 border border-[#1F2E45] hover:border-indigo-500/40 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            Spatial Correlator
          </span>
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Compass className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span className="text-2xl font-extrabold text-white font-mono">15.0</span>
          <span className="text-xs text-indigo-300 font-medium">km Radius</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Haversine + IDW Interpolation</p>
      </div>

      {/* 4. Peak Anomaly Confidence */}
      <div className="glass-panel rounded-xl p-4 border border-[#1F2E45] hover:border-amber-500/40 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
            AI Confidence Score
          </span>
          <div
            className={`p-2 rounded-lg ${
              maxConfidence > 65
                ? "bg-rose-500/20 text-rose-400"
                : maxConfidence > 0
                ? "bg-amber-500/20 text-amber-400"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            <Gauge className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline space-x-2">
          <span
            className={`text-2xl font-extrabold font-mono ${
              maxConfidence > 65
                ? "text-rose-400"
                : maxConfidence > 0
                ? "text-amber-400"
                : "text-slate-200"
            }`}
          >
            {maxConfidence > 0 ? `${maxConfidence}%` : "0%"}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {maxConfidence > 65 ? "Critical" : maxConfidence > 0 ? "Watch" : "Nominal"}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">Multi-factor probability model</p>
      </div>
    </div>
  );
};
