import React from "react";
import { Activity, ShieldAlert, Cpu, Sparkles, RefreshCw, Play } from "lucide-react";

export const Header = ({
  isLive,
  onManualTick,
  onReset,
  onOpenExplainer,
  activeAlertCount
}) => {
  return (
    <header className="border-b border-[#1F2E45] bg-[#0E1524]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left: Branding & SIH Tag */}
        <div className="flex items-center space-x-3.5">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 shadow-glowCyan">
            <Activity className="w-6 h-6 text-cyan-400 animate-pulse" />
            {activeAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[9px] font-bold text-white items-center justify-center">
                  {activeAlertCount}
                </span>
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
                AERO-SENSE
              </h1>
              <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
                SIH 2026
              </span>
              <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Spatial-Temporal AI
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              AI-based Weather Sensor Anomaly Detection & Self-Healing Telemetry Network
            </p>
          </div>
        </div>

        {/* Right: Actions & Status */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Real-time telemetry pulse */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-300">TELEMETRY:</span>
            <span className="text-emerald-400 font-semibold">5s SYNC</span>
          </div>

          {/* Manual Step Tick Button */}
          <button
            onClick={onManualTick}
            title="Advance telemetry by 1 cycle immediately"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-xs font-medium text-slate-200 transition-all shadow-sm"
          >
            <Play className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400" />
            <span>Step Cycle</span>
          </button>

          {/* Algorithm Explainer Button */}
          <button
            onClick={onOpenExplainer}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-700 text-xs font-medium text-slate-200 transition-all shadow-sm"
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Math</span>
          </button>

          {/* Reset button */}
          <button
            onClick={onReset}
            title="Reset simulation to initial baseline"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-400 hover:text-slate-200 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
