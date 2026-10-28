import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Thermometer,
  Droplets,
  Wind,
  AlertCircle,
  CheckCircle,
  Navigation,
  Radio,
  AlertTriangle,
  Phone,
  Send,
  User,
  Smartphone,
  Edit2,
  Check,
  X,
  ExternalLink
} from "lucide-react";
import { sendTestSms, updateOperator } from "../services/api";

export const StationCard = ({
  station,
  isSelected,
  onSelect,
  faultStatus,
  onSmsSent
}) => {
  const navigate = useNavigate();
  const [sendingSms, setSendingSms] = useState(false);
  const [smsFeedback, setSmsFeedback] = useState(null);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editedPhone, setEditedPhone] = useState(station.operator?.phone || "");
  const [savingPhone, setSavingPhone] = useState(false);

  useEffect(() => {
    if (station.operator?.phone) {
      setEditedPhone(station.operator.phone);
    }
  }, [station.operator?.phone]);

  const reading = station.currentReading || {};
  const isAnomaly = station.status === "ANOMALY";
  const isWarning = station.status === "WARNING";
  const report = station.anomalyReport;
  const operator = station.operator;
  const weatherReport = station.weatherReport;

  // Station fault state
  const stnFault = faultStatus?.stationFaults?.[station.id];
  const isFaultInjected = stnFault?.enabled;
  const anyOtherFaulted = Object.values(faultStatus?.stationFaults || {}).some(
    (f) => f.enabled && f.stationId !== station.id
  );

  const temp = reading.temperature ?? station.baseTemp;
  const hum = reading.humidity ?? station.baseHumidity;
  const press = reading.pressure ?? station.basePressure;

  const tempMetrics = report?.metrics?.temperature;
  const humMetrics = report?.metrics?.humidity;

  const isTempFault = report?.faultyMetrics?.includes("temperature");
  const isHumFault = report?.faultyMetrics?.includes("humidity");
  const isWeatherEmergency = weatherReport?.isEmergency;

  const handleSavePhone = async (e) => {
    e.stopPropagation();
    if (!editedPhone || !editedPhone.trim()) {
      alert("Please enter a valid mobile number.");
      return;
    }
    setSavingPhone(true);
    try {
      await updateOperator(station.id, { phone: editedPhone.trim() });
      setIsEditingPhone(false);
      setSmsFeedback("Phone Updated!");
      setTimeout(() => setSmsFeedback(null), 3000);
      if (onSmsSent) onSmsSent();
    } catch (err) {
      alert("Failed to update mobile: " + err.message);
    } finally {
      setSavingPhone(false);
    }
  };

  const handleSendTestSms = async (e) => {
    e.stopPropagation();
    setSendingSms(true);
    try {
      const res = await sendTestSms(station.id, editedPhone.trim());
      if (res.success) {
        setSmsFeedback("SMS Sent!");
        setTimeout(() => setSmsFeedback(null), 3000);
        if (onSmsSent) onSmsSent();
      }
    } catch (err) {
      setSmsFeedback("Failed");
      setTimeout(() => setSmsFeedback(null), 3000);
    } finally {
      setSendingSms(false);
    }
  };

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

        {/* Status Badge and Dashboard Navigation */}
        <div className="flex flex-col items-end gap-1">
          {isAnomaly ? (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300 animate-pulse">
              <AlertCircle className="w-3 h-3" />
              <span>
                {isWeatherEmergency
                  ? weatherReport?.label || "WEATHER ALERT"
                  : isTempFault && isHumFault
                  ? "DUAL ANOMALY"
                  : isHumFault
                  ? "HUMIDITY FAULT"
                  : "TEMP FAULT"}
              </span>
            </span>
          ) : isFaultInjected ? (
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span>CYCLE {stnFault?.cycleCount || 0}/{faultStatus?.thresholdCycles || 5}</span>
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

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/station/${station.id}`);
            }}
            className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-zinc-900 hover:bg-zinc-800 active:scale-95 text-white transition-all shadow-xs"
            title={`Open individual dashboard for ${station.name}`}
          >
            <span>Dashboard</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="mt-3.5 grid grid-cols-3 gap-2 py-2 border-y border-zinc-200">
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
        <div className={`text-center p-1 ${reading.pressure <= 998 ? "bg-rose-100/60 rounded border border-rose-300" : ""}`}>
          <div className="flex items-center justify-center space-x-1 text-zinc-500 text-[11px]">
            <Wind className="w-3 h-3 text-zinc-600" />
            <span>Pressure</span>
          </div>
          <div className={`text-base font-extrabold font-mono mt-0.5 ${reading.pressure <= 998 ? "text-rose-600 animate-pulse" : "text-zinc-900"}`}>
            {press ? `${press.toFixed(0)}` : "--"}
          </div>
        </div>
      </div>

      {/* Operator Details & Direct SMS Card with Inline Mobile Editing */}
      {operator && (
        <div className="mt-3 p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/90 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center font-bold text-[10px]">
                {operator.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
              </div>
              <div>
                <div className="font-bold text-zinc-900 text-[11px] leading-tight">
                  {operator.name}
                </div>
                {!isEditingPhone ? (
                  <div className="text-[10px] text-zinc-500 font-mono flex items-center space-x-1">
                    <Phone className="w-2.5 h-2.5 text-emerald-600" />
                    <span>{operator.phone}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingPhone(true);
                      }}
                      title="Edit Incharge Mobile Number"
                      className="text-zinc-400 hover:text-zinc-800 ml-1"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {!isEditingPhone && (
              <button
                onClick={handleSendTestSms}
                disabled={sendingSms}
                title="Dispatch immediate test SMS alert to this operator alone"
                className="px-2 py-1 rounded text-[10px] font-mono font-medium bg-white hover:bg-zinc-900 hover:text-white border border-zinc-300 text-zinc-700 transition-colors flex items-center space-x-1 shadow-2xs"
              >
                <Smartphone className="w-2.5 h-2.5" />
                <span>{sendingSms ? "..." : smsFeedback || "Test SMS"}</span>
              </button>
            )}
          </div>

          {/* Inline Phone Edit Mode */}
          {isEditingPhone && (
            <div className="mt-2 pt-2 border-t border-zinc-200 flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editedPhone}
                onChange={(e) => setEditedPhone(e.target.value)}
                placeholder="+91 9840X XXXXX"
                className="px-2 py-1 rounded border border-emerald-400 font-mono text-[11px] text-zinc-900 bg-white w-full focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                onClick={handleSavePhone}
                disabled={savingPhone}
                title="Save mobile number"
                className="p-1 rounded bg-zinc-900 text-white hover:bg-zinc-800 text-[10px] font-mono"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditedPhone(operator.phone);
                  setIsEditingPhone(false);
                }}
                title="Cancel"
                className="p-1 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 text-[10px]"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Anomaly Diagnostic Details Banner with STRICT ISOLATION BADGE */}
      {isAnomaly && (
        <div className="mt-2.5 p-2 rounded-lg bg-rose-100/70 border border-rose-300 text-[10px] font-mono space-y-1">
          <div className="flex items-center justify-between text-rose-900 font-bold">
            <span>🚨 ALERT SENT ONLY TO THIS INCHARGE</span>
            <span className="px-1.5 py-0.2 rounded bg-rose-200 text-rose-800 text-[9px]">
              SINGLE-STATION ISOLATION
            </span>
          </div>

          {operator && (
            <div className="text-[10px] text-zinc-800 font-mono space-y-0.5">
              <div className="flex items-center space-x-1">
                <span className="text-zinc-600">Recipient:</span>
                <span className="font-bold text-zinc-900">{operator.name}</span>
                <span className="text-zinc-600">({operator.phone})</span>
              </div>
              <div className="text-[9px] text-emerald-800 font-medium">
                ✓ No other stations alerted. Telemetry isolated to {station.name}.
              </div>

              {/* Direct Mobile Launchers */}
              <div className="pt-1 flex items-center space-x-1.5">
                <a
                  href={`sms:${operator.phone}?body=${encodeURIComponent(`🚨 [AERO-SENSE ALERT] ${station.name} (${station.id}): SENSOR FAULT. Action required: Incharge ${operator.name} field inspection.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Send directly from your mobile SMS messenger"
                  className="px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[9px] flex items-center space-x-1"
                >
                  <Smartphone className="w-2.5 h-2.5" />
                  <span>📱 Phone SMS</span>
                </a>
                <a
                  href={`https://api.whatsapp.com/send?phone=${operator.phone.replace(/[^0-9]/g, "")}&text=${encodeURIComponent(`🚨 [AERO-SENSE ALERT] ${station.name} (${station.id}): SENSOR FAULT. Action required: Incharge ${operator.name} field inspection.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Send directly to this mobile on WhatsApp"
                  className="px-2 py-0.5 rounded bg-[#25D366] hover:bg-[#1faa4e] text-white font-bold text-[9px] flex items-center space-x-1"
                >
                  <span>💬 WhatsApp</span>
                </a>
              </div>
            </div>
          )}

          {isWeatherEmergency ? (
            <div className="text-rose-800 font-medium text-[10px]">
              {weatherReport?.label}: {weatherReport?.description}
            </div>
          ) : report ? (
            <>
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
            </>
          ) : null}
        </div>
      )}

      {/* Reassurance badge when other station is faulted and this station is normal */}
      {!isAnomaly && anyOtherFaulted && (
        <div className="mt-2 p-1.5 rounded-md bg-emerald-50 border border-emerald-200 text-[9px] font-mono text-emerald-800 flex items-center justify-between">
          <span>✓ Nominal Sensor Fluctuations</span>
          <span className="font-semibold">0 Alerts to {operator?.name?.split(" ")[0]}</span>
        </div>
      )}

      {/* Footer Coordinates & Selection */}
      <div className="mt-2.5 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
        <div className="flex items-center space-x-1">
          <Navigation className="w-3 h-3 text-zinc-400" />
          <span>{station.lat.toFixed(3)}, {station.lon.toFixed(3)}</span>
        </div>
        <div className="flex items-center space-x-2 text-[10px]">
          {isSelected ? (
            <span className="text-zinc-900 font-bold">★ Active Target</span>
          ) : (
            <span className="text-zinc-400">Click to target</span>
          )}
          <span className="text-zinc-300">|</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/station/${station.id}`);
            }}
            className="font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-0.5"
            title="Open Dedicated Dashboard"
          >
            <span>Open &rarr;</span>
          </button>
        </div>
      </div>
    </div>
  );
};
