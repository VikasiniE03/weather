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
          ? "bg-rose-50/50 border-rose-200 shadow-sm"
          : "bg-white border-zinc-200 shadow-sm"
      }`}
    >
      {/* Background subtle texture */}
      <div className="absolute top-0 right-0 w-96 h-full opacity-40 pointer-events-none cyber-grid" />

      {/* Top Selector Bar: Station & Metric Selectors */}
      <div className="mb-4 pb-4 border-b border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        {/* Station Tabs */}
        <div>
          <div className="flex items-center space-x-1.5 text-xs font-mono text-zinc-500 mb-1.5 font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-600" />
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
                        ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                        : "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                      : isStnFaulted
                      ? "bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200"
                      : "bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200"
                  }`}
                >
                  {isStnFaulted && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
                  <span>{stn.code}</span>
                  <span className="text-[10px] font-normal opacity-80 hidden sm:inline">
                    ({stn.name.split(" ")[0]})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Metric Selector (Temperature, Humidity, Both) */}
        <div>
          <div className="flex items-center space-x-1.5 text-xs font-mono text-zinc-500 mb-1.5 font-medium">
            <span>TARGET SENSOR METRIC:</span>
          </div>
          <div className="inline-flex rounded-lg p-1 bg-zinc-100 border border-zinc-200 text-xs font-mono">
            <button
              onClick={() => onSelectMetric("temperature")}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedMetric === "temperature"
                  ? "bg-white text-zinc-900 shadow-xs border border-zinc-200 font-bold"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Thermometer className="w-3.5 h-3.5 text-zinc-700" />
              <span>Temperature</span>
            </button>
            <button
              onClick={() => onSelectMetric("humidity")}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedMetric === "humidity"
                  ? "bg-white text-zinc-900 shadow-xs border border-zinc-200 font-bold"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Droplets className="w-3.5 h-3.5 text-zinc-700" />
              <span>Humidity</span>
            </button>
            <button
              onClick={() => onSelectMetric("both")}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedMetric === "both"
                  ? "bg-white text-zinc-900 shadow-xs border border-zinc-200 font-bold"
                  : "text-zinc-600 hover:text-zinc-900"
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
                ? "bg-rose-100 border-rose-300 text-rose-600 animate-pulse"
                : "bg-zinc-100 border-zinc-200 text-zinc-700"
            }`}
          >
            {isEnabled ? <AlertTriangle className="w-7 h-7" /> : <Radio className="w-7 h-7" />}
          </div>

          <div>
            <div className="flex items-center space-x-2.5">
              <span className="text-xs uppercase font-mono tracking-wider font-semibold text-zinc-500">
                Active Station Target: {selectedStationId} ({currentStation?.name || "Target Node"})
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  isEnabled
                    ? "bg-rose-100 text-rose-700 border-rose-300 animate-pulse"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {isEnabled ? "FAULT ACTIVE" : "NOMINAL OPERATION"}
              </span>
            </div>

            <h2 className="text-lg font-bold text-zinc-900 mt-1 flex flex-wrap items-center gap-2">
              <span>{currentStation?.name}:</span>
              <span className={isEnabled ? "text-rose-600 font-mono" : "text-zinc-700 font-mono"}>
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

            <p className="text-xs text-zinc-600 mt-1 max-w-2xl leading-relaxed">
              {isEnabled ? (
                <>
                  Hardware fault simulated on <strong className="text-zinc-900">{currentStation?.name}</strong>. The 
                  sensor feed is frozen while all perimeter stations continue fluctuating. The AI engine runs zero-variance window detection and Haversine IDW neighbor spatial interpolation.
                </>
              ) : (
                <>
                  All sensor channels for <strong className="text-zinc-900">{currentStation?.name}</strong> are fluctuating with natural atmospheric noise. 
                  Click below to inject a stuck fault on Temperature, Humidity, or Both!
                </>
              )}
            </p>

            {/* Streak Progress Indicator */}
            {isEnabled && (
              <div className="mt-3.5 flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-1.5 text-xs font-mono">
                  <span className="text-zinc-500">Flatline Streak:</span>
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded ${
                      isAnomalyTriggered
                        ? "bg-rose-600 text-white animate-pulse"
                        : "bg-zinc-200 text-zinc-800 border border-zinc-300"
                    }`}
                  >
                    {cycleCount} / {threshold} Cycles
                  </span>
                </div>

                <div className="w-36 h-2 bg-zinc-200 rounded-full overflow-hidden border border-zinc-300">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isAnomalyTriggered ? "bg-rose-600" : "bg-zinc-800"
                    }`}
                    style={{
                      width: `${Math.min(100, (cycleCount / threshold) * 100)}%`
                    }}
                  />
                </div>

                {isAnomalyTriggered ? (
                  <span className="text-xs font-bold text-rose-600 flex items-center gap-1 animate-pulse">
                    <Zap className="w-3.5 h-3.5" />
                    ANOMALY DETECTED ({activeMetric.toUpperCase()} SENSOR STUCK)
                  </span>
                ) : (
                  <span className="text-xs text-zinc-500 font-mono">
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
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-zinc-50 active:scale-95 border border-zinc-300 text-xs font-medium text-zinc-700 transition-all shadow-xs"
            >
              <FastForward className="w-4 h-4 text-zinc-600" />
              <span>Step Next Cycle</span>
            </button>
          )}

          {/* Master Fault Injection Toggle Button */}
          <button
            onClick={() => onToggleFault(selectedStationId, selectedMetric)}
            disabled={loading}
            id="fault-toggle-button"
            className={`w-full sm:w-auto relative group flex items-center justify-center space-x-3 px-6 py-3.5 rounded-xl font-bold text-sm transition-all duration-200 active:scale-95 shadow-sm ${
              isEnabled
                ? "bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-300 hover:border-zinc-400"
                : "bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-900"
            }`}
          >
            <Power className={`w-5 h-5 ${isEnabled ? "text-rose-600" : "text-zinc-200"}`} />
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
