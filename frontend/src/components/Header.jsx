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
    <header className="border-b border-zinc-200 bg-white/95 backdrop-blur-md sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left: Branding */}
        <div className="flex items-center space-x-3.5">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-zinc-100 border border-zinc-200 shadow-xs">
            <Activity className="w-5 h-5 text-zinc-800" />
            {activeAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 text-[9px] font-bold text-white items-center justify-center">
                  {activeAlertCount}
                </span>
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold tracking-tight text-zinc-900">
                AERO-SENSE
              </h1>
              <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 font-mono">
                Real-Time Grid
              </span>
              <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                Spatial-Temporal AI
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              AI-based Weather Sensor Anomaly Detection & Self-Healing Telemetry Network
            </p>
          </div>
        </div>

        {/* Right: Actions & Status */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Real-time telemetry pulse */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-zinc-100 border border-zinc-200 text-xs font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
            </span>
            <span className="text-zinc-600 font-medium">TELEMETRY:</span>
            <span className="text-zinc-900 font-bold">5s SYNC</span>
          </div>

          {/* Manual Step Tick Button */}
          <button
            onClick={onManualTick}
            title="Advance telemetry by 1 cycle immediately"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-xs font-medium text-white transition-all shadow-xs"
          >
            <Play className="w-3.5 h-3.5 text-zinc-200 fill-zinc-200" />
            <span>Step Cycle</span>
          </button>

          {/* Algorithm Explainer Button */}
          <button
            onClick={onOpenExplainer}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-50 active:scale-95 border border-zinc-200 text-xs font-medium text-zinc-700 transition-all shadow-xs"
          >
            <Cpu className="w-3.5 h-3.5 text-zinc-500" />
            <span>AI Math</span>
          </button>

          {/* Reset button */}
          <button
            onClick={onReset}
            title="Reset simulation to initial baseline"
            className="p-1.5 rounded-lg bg-white hover:bg-zinc-50 active:scale-95 border border-zinc-200 text-zinc-500 hover:text-zinc-900 transition-all shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
