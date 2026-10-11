import React from "react";
import { StationCard } from "./StationCard";
import { Network } from "lucide-react";

export const StationGrid = ({
  stations,
  selectedStationId,
  onSelectStation,
  faultStatus
}) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Network className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Weather Station Telemetry Grid
          </h2>
          <span className="text-xs text-slate-500 font-mono hidden sm:inline">
            (All 5 Stations Monitored • Click Any Station to Inspect & Test)
          </span>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Click any card to select for fault injection & comparative graph
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {stations.map((stn) => (
          <StationCard
            key={stn.id}
            station={stn}
            isSelected={selectedStationId === stn.id}
            onSelect={onSelectStation}
            faultStatus={faultStatus}
          />
        ))}
      </div>
    </div>
  );
};
