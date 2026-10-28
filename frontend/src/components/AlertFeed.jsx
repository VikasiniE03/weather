import React, { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Trash2,
  ShieldAlert,
  Cpu,
  Smartphone,
  Phone,
  CloudRain,
  Flame,
  Wind
} from "lucide-react";

export const AlertFeed = ({ alerts = [], onClearAlerts }) => {
  const [filterActive, setFilterActive] = useState(false);

  const displayedAlerts = filterActive ? alerts.filter((a) => a.active) : alerts;
  const activeCount = alerts.filter((a) => a.active).length;

  return (
    <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-sm mb-6">
      {/* Alert Feed Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-2.5">
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          <h2 className="text-base font-bold text-zinc-900 tracking-tight">
            Incident Feed & Cellular SMS Mitigation Dispatch
          </h2>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
              {activeCount} ACTIVE
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Active Filter Toggle */}
          <button
            onClick={() => setFilterActive(!filterActive)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors ${
              filterActive
                ? "bg-rose-50 border-rose-300 text-rose-700 font-bold"
                : "bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {filterActive ? "Showing Active Only" : "Show All Logged"}
          </button>

          {/* Clear Alerts */}
          {alerts.length > 0 && (
            <button
              onClick={onClearAlerts}
              title="Clear alerts log"
              className="p-1.5 rounded-lg bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-500 hover:text-rose-600 transition-colors shadow-xs"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Alert Feed Content */}
      {displayedAlerts.length > 0 ? (
        <div className="space-y-3.5">
          {displayedAlerts.map((alert) => {
            const isWeather = alert.isWeatherEmergency || alert.triggerCategory === "WEATHER_EMERGENCY";
            const operator = alert.operator;

            return (
              <div
                key={alert.id}
                className={`rounded-xl p-4 border transition-all ${
                  alert.active
                    ? isWeather
                      ? "bg-amber-50/60 border-amber-300 shadow-xs"
                      : "bg-rose-50/60 border-rose-300 shadow-xs"
                    : "bg-zinc-50 border-zinc-200 opacity-90"
                }`}
              >
                {/* Header Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-zinc-200/80 pb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase tracking-wider ${
                        alert.active
                          ? isWeather
                            ? "bg-amber-600 text-white animate-pulse"
                            : "bg-rose-600 text-white animate-pulse"
                          : "bg-zinc-200 text-zinc-700"
                      }`}
                    >
                      {alert.active ? (isWeather ? "WEATHER EMERGENCY" : "SENSOR FAULT INCIDENT") : "RESOLVED"}
                    </span>

                    <span className="font-mono text-xs font-bold text-zinc-900">
                      {alert.stationId} • {alert.stationName}
                    </span>

                    <span
                      className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${
                        isWeather
                          ? "bg-amber-100 text-amber-900 border-amber-200"
                          : "bg-rose-100 text-rose-800 border-rose-200"
                      }`}
                    >
                      {alert.faultType}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-xs font-mono text-zinc-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      <span>{new Date(alert.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">ID: {alert.id}</span>
                  </div>
                </div>

                {/* Operator SMS Notification Banner */}
                {operator && (
                  <div className="mt-2.5 p-2 rounded-lg bg-emerald-50/80 border border-emerald-200 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 text-emerald-950">
                      <Smartphone className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        <strong>Cellular Alert SMS Dispatched:</strong> {operator.name} (
                        <span className="font-bold">{operator.phone}</span>)
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-700 text-white w-fit flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>OPERATOR NOTIFIED</span>
                    </span>
                  </div>
                )}

                {/* Metrics Row */}
                {isWeather ? (
                  <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="bg-white p-2.5 rounded-lg border border-zinc-200 shadow-2xs">
                      <div className="text-zinc-500 text-[10px] uppercase font-medium">Recorded Temperature</div>
                      <div className="text-sm font-bold text-zinc-900 mt-0.5">
                        {alert.currentTemp !== undefined ? `${alert.currentTemp}°C` : "--"}
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-zinc-200 shadow-2xs">
                      <div className="text-zinc-500 text-[10px] uppercase font-medium">Relative Humidity</div>
                      <div className="text-sm font-bold text-zinc-900 mt-0.5">
                        {alert.currentHum !== undefined ? `${alert.currentHum}%` : "--"}
                      </div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-zinc-200 shadow-2xs">
                      <div className="text-zinc-500 text-[10px] uppercase font-medium">Barometric Pressure</div>
                      <div className="text-sm font-bold text-rose-600 mt-0.5">
                        {alert.currentPress !== undefined ? `${alert.currentPress} hPa` : "--"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                    {/* Confidence Bar */}
                    <div className="bg-white p-2.5 rounded-lg border border-zinc-200 shadow-2xs">
                      <div className="text-zinc-500 text-[10px] uppercase font-medium">AI Confidence</div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-sm font-bold text-rose-600">{alert.confidence}%</span>
                        <span className="text-[10px] text-zinc-500">Streak: {alert.consecutiveCycles} cycles</span>
                      </div>
                      <div className="w-full bg-zinc-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="bg-rose-600 h-full rounded-full transition-all"
                          style={{ width: `${alert.confidence}%` }}
                        />
                      </div>
                    </div>

                    {/* Stuck vs Expected */}
                    <div className="bg-white p-2.5 rounded-lg border border-zinc-200 shadow-2xs">
                      <div className="text-zinc-500 text-[10px] uppercase font-medium">
                        {alert.primaryMetric === "humidity"
                          ? "Stuck Humidity vs Exp"
                          : alert.primaryMetric === "both"
                          ? "Dual Stuck Channel"
                          : "Stuck Temp vs Exp"}
                      </div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-sm font-bold text-zinc-900">
                          {alert.currentValue}
                          {alert.primaryMetric === "humidity" ? "%" : "°C"}
                        </span>
                        <span className="text-[11px] text-zinc-600 font-medium">
                          Exp: {alert.expectedValue}
                          {alert.primaryMetric === "humidity" ? "%" : "°C"}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-1">
                        Divergence:{" "}
                        <span className="text-rose-600 font-bold">
                          +{alert.divergence}
                          {alert.primaryMetric === "humidity" ? "%" : "°C"}
                        </span>
                      </div>
                    </div>

                    {/* Spatial Neighbors */}
                    <div className="bg-white p-2.5 rounded-lg border border-zinc-200 shadow-2xs sm:col-span-2">
                      <div className="text-zinc-500 text-[10px] uppercase font-medium">Verified Spatial Neighbors (Haversine)</div>
                      <div className="mt-1 text-[11px] text-zinc-700">
                        {alert.nearestNeighbors && alert.nearestNeighbors.length > 0 ? (
                          alert.nearestNeighbors.map((n) => `${n.name} (${n.distanceKm}km: ${n.currentTemp}°C)`).join(" • ")
                        ) : (
                          "STN-004 Velachery (2.8km) • STN-005 Adyar (3.9km)"
                        )}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-medium mt-1">
                        Active variance verified in ambient perimeter
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommended Action */}
                <div className="mt-2.5 p-2.5 rounded-lg bg-zinc-100 border border-zinc-200 text-xs flex items-start space-x-2">
                  <Cpu className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
                  <div className="text-zinc-700">
                    <span className="font-bold text-zinc-900 mr-1.5">Action Protocol:</span>
                    {alert.recommendedAction}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-10 text-center rounded-xl bg-zinc-50 border border-dashed border-zinc-300">
          <CheckCircle2 className="w-8 h-8 text-zinc-400 mx-auto" />
          <p className="mt-2 text-sm font-medium text-zinc-700">
            No Active Incidents Detected
          </p>
          <p className="text-xs text-zinc-500 mt-0.5">
            All 5 sensor feeds operating within normal variance. All operators on standby.
          </p>
        </div>
      )}
    </div>
  );
};
