import React from "react";
import { AlertTriangle, Power, Radio, FastForward, Zap, Thermometer, Droplets, SlidersHorizontal } from "lucide-react";

export const FaultControlBanner = ({
  stations = [],
  selectedStationId = "STN-003",
  onSelectStation,
  selectedMetric = "both",
  onSelectMetric,
  faultStatus,
  onToggleFault,
  onManualTick,
  loading
}) => {
  const currentStnFault = faultStatus?.stationFaults?.[selectedStationId] || {};
  const isEnabled = currentStnFault?.enabled;
  const cycleCount = currentStnFault?.cycleCount || 0;
  const threshold = faultStatus?.thresholdCycles || 5;
  const isAnomalyTriggered = cycleCount >= threshold;

  const currentStation = stations.find((s) => s.id === selectedStationId);
  const activeMetric = currentStnFault?.metric || selectedMetric;

  return (
    <div
      className={`rounded-2xl transition-all duration-300 border p-5 mb-6 relative overflow-hidden ${
        isEnabled
          ? "bg-gradient-to-r from-rose-950/40 via-red-950/20 to-slate-900/60 border-rose-500/50 shadow-glowRose"
          : "bg-gradient-to-r from-slate-900/80 via-slate-900/50 to-slate-950/90 border-[#1F2E45]"
      }`}
    >
      {/* Background cyber accent elements */}
      <div className="absolute top-0 right-0 w-96 h-full opacity-10 pointer-events-none cyber-grid" />

      {/* Top Selector Bar: Station & Metric Selectors */}
      <div className="mb-4 pb-4 border-b border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        {/* Station Tabs */}
        <div>
          <div className="flex items-center space-x-1.5 text-xs font-mono text-slate-400 mb-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span>SELECT TARGET WEATHER STATION (ALL 5 ACCESSIBLE):</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {stations.map((stn) => {
              const stnFault = faultStatus?.stationFaults?.[stn.id];
              const isStnFaulted = stnFault?.enabled;
              const isSelected = selectedStationId === stn.id;

              return (
                <button
                  key={stn.id}
                  onClick={() => onSelectStation(stn.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center space-x-1.5 border ${
                    isSelected
                      ? isStnFaulted
                        ? "bg-rose-950 text-rose-300 border-rose-500 shadow-glowRose"
                        : "bg-cyan-950 text-cyan-300 border-cyan-400 shadow-glowCyan"
                      : isStnFaulted
                      ? "bg-rose-950/40 text-rose-400 border-rose-500/40 hover:bg-rose-900/40"
                      : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  {isStnFaulted && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
                  <span>{stn.code}</span>
                  <span className="text-[10px] font-normal opacity-75 hidden sm:inline">
                    ({stn.name.split(" ")[0]})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Metric Selector (Temperature, Humidity, Both) */}
        <div>
          <div className="flex items-center space-x-1.5 text-xs font-mono text-slate-400 mb-1.5">
            <span>TARGET SENSOR METRIC:</span>
          </div>
          <div className="inline-flex rounded-lg p-1 bg-slate-950 border border-slate-800 text-xs font-mono">
            <button
              onClick={() => onSelectMetric("temperature")}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedMetric === "temperature"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Thermometer className="w-3.5 h-3.5 text-rose-400" />
              <span>Temperature</span>
            </button>
            <button
              onClick={() => onSelectMetric("humidity")}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedMetric === "humidity"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Droplets className="w-3.5 h-3.5 text-cyan-400" />
              <span>Humidity</span>
            </button>
            <button
              onClick={() => onSelectMetric("both")}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedMetric === "both"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>Dual (Both)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Banner Body */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 relative z-10">
        {/* Left: Info & Context */}
        <div className="flex items-start space-x-4">
          <div
            className={`p-3 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
              isEnabled
                ? "bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse"
                : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
            }`}
          >
            {isEnabled ? <AlertTriangle className="w-7 h-7" /> : <Radio className="w-7 h-7" />}
          </div>

          <div>
            <div className="flex items-center space-x-2.5">
              <span className="text-xs uppercase font-mono tracking-wider font-semibold text-slate-400">
                Active Station Target: {selectedStationId} ({currentStation?.name || "Target Node"})
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  isEnabled
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                }`}
              >
                {isEnabled ? "FAULT ACTIVE" : "NOMINAL OPERATION"}
              </span>
            </div>

            <h2 className="text-lg font-bold text-white mt-1 flex flex-wrap items-center gap-2">
              <span>{currentStation?.name}:</span>
              <span className={isEnabled ? "text-rose-400 font-mono" : "text-cyan-400 font-mono"}>
                {isEnabled ? (
                  activeMetric === "both"
                    ? `CLAMPED AT ${currentStnFault.stuckTemperature}°C & ${currentStnFault.stuckHumidity}%`
                    : activeMetric === "humidity"
                    ? `HUMIDITY CLAMPED AT ${currentStnFault.stuckHumidity}%`
                    : `TEMPERATURE CLAMPED AT ${currentStnFault.stuckTemperature}°C`
                ) : (
                  "NATURAL DYNAMIC OSCILLATION"
                )}
              </span>
            </h2>

            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {isEnabled ? (
                <>
                  Hardware fault simulated on <strong className="text-white">{currentStation?.name}</strong>. The 
                  sensor feed is frozen while all perimeter stations continue fluctuating. The AI engine runs zero-variance window detection and Haversine IDW neighbor spatial interpolation.
                </>
              ) : (
                <>
                  All sensor channels for <strong className="text-white">{currentStation?.name}</strong> are fluctuating with natural atmospheric noise. 
                  Click below to inject a stuck fault on Temperature, Humidity, or Both!
                </>
              )}
            </p>

            {/* Streak Progress Indicator */}
            {isEnabled && (
              <div className="mt-3.5 flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-1.5 text-xs font-mono">
                  <span className="text-slate-400">Flatline Streak:</span>
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded ${
                      isAnomalyTriggered
                        ? "bg-rose-500 text-white animate-pulse"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {cycleCount} / {threshold} Cycles
                  </span>
                </div>

                <div className="w-36 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isAnomalyTriggered ? "bg-rose-500" : "bg-amber-400"
                    }`}
                    style={{
                      width: `${Math.min(100, (cycleCount / threshold) * 100)}%`
                    }}
                  />
                </div>

                {isAnomalyTriggered ? (
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1 animate-pulse">
                    <Zap className="w-3.5 h-3.5" />
                    ANOMALY DETECTED ({activeMetric.toUpperCase()} SENSOR STUCK)
                  </span>
                ) : (
                  <span className="text-xs text-amber-300/90 font-mono">
                    ({threshold - cycleCount} more cycles until zero-variance flag)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Interactive Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          {/* Quick Step Button */}
          {isEnabled && !isAnomalyTriggered && (
            <button
              onClick={onManualTick}
              disabled={loading}
              title="Step 1 cycle forward"
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 border border-slate-600 text-xs font-medium text-slate-200 transition-all shadow-sm"
            >
              <FastForward className="w-4 h-4 text-amber-400" />
              <span>Step Next Cycle</span>
            </button>
          )}

          {/* Master Fault Injection Toggle Button */}
          <button
            onClick={() => onToggleFault(selectedStationId, selectedMetric)}
            disabled={loading}
            id="fault-toggle-button"
            className={`w-full sm:w-auto relative group flex items-center justify-center space-x-3 px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 shadow-lg ${
              isEnabled
                ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 hover:border-slate-500"
                : "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white border border-rose-400 shadow-glowRose animate-pulse"
            }`}
          >
            <Power className={`w-5 h-5 ${isEnabled ? "text-rose-400" : "text-white"}`} />
            <div className="text-left">
              <div className="leading-tight">
                {isEnabled ? `RESTORE ${selectedStationId}` : `🚨 SIMULATE FAULT ON ${selectedStationId}`}
              </div>
              <div className="text-[10px] font-normal opacity-80">
                {isEnabled ? "Clear stuck hardware clamp" : `Lock ${selectedMetric.toUpperCase()} channel`}
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
