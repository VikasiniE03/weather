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
          ? "bg-rose-50/70 border-2 border-rose-400 shadow-md"
          : isWarning
          ? "bg-amber-50/70 border border-amber-300 shadow-xs"
          : isSelected
          ? "bg-white border-2 border-zinc-900 shadow-md"
          : "bg-white border border-zinc-200 hover:border-zinc-300 hover:shadow-md shadow-xs"
      }`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center space-x-1.5">
            <span
              className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                isSelected
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : "bg-zinc-100 text-zinc-700 border-zinc-200"
              }`}
            >
              {station.code}
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              {station.zone}
            </span>
          </div>
          <h3 className="text-sm font-bold text-zinc-900 mt-1.5 leading-snug">
            {station.name}
          </h3>
        </div>

        {/* Status Badge */}
        <div>
          {isAnomaly ? (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300 animate-pulse">
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
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <span>WATCH</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle className="w-3 h-3" />
              <span>NORMAL</span>
            </span>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="mt-4 grid grid-cols-3 gap-2 py-2 border-y border-zinc-200">
        {/* Temperature */}
        <div className={`text-center p-1 rounded ${isTempFault ? "bg-rose-100/60 border border-rose-300" : ""}`}>
          <div className="flex items-center justify-center space-x-1 text-zinc-500 text-[11px]">
            <Thermometer className="w-3 h-3 text-zinc-600" />
            <span>Temp</span>
          </div>
          <div className={`text-base font-extrabold font-mono mt-0.5 ${isTempFault ? "text-rose-600 animate-pulse" : "text-zinc-900"}`}>
            {temp ? `${temp.toFixed(1)}°` : "--"}
          </div>
        </div>

        {/* Humidity */}
        <div className={`text-center p-1 rounded border-x border-zinc-200 ${isHumFault ? "bg-rose-100/60 border border-rose-300" : ""}`}>
          <div className="flex items-center justify-center space-x-1 text-zinc-500 text-[11px]">
            <Droplets className="w-3 h-3 text-zinc-600" />
            <span>Humidity</span>
          </div>
          <div className={`text-base font-extrabold font-mono mt-0.5 ${isHumFault ? "text-rose-600 animate-pulse" : "text-zinc-900"}`}>
            {hum ? `${hum.toFixed(1)}%` : "--"}
          </div>
        </div>

        {/* Pressure */}
        <div className="text-center p-1">
          <div className="flex items-center justify-center space-x-1 text-zinc-500 text-[11px]">
            <Wind className="w-3 h-3 text-zinc-600" />
            <span>Pressure</span>
          </div>
          <div className="text-base font-extrabold font-mono text-zinc-900 mt-0.5">
            {press ? `${press.toFixed(0)}` : "--"}
          </div>
        </div>
      </div>

      {/* Anomaly Diagnostic Details Banner if Anomaly */}
      {isAnomaly && report && (
        <div className="mt-2.5 p-2 rounded-lg bg-rose-100/70 border border-rose-300 text-[10px] font-mono space-y-1">
          <div className="flex justify-between text-rose-800 font-bold">
            <span>CONFIDENCE: {report.confidence}%</span>
            <span>STREAK: {report.consecutiveStuckCycles} CYCLES</span>
          </div>
          {isTempFault && tempMetrics && (
            <div className="flex justify-between text-zinc-700">
              <span>Temp Clamped: {tempMetrics.currentValue}°C</span>
              <span>Exp: {tempMetrics.expectedValue}°C (Δ{tempMetrics.divergence}°)</span>
            </div>
          )}
          {isHumFault && humMetrics && (
            <div className="flex justify-between text-zinc-700">
              <span>Hum Clamped: {humMetrics.currentValue}%</span>
              <span>Exp: {humMetrics.expectedValue}% (Δ{humMetrics.divergence}%)</span>
            </div>
          )}
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-2.5 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
        <div className="flex items-center space-x-1">
          <Navigation className="w-3 h-3 text-zinc-400" />
          <span>{station.lat.toFixed(3)}, {station.lon.toFixed(3)}</span>
        </div>
        <div className="text-[10px] text-zinc-500">
          {isSelected ? (
            <span className="text-zinc-900 font-bold">★ Active Target</span>
          ) : (
            <span>Click to select</span>
          )}
        </div>
      </div>
    </div>
  );
};
