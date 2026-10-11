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

  const neighborColors = ["#475569", "#64748B", "#94A3B8", "#334155"];

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
      <div className="bg-white border border-zinc-200 rounded-xl p-3 shadow-lg text-xs font-mono">
        <div className="text-zinc-500 border-b border-zinc-100 pb-1.5 mb-2 flex justify-between items-center gap-2">
          <span className="font-bold text-zinc-900">CYCLE: {label}</span>
          {isMetricFaulted && (
            <span className="text-rose-700 font-bold px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-[10px]">
              {selectedMetric.toUpperCase()} STUCK FAULT
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          {payload.map((item) => (
            <div key={item.dataKey} className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-zinc-600">
                  {item.dataKey === targetDataKey
                    ? `${targetId} (${targetStation?.name || "Target"})`
                    : item.dataKey === avgDataKey
                    ? "Neighbor Weighted Avg"
                    : `${item.dataKey.replace("_hum", "")} (Neighbor)`}
                </span>
              </div>
              <span className="font-bold text-zinc-900">
                {item.value !== undefined ? `${item.value?.toFixed(1)}${unit}` : "--"}
              </span>
            </div>
          ))}
        </div>

        {diff !== null && (
          <div className="mt-2.5 pt-2 border-t border-zinc-100 flex justify-between text-[11px]">
            <span className="text-zinc-500">Spatial Divergence:</span>
            <span
              className={`font-bold ${
                Math.abs(diff) > (selectedMetric === "humidity" ? 3 : 0.4)
                  ? "text-rose-600"
                  : "text-zinc-900"
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
    <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-sm mb-6">
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-zinc-700" />
            <h2 className="text-base font-bold text-zinc-900 tracking-tight">
              Spatial-Temporal Comparative Time-Series:{" "}
              <span className="text-zinc-900 font-extrabold">{targetStation?.name || targetId}</span>
            </h2>
            {isMetricFaulted && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold animate-pulse">
                ZERO-VARIANCE FLATLINE
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Cross-validating <span className="text-zinc-900 font-mono font-bold">{targetId}</span> against nearest geodesic neighbors:{" "}
            {neighborIds.map((nId, idx) => (
              <span key={nId} className="font-mono font-bold text-zinc-700 mr-2">
                {nId}
              </span>
            ))}
          </p>
        </div>

        {/* Metric Switcher: Temperature vs Humidity */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-zinc-500 font-mono mr-1">Channel:</span>
          <div className="inline-flex rounded-lg p-1 bg-zinc-100 border border-zinc-200 text-xs font-mono">
            <button
              onClick={() => onSelectMetric("temperature")}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md font-medium transition-colors ${
                selectedMetric === "temperature"
                  ? "bg-white text-zinc-900 shadow-xs border border-zinc-200 font-bold"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Thermometer className="w-3.5 h-3.5 text-zinc-700" />
              <span>Temp (°C)</span>
            </button>
            <button
              onClick={() => onSelectMetric("humidity")}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md font-medium transition-colors ${
                selectedMetric === "humidity"
                  ? "bg-white text-zinc-900 shadow-xs border border-zinc-200 font-bold"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Droplets className="w-3.5 h-3.5 text-zinc-700" />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" opacity={0.8} />
              <XAxis
                dataKey="time"
                stroke="#71717A"
                fontSize={11}
                tickLine={false}
                fontFamily="JetBrains Mono"
              />
              <YAxis
                stroke="#71717A"
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
                  stroke="#E11D48"
                  strokeDasharray="4 4"
                  label={{
                    value: `STUCK CLAMP: ${stuckRefValue}${selectedMetric === "humidity" ? "%" : "°C"}`,
                    fill: "#E11D48",
                    fontSize: 10,
                    position: "right"
                  }}
                />
              )}

              {/* Target Station Line (Red if Faulted, Deep Graphite if Normal) */}
              <Line
                type="monotone"
                dataKey={targetDataKey}
                name={`${targetId} (${targetStation?.name || "Target"})`}
                stroke={isMetricFaulted ? "#E11D48" : "#18181B"}
                strokeWidth={isMetricFaulted ? 3.5 : 2.5}
                dot={false}
                activeDot={{ r: 6, stroke: "#18181B", strokeWidth: 2 }}
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
                stroke="#A1A1AA"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-400 font-mono text-sm">
            Acquiring telemetry streams for {targetId}...
          </div>
        )}
      </div>

      {/* Chart Footer Insight */}
      <div className="mt-3 pt-3 border-t border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-zinc-500 gap-2 font-mono">
        <div className="flex items-center space-x-2">
          <Info className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
          <span>
            {isMetricFaulted ? (
              <span className="text-rose-700 font-semibold">
                ALERT: {targetId} {selectedMetric.toUpperCase()} is flatlined while perimeter neighbors exhibit natural atmospheric variance.
              </span>
            ) : (
              <span>
                Monitoring {targetId} on {selectedMetric.toUpperCase()} channel. Correlated with nearest geodesic neighbors.
              </span>
            )}
          </span>
        </div>
        <div className="text-zinc-500">
          Inverse Distance Weighting: <span className="text-zinc-800 font-semibold">p = 1.5</span>
        </div>
      </div>
    </div>
  );
};
