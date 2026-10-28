import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Power,
  Radio,
  FastForward,
  Zap,
  Thermometer,
  Droplets,
  SlidersHorizontal,
  CloudRain,
  Flame,
  Wind,
  Phone,
  Smartphone,
  ShieldAlert,
  Send,
  Check,
  Edit2
} from "lucide-react";
import { simulateWeatherEmergency, clearWeatherEmergencies, sendTestSms, updateOperator } from "../services/api";

export const FaultControlBanner = ({
  stations = [],
  selectedStationId = "STN-003",
  onSelectStation,
  selectedMetric = "both",
  onSelectMetric,
  faultStatus,
  onToggleFault,
  onManualTick,
  loading,
  weatherEmergencies = {},
  onWeatherChange,
  onSmsSent
}) => {
  const currentStation = stations.find((s) => s.id === selectedStationId);
  const operator = currentStation?.operator;

  const [inchargePhone, setInchargePhone] = useState(operator?.phone || "");
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [testingSms, setTestingSms] = useState(false);
  const [smsToast, setSmsToast] = useState(null);
  const [phoneSavedToast, setPhoneSavedToast] = useState(null);

  // Sync incharge phone when selected station or operator updates
  useEffect(() => {
    if (operator?.phone) {
      setInchargePhone(operator.phone);
    }
  }, [selectedStationId, operator?.phone]);

  const currentStnFault = faultStatus?.stationFaults?.[selectedStationId] || {};
  const isFaultEnabled = currentStnFault?.enabled;
  const cycleCount = currentStnFault?.cycleCount || 0;
  const threshold = faultStatus?.thresholdCycles || 5;
  const isAnomalyTriggered = cycleCount >= threshold;

  const activeMetric = currentStnFault?.metric || selectedMetric;
  const activeWeather = weatherEmergencies?.[selectedStationId];

  const handleSavePhone = async () => {
    if (!inchargePhone || !inchargePhone.trim()) {
      alert("Please enter a valid mobile number.");
      return;
    }
    try {
      await updateOperator(selectedStationId, { phone: inchargePhone.trim() });
      setPhoneSavedToast("Mobile updated!");
      setTimeout(() => setPhoneSavedToast(null), 3000);
      if (onSmsSent) onSmsSent();
    } catch (err) {
      alert("Failed to update mobile number: " + err.message);
    }
  };

  const handleToggleClick = () => {
    if (!isFaultEnabled) {
      if (!inchargePhone || !inchargePhone.trim()) {
        const inputNum = window.prompt(
          `Enter mobile number for ${operator?.name || "Station Incharge"} (${selectedStationId}) to receive SMS alerts:`,
          operator?.phone || "+91 98401 23456"
        );
        if (!inputNum) return;
        setInchargePhone(inputNum);
        onToggleFault(selectedStationId, selectedMetric, inputNum.trim());
        return;
      }
    }
    onToggleFault(selectedStationId, selectedMetric, inchargePhone.trim());
  };

  const handleSimulateWeather = async (type) => {
    setWeatherLoading(true);
    try {
      if (type === "NONE") {
        await clearWeatherEmergencies();
      } else {
        let phoneToSend = inchargePhone.trim();
        if (!phoneToSend) {
          const inputNum = window.prompt(
            `Enter mobile number for ${operator?.name || "Station Incharge"} (${selectedStationId}) to receive SMS alerts:`,
            operator?.phone || "+91 98401 23456"
          );
          if (!inputNum) return;
          phoneToSend = inputNum.trim();
          setInchargePhone(phoneToSend);
        }
        await simulateWeatherEmergency(selectedStationId, type, phoneToSend);
      }
      if (onWeatherChange) onWeatherChange();
    } catch (err) {
      alert("Weather simulation error: " + err.message);
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleQuickTestSms = async () => {
    setTestingSms(true);
    try {
      const res = await sendTestSms(selectedStationId, inchargePhone.trim());
      if (res.success) {
        setSmsToast(`SMS Sent to ${inchargePhone}!`);
        setTimeout(() => setSmsToast(null), 3500);
        if (onSmsSent) onSmsSent();
      }
    } catch (err) {
      setSmsToast("SMS error");
      setTimeout(() => setSmsToast(null), 3000);
    } finally {
      setTestingSms(false);
    }
  };

  return (
    <div
      className={`rounded-2xl transition-all duration-300 border p-5 mb-6 relative overflow-hidden ${
        isFaultEnabled || activeWeather
          ? "bg-rose-50/50 border-rose-300 shadow-sm"
          : "bg-white border-zinc-200 shadow-sm"
      }`}
    >
      {/* Background subtle cyber pattern */}
      <div className="absolute top-0 right-0 w-96 h-full opacity-30 pointer-events-none cyber-grid" />

      {/* Row 1: Target Station Selector */}
      <div className="mb-4 pb-4 border-b border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div>
          <div className="flex items-center space-x-1.5 text-xs font-mono text-zinc-500 mb-1.5 font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-600" />
            <span>SELECT MONITORED STATION (FAULT WILL BE INJECTED ONLY IN THIS STATION ALONE):</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {stations.map((stn) => {
              const stnFault = faultStatus?.stationFaults?.[stn.id];
              const isStnFaulted = stnFault?.enabled;
              const hasWeatherEmergency = weatherEmergencies?.[stn.id];
              const isSelected = selectedStationId === stn.id;

              return (
                <button
                  key={stn.id}
                  onClick={() => onSelectStation(stn.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center space-x-1.5 border ${
                    isSelected
                      ? isStnFaulted || hasWeatherEmergency
                        ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                        : "bg-zinc-900 text-white border-zinc-900 shadow-sm"
                      : isStnFaulted || hasWeatherEmergency
                      ? "bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200"
                      : "bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200"
                  }`}
                >
                  {(isStnFaulted || hasWeatherEmergency) && (
                    <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                  )}
                  <span>{stn.code}</span>
                  <span className="text-[10px] font-normal opacity-80 hidden sm:inline">
                    ({stn.name.split(" ")[0]})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="text-zinc-500">Target Isolation:</span>
          <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            STRICT 1-STATION FOCUS
          </span>
        </div>
      </div>

      {/* Row 1B: Incharge Mobile Number Prompt & Quick Customization */}
      <div className="mb-4 p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-300 text-xs font-mono relative z-10 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-zinc-900 text-xs uppercase">
                  Station Incharge: {operator?.name || "Assigned Officer"}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-200 text-emerald-900 font-bold">
                  {selectedStationId} ONLY
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 mt-0.5">
                When a fault occurs on <strong>{currentStation?.name}</strong>, alert SMS will be sent <strong>ONLY to this individual mobile number</strong>.
              </p>
            </div>
          </div>

          {/* Individual Mobile Input */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={inchargePhone}
                onChange={(e) => setInchargePhone(e.target.value)}
                placeholder="+91 9840X XXXXX"
                className="pl-8 pr-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white font-mono font-bold text-xs text-zinc-900 w-48 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              onClick={handleSavePhone}
              title="Save incharge mobile number"
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition-colors flex items-center space-x-1 shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{phoneSavedToast || "Save"}</span>
            </button>

            <button
              onClick={handleQuickTestSms}
              disabled={testingSms}
              title="Send an immediate test alert SMS to this individual number via telecom carrier"
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition-colors flex items-center space-x-1 shadow-2xs"
            >
              <Send className="w-3 h-3 text-emerald-400" />
              <span>{testingSms ? "Sending..." : smsToast || "Send Test SMS"}</span>
            </button>

            {/* Direct Mobile Launchers */}
            <a
              href={`sms:${inchargePhone}?body=${encodeURIComponent(`🚨 [AERO-SENSE ALERT] Station ${selectedStationId} (${currentStation?.name}): SENSOR FAULT DETECTED. Immediate field inspection required. Operator: ${operator?.name}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Launch SMS app on phone or PC to transmit alert SMS immediately"
              className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors flex items-center space-x-1 shadow-2xs"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>📱 Open in Phone SMS</span>
            </a>

            <a
              href={`https://api.whatsapp.com/send?phone=${inchargePhone.replace(/[^0-9]/g, "")}&text=${encodeURIComponent(`🚨 [AERO-SENSE CRITICAL ALERT] Station ${selectedStationId} (${currentStation?.name}): SENSOR FAULT DETECTED. Incharge ${operator?.name}: Please execute immediate field recalibration.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Send alert message directly to this individual mobile on WhatsApp"
              className="px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1faa4e] text-white font-bold text-xs transition-colors flex items-center space-x-1 shadow-2xs"
            >
              <span>💬 WhatsApp to Mobile</span>
            </a>
          </div>
        </div>
      </div>

      {/* Row 2: Dual Simulation Triggers - [A: SENSOR FAULT] vs [B: SERIOUS WEATHER PROBLEM] */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4 border-b border-zinc-200 mb-4 relative z-10">
        {/* Trigger Pathway 1: Sensor Fault Inversion (ISOLATED TO SELECTED STATION ALONE) */}
        <div className="p-3.5 rounded-xl bg-white border border-zinc-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-900 text-white">
                TRIGGER PATHWAY 1
              </span>
              <h3 className="text-xs font-bold text-zinc-900">
                Hardware Sensor Fault (Isolated to {selectedStationId})
              </h3>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                isFaultEnabled
                  ? "bg-rose-100 text-rose-700 border-rose-300 animate-pulse"
                  : "bg-zinc-100 text-zinc-600 border-zinc-200"
              }`}
            >
              {isFaultEnabled ? "FAULT CLAMP ACTIVE" : "NORMAL TRANSDUCER"}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-lg p-1 bg-zinc-100 border border-zinc-200 text-xs font-mono">
              <button
                onClick={() => onSelectMetric("temperature")}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-colors ${
                  selectedMetric === "temperature"
                    ? "bg-white text-zinc-900 shadow-2xs font-bold"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Thermometer className="w-3 h-3" />
                <span>Temp</span>
              </button>
              <button
                onClick={() => onSelectMetric("humidity")}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-colors ${
                  selectedMetric === "humidity"
                    ? "bg-white text-zinc-900 shadow-2xs font-bold"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Droplets className="w-3 h-3" />
                <span>Humidity</span>
              </button>
              <button
                onClick={() => onSelectMetric("both")}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-md transition-colors ${
                  selectedMetric === "both"
                    ? "bg-white text-zinc-900 shadow-2xs font-bold"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <span>Dual</span>
              </button>
            </div>

            <button
              onClick={handleToggleClick}
              disabled={loading}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-xs ${
                isFaultEnabled
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-zinc-900 hover:bg-zinc-800 text-white"
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>
                {isFaultEnabled
                  ? `Clear Fault on ${selectedStationId}`
                  : `Inject Fault in ${selectedStationId} Alone (Alerts ${operator?.name})`}
              </span>
            </button>
          </div>

          {/* Interactive Flatline Streak Cycle Progress Bar */}
          {isFaultEnabled && (
            <div className="p-3 rounded-xl bg-rose-50/90 border border-rose-200/90 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <span className="text-zinc-600 font-bold uppercase text-[10px]">Flatline Streak:</span>
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded shadow-2xs ${
                      isAnomalyTriggered
                        ? "bg-rose-600 text-white animate-pulse"
                        : "bg-zinc-200 text-zinc-900 border border-zinc-300"
                    }`}
                  >
                    {cycleCount} / {threshold} Cycles
                  </span>
                </div>

                <button
                  onClick={onManualTick}
                  disabled={loading}
                  title="Step 1 cycle forward immediately to advance the fault streak"
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-900 hover:text-white border border-zinc-300 text-zinc-800 text-xs font-bold transition-all shadow-2xs active:scale-95"
                >
                  <FastForward className="w-3.5 h-3.5 text-zinc-600 group-hover:text-white" />
                  <span>Step Cycle (+1)</span>
                </button>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2.5 bg-zinc-200 rounded-full overflow-hidden border border-zinc-300">
                <div
                  className={`h-full transition-all duration-300 ${
                    isAnomalyTriggered ? "bg-rose-600" : "bg-zinc-800"
                  }`}
                  style={{
                    width: `${Math.min(100, (cycleCount / threshold) * 100)}%`
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono">
                {isAnomalyTriggered ? (
                  <span className="font-bold text-rose-700 flex items-center gap-1.5 animate-pulse">
                    <Zap className="w-3.5 h-3.5 text-rose-600" />
                    ANOMALY DETECTED ({cycleCount} CYCLES REACHED) • SMS SENT TO {inchargePhone}
                  </span>
                ) : (
                  <span className="text-zinc-600">
                    ⏳ {Math.max(0, threshold - cycleCount)} more cycles until zero-variance anomaly is flagged & SMS alerts incharge
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="text-[11px] text-zinc-500 font-mono">
            {isFaultEnabled ? (
              <span className="text-rose-700 font-semibold">
                ⚠️ Clamped at {currentStnFault.stuckTemperature}°C / {currentStnFault.stuckHumidity}%. SMS alert sent ONLY to incharge {operator?.name} ({inchargePhone}). Other stations remain nominal.
              </span>
            ) : (
              <span>Only {selectedStationId} ({currentStation?.name}) will freeze. All other stations continue normal fluctuations.</span>
            )}
          </div>
        </div>

        {/* Trigger Pathway 2: Serious Weather Problem Simulator (ISOLATED TO SELECTED STATION ALONE) */}
        <div className="p-3.5 rounded-xl bg-white border border-zinc-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-600 text-white">
                TRIGGER PATHWAY 2
              </span>
              <h3 className="text-xs font-bold text-zinc-900">
                Serious Weather Problem (Target: {selectedStationId} Alone)
              </h3>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                activeWeather
                  ? "bg-amber-100 text-amber-800 border-amber-300 animate-pulse"
                  : "bg-zinc-100 text-zinc-600 border-zinc-200"
              }`}
            >
              {activeWeather ? activeWeather.label : "WEATHER NORMAL"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => handleSimulateWeather("CYCLONE")}
              disabled={weatherLoading}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors"
            >
              <Wind className="w-3 h-3 text-amber-700" />
              <span>🌀 Cyclone Alert (992 hPa)</span>
            </button>

            <button
              onClick={() => handleSimulateWeather("HEATWAVE")}
              disabled={weatherLoading}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 transition-colors"
            >
              <Flame className="w-3 h-3 text-rose-700" />
              <span>🔥 Heatwave (42.4°C)</span>
            </button>

            <button
              onClick={() => handleSimulateWeather("FLOOD_STORM")}
              disabled={weatherLoading}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 transition-colors"
            >
              <CloudRain className="w-3 h-3 text-blue-700" />
              <span>🌧️ Cloudburst (98% RH)</span>
            </button>

            {activeWeather && (
              <button
                onClick={() => handleSimulateWeather("NONE")}
                disabled={weatherLoading}
                className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300 transition-colors"
              >
                Clear Weather
              </button>
            )}
          </div>

          <div className="text-[11px] text-zinc-500 font-mono">
            {activeWeather ? (
              <span className="text-amber-800 font-semibold">
                ⚠️ Emergency active: {activeWeather.label}. Alert SMS dispatched ONLY to incharge {operator?.name} ({inchargePhone}).
              </span>
            ) : (
              <span>Simulate weather disaster on {selectedStationId}. Alerts individual incharge {operator?.name} directly.</span>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Live Verification Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-zinc-600 relative z-10">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
          </span>
          <span>Station: <strong>{currentStation?.name} ({selectedStationId})</strong></span>
          <span>•</span>
          <span>Incharge: <strong>{operator?.name}</strong></span>
          <span>•</span>
          <span>Mobile: <strong>{inchargePhone || operator?.phone}</strong></span>
          <span>•</span>
          <span className="text-emerald-700 font-semibold">Single-Station Routing</span>
        </div>

        <button
          onClick={onManualTick}
          disabled={loading}
          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-300 font-mono text-xs w-fit"
        >
          <FastForward className="w-3.5 h-3.5 text-zinc-600" />
          <span>Advance Telemetry Tick</span>
        </button>
      </div>
    </div>
  );
};
