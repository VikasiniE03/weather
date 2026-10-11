import React from "react";
import { Thermometer, Droplets, Wind, AlertCircle, CheckCircle, Navigation, Radio, AlertTriangle } from "lucide-react";

export const StationCard = ({
  station,
  isSelected,
  onSelect,
  faultStatus
}) => {
  const reading = station.currentReading || {};
  const isAnomaly = station.status === "ANOMALY";
  const isWarning = station.status === "WARNING";
  const report = station.anomalyReport;

  // Station fault state
  const stnFault = faultStatus?.stationFaults?.[station.id];
  const isFaultInjected = stnFault?.enabled;

  const temp = reading.temperature ?? station.baseTemp;
  const hum = reading.humidity ?? station.baseHumidity;
  const press = reading.pressure ?? station.basePressure;

  const tempMetrics = report?.metrics?.temperature;
  const humMetrics = report?.metrics?.humidity;

  const isTempFault = report?.faultyMetrics?.includes("temperature");
  const isHumFault = report?.faultyMetrics?.includes("humidity");

  return (
    <div
      onClick={() => onSelect(station.id)}
      className={`rounded-xl p-4 transition-all duration-200 cursor-pointer border relative overflow-hidden ${
        isAnomaly
          ? "bg-gradient-to-b from-rose-950/40 to-slate-900/90 border-rose-500/60 shadow-glowRose"
          : isWarning
          ? "bg-slate-900/80 border-amber-500/40"
          : isSelected
          ? "bg-slate-900/90 border-cyan-500/60 shadow-glowCyan"
          : "glass-panel hover:border-slate-600 hover:bg-slate-900/60"
      }`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center space-x-1.5">
            <span
              className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                isSelected
                  ? "bg-cyan-950 text-cyan-300 border-cyan-400"
                  : "bg-slate-800 text-slate-300 border-slate-700"
              }`}
            >
              {station.code}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {station.zone}
            </span>
          </div>
          <h3 className="text-sm font-bold text-white mt-1.5 leading-snug">
            {station.name}
          </h3>
        </div>

        {/* Status Badge */}
        <div>
          {isAnomaly ? (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse">
              <AlertCircle className="w-3 h-3" />
              <span>
                {isTempFault && isHumFault
                  ? "DUAL ANOMALY"
                  : isHumFault
                  ? "HUMIDITY FAULT"
                  : "TEMP FAULT"}
              </span>
            </span>
          ) : isWarning ? (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <span>WATCH</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle className="w-3 h-3" />
              <span>NORMAL</span>
            </span>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="mt-4 grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80">
        {/* Temperature */}
        <div className={`text-center p-1 rounded ${isTempFault ? "bg-rose-950/60 border border-rose-500/40" : ""}`}>
          <div className="flex items-center justify-center space-x-1 text-slate-400 text-[11px]">
            <Thermometer className="w-3 h-3 text-rose-400" />
            <span>Temp</span>
          </div>
          <div className={`text-base font-extrabold font-mono mt-0.5 ${isTempFault ? "text-rose-400 animate-pulse" : "text-white"}`}>
            {temp ? `${temp.toFixed(1)}°` : "--"}
          </div>
        </div>

        {/* Humidity */}
        <div className={`text-center p-1 rounded border-x border-slate-800/80 ${isHumFault ? "bg-rose-950/60 border border-rose-500/40" : ""}`}>
          <div className="flex items-center justify-center space-x-1 text-slate-400 text-[11px]">
            <Droplets className="w-3 h-3 text-cyan-400" />
            <span>Humidity</span>
          </div>
          <div className={`text-base font-extrabold font-mono mt-0.5 ${isHumFault ? "text-rose-400 animate-pulse" : "text-white"}`}>
            {hum ? `${hum.toFixed(1)}%` : "--"}
          </div>
        </div>

        {/* Pressure */}
        <div className="text-center p-1">
          <div className="flex items-center justify-center space-x-1 text-slate-400 text-[11px]">
            <Wind className="w-3 h-3 text-indigo-400" />
            <span>Pressure</span>
          </div>
          <div className="text-base font-extrabold font-mono text-white mt-0.5">
            {press ? `${press.toFixed(0)}` : "--"}
          </div>
        </div>
      </div>

      {/* Anomaly Diagnostic Details Banner if Anomaly */}
      {isAnomaly && report && (
        <div className="mt-2.5 p-2 rounded-lg bg-rose-950/60 border border-rose-500/40 text-[10px] font-mono space-y-1">
          <div className="flex justify-between text-rose-300 font-bold">
            <span>CONFIDENCE: {report.confidence}%</span>
            <span>STREAK: {report.consecutiveStuckCycles} CYCLES</span>
          </div>
          {isTempFault && tempMetrics && (
            <div className="flex justify-between text-slate-300">
              <span>Temp Clamped: {tempMetrics.currentValue}°C</span>
              <span>Exp: {tempMetrics.expectedValue}°C (Δ{tempMetrics.divergence}°)</span>
            </div>
          )}
          {isHumFault && humMetrics && (
            <div className="flex justify-between text-slate-300">
              <span>Hum Clamped: {humMetrics.currentValue}%</span>
              <span>Exp: {humMetrics.expectedValue}% (Δ{humMetrics.divergence}%)</span>
            </div>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <div className="flex items-center space-x-1">
          <Navigation className="w-3 h-3 text-slate-500" />
          <span>{station.lat.toFixed(3)}, {station.lon.toFixed(3)}</span>
        </div>
        <div className="text-[10px] text-slate-400">
          {isSelected ? (
            <span className="text-cyan-400 font-bold">★ Active Target</span>
          ) : (
            <span>Click to select</span>
          )}
        </div>
      </div>
    </div>
  );
};
