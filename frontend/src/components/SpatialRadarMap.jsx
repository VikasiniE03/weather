import React, { useState } from "react";
import { Compass, Radio, ShieldAlert } from "lucide-react";

export const SpatialRadarMap = ({ stations = [], faultStatus, selectedStationId = "STN-003" }) => {
  const [hoveredStation, setHoveredStation] = useState(null);

  // Normalized bounds for Chennai coordinates
  const minLat = 12.97;
  const maxLat = 13.095;
  const minLon = 80.21;
  const maxLon = 80.28;

  const toSvgCoords = (lat, lon) => {
    const y = 85 - ((lat - minLat) / (maxLat - minLat)) * 70;
    const x = 15 + ((lon - minLon) / (maxLon - minLon)) * 70;
    return { x: Math.max(10, Math.min(90, x)), y: Math.max(10, Math.min(90, y)) };
  };

  const targetStation = stations.find((s) => s.id === selectedStationId) || stations[0];
  const targetCoords = targetStation
    ? toSvgCoords(targetStation.lat, targetStation.lon)
    : { x: 45, y: 55 };

  const targetFault = faultStatus?.stationFaults?.[selectedStationId];
  const isTargetFaulted = targetFault?.enabled;

  return (
    <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-sm mb-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Compass className="w-4 h-4 text-zinc-700" />
          <h2 className="text-base font-bold text-zinc-900 tracking-tight">
            Spatial Geodesic Topology
          </h2>
          <span className="text-xs text-zinc-500 font-mono hidden sm:inline">
            (Centered on: {selectedStationId})
          </span>
        </div>
        <div className="text-xs font-mono text-zinc-700 bg-zinc-100 px-2.5 py-1 rounded-full border border-zinc-200 flex items-center space-x-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-zinc-800 animate-ping" />
          <span>Haversine: 15 km</span>
        </div>
      </div>

      {/* SVG Radar Map Layout */}
      <div className="relative w-full h-72 sm:h-80 bg-zinc-50 rounded-xl border border-zinc-200 overflow-hidden flex items-center justify-center">
        {/* Background Coordinate Concentric Circles */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
          <div className="w-48 h-48 rounded-full border border-zinc-300" />
          <div className="w-72 h-72 rounded-full border border-zinc-300 absolute" />
          <div className="w-96 h-96 rounded-full border border-zinc-200 absolute" />
          <div className="w-full h-px bg-zinc-200 absolute" />
          <div className="h-full w-px bg-zinc-200 absolute" />
        </div>

        {/* SVG Drawing Layer: Dynamic distance lines from selected station */}
        <svg className="w-full h-full absolute inset-0 pointer-events-none" viewBox="0 0 100 100">
          {stations.map((stn) => {
            if (stn.id === selectedStationId) return null;
            const coords = toSvgCoords(stn.lat, stn.lon);
            return (
              <g key={`link-${stn.id}`}>
                <line
                  x1={targetCoords.x}
                  y1={targetCoords.y}
                  x2={coords.x}
                  y2={coords.y}
                  stroke={isTargetFaulted ? "#E11D48" : "#71717A"}
                  strokeWidth="0.8"
                  strokeDasharray="1.5 1.5"
                  opacity={isTargetFaulted ? 0.8 : 0.4}
                />
              </g>
            );
          })}
        </svg>

        {/* Interactive Station Nodes */}
        {stations.map((stn) => {
          const coords = toSvgCoords(stn.lat, stn.lon);
          const isTarget = stn.id === selectedStationId;
          const isAnomaly = stn.status === "ANOMALY";
          const stnFault = faultStatus?.stationFaults?.[stn.id];
          const isFaulted = stnFault?.enabled;
          const distToTarget = targetStation?.distanceMatrix?.[stn.id] || 0;

          return (
            <div
              key={stn.id}
              style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer pointer-events-auto group z-20"
              onMouseEnter={() => setHoveredStation(stn)}
              onMouseLeave={() => setHoveredStation(null)}
            >
              {/* Concentric Ripple Ping on Faulted or Anomaly Nodes */}
              {(isAnomaly || isFaulted) && (
                <div className="absolute -inset-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-60" />
                  <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-rose-600/30" />
                </div>
              )}

              {/* Station Node Badge */}
              <div
                className={`relative flex items-center justify-center p-2 rounded-xl transition-transform group-hover:scale-125 shadow-sm border ${
                  isAnomaly || isFaulted
                    ? "bg-rose-600 border-rose-600 text-white"
                    : isTarget
                    ? "bg-zinc-900 border-zinc-900 text-white"
                    : "bg-white border-zinc-300 text-zinc-700 group-hover:border-zinc-500"
                }`}
              >
                {isAnomaly || isFaulted ? (
                  <ShieldAlert className="w-4 h-4 text-white" />
                ) : (
                  <Radio className={`w-3.5 h-3.5 ${isTarget ? "text-white" : "text-zinc-600"}`} />
                )}
              </div>

              {/* Permanent Station Code Label */}
              <div
                className={`absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono px-1.5 py-0.5 rounded font-bold border transition-colors shadow-xs ${
                  isAnomaly || isFaulted
                    ? "bg-rose-600 text-white border-rose-600"
                    : isTarget
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-white text-zinc-700 border-zinc-200 group-hover:border-zinc-400"
                }`}
              >
                {stn.code}
                {!isTarget && distToTarget > 0 && (
                  <span className="text-[9px] text-zinc-400 ml-1 font-normal">
                    ({distToTarget}km)
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Hover Station Floating Card */}
        {hoveredStation && (
          <div className="absolute bottom-3 left-3 bg-white border border-zinc-200 rounded-xl p-3 shadow-xl text-xs font-mono pointer-events-none z-30 min-w-[200px]">
            <div className="text-zinc-900 font-bold flex justify-between">
              <span>{hoveredStation.code} - {hoveredStation.name}</span>
            </div>
            <div className="text-zinc-500 text-[10px]">{hoveredStation.zone}</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-zinc-800 border-t border-zinc-100 pt-1.5">
              <div>
                Temp: <span className="font-bold text-zinc-900">{hoveredStation.currentReading?.temperature?.toFixed(1)}°C</span>
              </div>
              <div>
                Hum: <span className="font-bold text-zinc-900">{hoveredStation.currentReading?.humidity?.toFixed(0)}%</span>
              </div>
            </div>
            <div className="mt-1 text-[10px] text-zinc-400">
              Coordinates: {hoveredStation.lat.toFixed(4)}°N, {hoveredStation.lon.toFixed(4)}°E
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500 font-mono">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-900" />
            <span className="text-zinc-700 font-medium">Selected ({selectedStationId})</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
            <span>Perimeter Neighbors</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
            <span className="text-rose-700 font-medium">Active Fault</span>
          </div>
        </div>
        <div className="text-zinc-500">
          Geodesic: <span className="text-zinc-800 font-semibold">WGS-84 Sphere</span>
        </div>
      </div>
    </div>
  );
};
