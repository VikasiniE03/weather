import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from "recharts";
import { TrendingUp, Info, Thermometer, Droplets } from "lucide-react";

export const TelemetryChart = ({
  comparisonData = [],
  faultStatus,
  targetId = "STN-003",
  targetStation,
  neighborIds = ["STN-004", "STN-005"],
  selectedMetric = "temperature",
  onSelectMetric
}) => {
  const stnFault = faultStatus?.stationFaults?.[targetId];
  const isFaultActive = stnFault?.enabled;
  const isMetricFaulted = isFaultActive && (stnFault.metric === selectedMetric || stnFault.metric === "both");

  const targetDataKey = selectedMetric === "humidity" ? `${targetId}_hum` : targetId;
  const avgDataKey = selectedMetric === "humidity" ? "neighborHumAvg" : "neighborAvg";

  const neighborColors = ["#10B981", "#A855F7", "#3B82F6", "#EC4899"];

  // Custom rich tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const targetVal = payload.find((p) => p.dataKey === targetDataKey)?.value;
    const neighborAvg = payload.find((p) => p.dataKey === avgDataKey)?.value;
    const diff =
      targetVal !== undefined && neighborAvg !== undefined
        ? Math.round((targetVal - neighborAvg) * 100) / 100
        : null;

    const unit = selectedMetric === "humidity" ? "%" : "°C";

    return (
      <div className="bg-[#0E1524]/95 border border-[#1F2E45] rounded-xl p-3 shadow-xl backdrop-blur-md text-xs font-mono">
        <div className="text-slate-400 border-b border-slate-800 pb-1.5 mb-2 flex justify-between items-center gap-2">
          <span className="font-bold text-white">CYCLE: {label}</span>
          {isMetricFaulted && (
            <span className="text-rose-400 font-bold px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-[10px]">
              {selectedMetric.toUpperCase()} STUCK FAULT
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          {payload.map((item) => (
            <div key={item.dataKey} className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-slate-300">
                  {item.dataKey === targetDataKey
                    ? `${targetId} (${targetStation?.name || "Target"})`
                    : item.dataKey === avgDataKey
                    ? "Neighbor Weighted Avg"
                    : `${item.dataKey.replace("_hum", "")} (Neighbor)`}
                </span>
              </div>
              <span className="font-bold text-white">
                {item.value !== undefined ? `${item.value?.toFixed(1)}${unit}` : "--"}
              </span>
            </div>
          ))}
        </div>

        {diff !== null && (
          <div className="mt-2.5 pt-2 border-t border-slate-800 flex justify-between text-[11px]">
            <span className="text-slate-400">Spatial Divergence:</span>
            <span
              className={`font-bold ${
                Math.abs(diff) > (selectedMetric === "humidity" ? 3 : 0.4)
                  ? "text-rose-400"
                  : "text-emerald-400"
              }`}
            >
              {diff > 0 ? `+${diff.toFixed(1)}${unit}` : `${diff.toFixed(1)}${unit}`}
            </span>
          </div>
        )}
      </div>
    );
  };

  const stuckRefValue =
    selectedMetric === "humidity" ? stnFault?.stuckHumidity : stnFault?.stuckTemperature;

  return (
    <div className="glass-panel rounded-2xl p-5 border border-[#1F2E45] mb-6">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Spatial-Temporal Comparative Time-Series:{" "}
              <span className="text-cyan-400">{targetStation?.name || targetId}</span>
            </h2>
            {isMetricFaulted && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold animate-pulse">
                ZERO-VARIANCE FLATLINE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-validating <span className="text-white font-mono font-bold">{targetId}</span> against nearest geodesic neighbors:{" "}
            {neighborIds.map((nId, idx) => (
              <span key={nId} className="font-mono font-bold text-slate-300 mr-2">
                {nId}
              </span>
            ))}
          </p>
        </div>

        {/* Metric Switcher: Temperature vs Humidity */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-mono mr-1">Channel:</span>
          <div className="inline-flex rounded-lg p-1 bg-slate-900 border border-slate-800 text-xs font-mono">
            <button
              onClick={() => onSelectMetric("temperature")}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md font-medium transition-colors ${
                selectedMetric === "temperature"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Thermometer className="w-3.5 h-3.5 text-rose-400" />
              <span>Temp (°C)</span>
            </button>
            <button
              onClick={() => onSelectMetric("humidity")}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md font-medium transition-colors ${
                selectedMetric === "humidity"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Droplets className="w-3.5 h-3.5 text-cyan-400" />
              <span>Humidity (%)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chart Visual Container */}
      <div className="h-80 w-full">
        {comparisonData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={comparisonData}
              margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2E45" opacity={0.6} />
              <XAxis
                dataKey="time"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                fontFamily="JetBrains Mono"
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                domain={["auto", "auto"]}
                fontFamily="JetBrains Mono"
                unit={selectedMetric === "humidity" ? "%" : "°"}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                wrapperStyle={{ fontSize: "11px", fontFamily: "JetBrains Mono" }}
              />

              {/* Reference line for stuck value if fault is active on this metric */}
              {isMetricFaulted && stuckRefValue !== undefined && (
                <ReferenceLine
                  y={stuckRefValue}
                  stroke="#F43F5E"
                  strokeDasharray="4 4"
                  label={{
                    value: `STUCK CLAMP: ${stuckRefValue}${selectedMetric === "humidity" ? "%" : "°C"}`,
                    fill: "#F43F5E",
                    fontSize: 10,
                    position: "right"
                  }}
                />
              )}

              {/* Target Station Line (Red if Faulted, Cyan if Normal) */}
              <Line
                type="monotone"
                dataKey={targetDataKey}
                name={`${targetId} (${targetStation?.name || "Target"})`}
                stroke={isMetricFaulted ? "#F43F5E" : "#06B6D4"}
                strokeWidth={isMetricFaulted ? 3.5 : 2.5}
                dot={false}
                activeDot={{ r: 6, stroke: "#FFFFFF", strokeWidth: 2 }}
                isAnimationActive={false}
              />

              {/* Nearest Neighbors Lines */}
              {neighborIds.map((nId, idx) => {
                const nDataKey = selectedMetric === "humidity" ? `${nId}_hum` : nId;
                const color = neighborColors[idx % neighborColors.length];

                return (
                  <Line
                    key={nId}
                    type="monotone"
                    dataKey={nDataKey}
                    name={`${nId} (Neighbor)`}
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                );
              })}

              {/* Synthetic IDW Neighbor Rolling Average Line */}
              <Line
                type="monotone"
                dataKey={avgDataKey}
                name="Neighbor Weighted IDW Expectation"
                stroke="#F59E0B"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500 font-mono text-sm">
            Acquiring telemetry streams for {targetId}...
          </div>
        )}
      </div>

      {/* Chart Footer Insight */}
      <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2 font-mono">
        <div className="flex items-center space-x-2">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            {isMetricFaulted ? (
              <span className="text-rose-300 font-semibold">
                ALERT: {targetId} {selectedMetric.toUpperCase()} is flatlined while perimeter neighbors exhibit natural atmospheric variance.
              </span>
            ) : (
              <span>
                Monitoring {targetId} on {selectedMetric.toUpperCase()} channel. Correlated with nearest geodesic neighbors.
              </span>
            )}
          </span>
        </div>
        <div className="text-slate-400">
          Inverse Distance Weighting: <span className="text-amber-400 font-semibold">p = 1.5</span>
        </div>
      </div>
    </div>
  );
};
