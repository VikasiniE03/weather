import React, { useState, useEffect } from "react";
import {
  X,
  Phone,
  Mail,
  Shield,
  Send,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Flame,
  Radio,
  Check,
  Edit2,
  RefreshCw,
  Clock,
  Sparkles,
  Smartphone,
  Settings,
  Copy,
  ExternalLink
} from "lucide-react";
import { updateOperator, sendTestSms, clearSmsLog, fetchSmsConfig, updateSmsConfig } from "../services/api";

export const OperatorSmsModal = ({
  isOpen,
  onClose,
  operators = [],
  smsLog = [],
  stations = [],
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState("operators"); // 'operators' | 'outbox' | 'gateway'
  const [editingStationId, setEditingStationId] = useState(null);
  const [editedPhone, setEditedPhone] = useState("");
  const [editedName, setEditedName] = useState("");
  const [sendingStationId, setSendingStationId] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);
  const [filterType, setFilterType] = useState("ALL");
  const [copiedId, setCopiedId] = useState(null);

  // Real SMS Gateway State (Twilio & Fast2SMS)
  const [smsGatewayConfig, setSmsGatewayConfig] = useState({
    fast2smsApiKey: "",
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioPhoneNumber: "",
    provider: "FAST2SMS"
  });
  const [gatewayStatus, setGatewayStatus] = useState(null);
  const [savingGateway, setSavingGateway] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSmsConfig()
        .then((res) => {
          if (res.success && res.data) {
            setGatewayStatus(res.data);
            setSmsGatewayConfig((prev) => ({
              ...prev,
              provider: res.data.provider || "FAST2SMS"
            }));
          }
        })
        .catch((err) => console.warn("Failed to load SMS config:", err.message));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartEdit = (op) => {
    setEditingStationId(op.stationId);
    setEditedPhone(op.phone || "");
    setEditedName(op.name || "");
  };

  const handleSaveEdit = async (stationId) => {
    try {
      await updateOperator(stationId, {
        phone: editedPhone,
        name: editedName
      });
      setEditingStationId(null);
      setFeedbackMessage(`Operator for ${stationId} updated successfully!`);
      setTimeout(() => setFeedbackMessage(null), 3000);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert("Failed to update operator: " + err.message);
    }
  };

  const handleSendTestSms = async (stationId) => {
    setSendingStationId(stationId);
    try {
      const res = await sendTestSms(stationId);
      if (res.success) {
        setFeedbackMessage(`Test SMS dispatched to operator! ${res.message}`);
        setTimeout(() => setFeedbackMessage(null), 4000);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      alert("Test SMS dispatch error: " + err.message);
    } finally {
      setSendingStationId(null);
    }
  };

  const handleClearOutbox = async () => {
    if (!window.confirm("Clear all SMS dispatch logs?")) return;
    try {
      await clearSmsLog();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert("Failed to clear SMS logs: " + err.message);
    }
  };

  const filteredLogs = filterType === "ALL"
    ? smsLog
    : smsLog.filter((log) => log.triggerType === filterType);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-zinc-200 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              <Smartphone className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-zinc-900">
                  Station Operators & Cellular SMS Alert Center
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  GSM/LTE LIVE
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Automated SMS dispatch gateway for hardware sensor faults & severe weather emergencies
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast Banner */}
        {feedbackMessage && (
          <div className="bg-zinc-900 text-white text-xs px-6 py-2.5 font-mono flex items-center justify-between animate-in fade-in">
            <span>⚡ {feedbackMessage}</span>
            <button onClick={() => setFeedbackMessage(null)} className="text-zinc-400 hover:text-white">✕</button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-zinc-200 bg-white flex items-center justify-between">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab("operators")}
              className={`pb-3 text-xs font-bold transition-all relative ${
                activeTab === "operators"
                  ? "text-zinc-900 border-b-2 border-zinc-900"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              Station Operators Roster ({operators.length})
            </button>
            <button
              onClick={() => setActiveTab("outbox")}
              className={`pb-3 text-xs font-bold transition-all flex items-center space-x-1.5 relative ${
                activeTab === "outbox"
                  ? "text-zinc-900 border-b-2 border-zinc-900"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <span>SMS Dispatch Outbox</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-zinc-100 border border-zinc-200 text-zinc-700">
                {smsLog.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab("gateway")}
              className={`pb-3 text-xs font-bold transition-all flex items-center space-x-1.5 relative ${
                activeTab === "gateway"
                  ? "text-zinc-900 border-b-2 border-zinc-900"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-zinc-600" />
              <span>Real SMS Gateway (Mobile Carrier)</span>
              {gatewayStatus?.hasFast2Sms || gatewayStatus?.hasTwilio ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              ) : null}
            </button>
          </div>

          {activeTab === "outbox" && smsLog.length > 0 && (
            <button
              onClick={handleClearOutbox}
              className="text-xs font-mono text-zinc-500 hover:text-rose-600 pb-2 flex items-center space-x-1"
            >
              <span>Clear Outbox</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-[#FBFBFC]">
          {activeTab === "operators" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 flex items-start space-x-3">
                <Shield className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Operator Alert Protocol:</span> Each station is monitored by a designated field engineer. When a sensor anomaly (zero-variance freeze, IDW spatial divergence) or serious weather hazard (cyclone, heatwave, cloudburst) is detected, an automated cellular SMS alert is instantly transmitted to the operator's phone.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {operators.map((op) => {
                  const isEditing = editingStationId === op.stationId;
                  const stn = stations.find((s) => s.id === op.stationId);
                  const isFaulted = stn?.status === "ANOMALY";

                  return (
                    <div
                      key={op.stationId}
                      className={`p-4 rounded-xl border transition-all ${
                        isFaulted
                          ? "bg-rose-50/70 border-rose-300 shadow-sm"
                          : "bg-white border-zinc-200 shadow-xs"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-zinc-900 text-white">
                              {op.stationId}
                            </span>
                            <span className="text-xs font-bold text-zinc-900">
                              {op.stationName}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">{op.stationZone}</p>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isFaulted
                              ? "bg-rose-100 text-rose-700 border border-rose-300 animate-pulse"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {isFaulted ? "ALERT ACTIVE" : "NORMAL"}
                        </span>
                      </div>

                      {/* Operator Details */}
                      <div className="mt-3.5 space-y-2 border-t border-zinc-100 pt-3 text-xs">
                        {isEditing ? (
                          <div className="space-y-2 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200">
                            <div>
                              <label className="text-[10px] font-mono text-zinc-500 block mb-0.5">Operator Name</label>
                              <input
                                type="text"
                                value={editedName}
                                onChange={(e) => setEditedName(e.target.value)}
                                className="w-full text-xs font-bold px-2 py-1 rounded border border-zinc-300 bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-mono text-zinc-500 block mb-0.5">Mobile Phone (for SMS Alerts)</label>
                              <input
                                type="text"
                                value={editedPhone}
                                onChange={(e) => setEditedPhone(e.target.value)}
                                placeholder="+91 9840X XXXXX"
                                className="w-full text-xs font-mono font-bold px-2 py-1 rounded border border-zinc-300 bg-white"
                              />
                            </div>
                            <div className="flex justify-end space-x-2 pt-1">
                              <button
                                onClick={() => setEditingStationId(null)}
                                className="px-2 py-1 rounded text-[11px] text-zinc-600 hover:bg-zinc-200"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveEdit(op.stationId)}
                                className="px-3 py-1 rounded text-[11px] font-bold bg-zinc-900 text-white hover:bg-zinc-800 flex items-center space-x-1"
                              >
                                <Check className="w-3 h-3" />
                                <span>Save</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-zinc-900">{op.name}</span>
                              <button
                                onClick={() => handleStartEdit(op)}
                                title="Edit operator phone number"
                                className="text-zinc-400 hover:text-zinc-800 p-1 rounded hover:bg-zinc-100"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="text-[11px] text-zinc-600 font-mono">
                              Role: {op.role}
                            </div>

                            <div className="flex items-center space-x-1.5 font-mono text-xs text-zinc-800">
                              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="font-bold">{op.phone}</span>
                            </div>

                            <div className="flex items-center space-x-1.5 font-mono text-[11px] text-zinc-500">
                              <Clock className="w-3 h-3 text-zinc-400 shrink-0" />
                              <span>Shift: {op.shift}</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Actions & Metrics */}
                      <div className="mt-3 pt-2.5 border-t border-zinc-100 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-500">
                          Dispatched: <strong className="text-zinc-800">{op.totalSmsDispatched || 0} SMS</strong>
                        </span>

                        <button
                          onClick={() => handleSendTestSms(op.stationId)}
                          disabled={sendingStationId === op.stationId}
                          className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-zinc-100 hover:bg-zinc-900 hover:text-white border border-zinc-200 transition-all flex items-center space-x-1 disabled:opacity-50"
                        >
                          <Send className="w-3 h-3" />
                          <span>{sendingStationId === op.stationId ? "Sending..." : "Test SMS"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab: Outbox */}
          {activeTab === "outbox" && (
            <div className="space-y-4">
              {/* Filter Row */}
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-2">
                  <span className="text-zinc-500">Filter:</span>
                  {["ALL", "SENSOR_FAULT", "WEATHER_EMERGENCY", "TEST_DISPATCH"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] ${
                        filterType === type
                          ? "bg-zinc-900 text-white border-zinc-900 font-bold"
                          : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      {type === "ALL" ? "All Transmissions" : type.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>

                <span className="text-zinc-500">{filteredLogs.length} Records</span>
              </div>

              {filteredLogs.length > 0 ? (
                <div className="space-y-3">
                  {filteredLogs.map((log) => {
                    const isFault = log.triggerType === "SENSOR_FAULT";
                    const isWeather = log.triggerType === "WEATHER_EMERGENCY";

                    return (
                      <div
                        key={log.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isFault
                            ? "bg-rose-50/50 border-rose-200"
                            : isWeather
                            ? "bg-amber-50/50 border-amber-200"
                            : "bg-white border-zinc-200"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200/60 pb-2">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                                isFault
                                  ? "bg-rose-600 text-white"
                                  : isWeather
                                  ? "bg-amber-600 text-white"
                                  : "bg-zinc-800 text-white"
                              }`}
                            >
                              {log.triggerType.replace(/_/g, " ")}
                            </span>

                            <span className="font-mono text-xs font-bold text-zinc-900">
                              {log.stationId} • {log.stationName}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2 text-[11px] font-mono text-zinc-500">
                            <span>Carrier: {log.carrier}</span>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold flex items-center space-x-1">
                              <CheckCircle className="w-3 h-3" />
                              <span>{log.status}</span>
                            </span>
                          </div>
                        </div>

                        {/* Recipient Details */}
                        <div className="mt-2.5 flex items-center justify-between text-xs font-mono text-zinc-600">
                          <div>
                            To Operator: <strong className="text-zinc-900">{log.operatorName}</strong> ({log.recipientPhone})
                          </div>
                          <div className="text-[11px] text-zinc-400">
                            {log.timeFormatted || new Date(log.timestamp).toLocaleTimeString()} (Latency: {log.deliveryLatencyMs}ms)
                          </div>
                        </div>

                        {/* Message Preview in cellular speech bubble */}
                        <div className="mt-2.5 p-3 rounded-lg bg-zinc-900 text-zinc-100 font-mono text-xs leading-relaxed border border-zinc-800 relative">
                          <div className="text-[10px] uppercase font-bold text-zinc-400 mb-1 flex items-center space-x-1">
                            <MessageSquare className="w-3 h-3 text-emerald-400" />
                            <span>Cellular Payload Preview:</span>
                          </div>
                          <div className="text-zinc-200">{log.message}</div>
                        </div>

                        {/* Direct Mobile Launchers */}
                        <div className="mt-2.5 pt-2 border-t border-zinc-200/80 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <a
                              href={log.smsDirectUri || `sms:${log.recipientPhone}?body=${encodeURIComponent(log.message)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-mono text-[11px] font-bold flex items-center space-x-1 shadow-2xs"
                            >
                              <Smartphone className="w-3 h-3" />
                              <span>📱 Open in Phone SMS App</span>
                            </a>

                            <a
                              href={log.whatsappDirectUri || `https://api.whatsapp.com/send?phone=${log.recipientPhone.replace(/[^0-9]/g, "")}&text=${encodeURIComponent(log.message)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-md bg-[#25D366] hover:bg-[#1faa4e] text-white font-mono text-[11px] font-bold flex items-center space-x-1 shadow-2xs"
                            >
                              <span>💬 Send via WhatsApp</span>
                            </a>

                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(log.message);
                                setCopiedId(log.id);
                                setTimeout(() => setCopiedId(null), 2000);
                              }}
                              className="px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-mono text-[11px] flex items-center space-x-1 border border-zinc-200"
                            >
                              <Copy className="w-3 h-3 text-zinc-500" />
                              <span>{copiedId === log.id ? "Copied!" : "Copy Text"}</span>
                            </button>
                          </div>

                          <div className="text-[10px] text-zinc-500 font-mono">
                            Recipient: {log.recipientPhone}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center rounded-xl bg-white border border-dashed border-zinc-300">
                  <Smartphone className="w-8 h-8 text-zinc-300 mx-auto" />
                  <p className="mt-2 text-sm font-medium text-zinc-700">No SMS Transmissions Recorded</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Trigger a Sensor Fault or Weather Hazard on any station to initiate real-time SMS alerts to operators.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Gateway */}
          {activeTab === "gateway" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-300 text-xs text-emerald-900 flex items-start space-x-3">
                <Smartphone className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-sm">Real Mobile Carrier SMS Gateway</div>
                  <p>
                    AeroSense generates real cellular telemetry SMS payloads with delivery handshake simulation and native mobile launchers. 
                    To dispatch real, over-the-air SMS messages directly to physical mobile phones over the cellular network, configure either <strong>Fast2SMS (India Free Tier)</strong> or <strong>Twilio Cloud SMS</strong> below.
                  </p>
                </div>
              </div>

              {/* Provider Selector */}
              <div className="p-4 rounded-xl bg-white border border-zinc-200 space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="provider"
                      value="FAST2SMS"
                      checked={smsGatewayConfig.provider === "FAST2SMS"}
                      onChange={(e) => setSmsGatewayConfig({ ...smsGatewayConfig, provider: e.target.value })}
                    />
                    <span className="text-xs font-bold text-zinc-900">Fast2SMS (India Quick SMS - Instant Free API)</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="provider"
                      value="TWILIO"
                      checked={smsGatewayConfig.provider === "TWILIO"}
                      onChange={(e) => setSmsGatewayConfig({ ...smsGatewayConfig, provider: e.target.value })}
                    />
                    <span className="text-xs font-bold text-zinc-900">Twilio (Global Telecom)</span>
                  </label>
                </div>

                {smsGatewayConfig.provider === "FAST2SMS" ? (
                  <div className="space-y-3 pt-2 border-t border-zinc-100">
                    <div>
                      <label className="block text-xs font-mono font-bold text-zinc-700 mb-1">
                        Fast2SMS Authorization API Key:
                      </label>
                      <input
                        type="password"
                        value={smsGatewayConfig.fast2smsApiKey}
                        onChange={(e) => setSmsGatewayConfig({ ...smsGatewayConfig, fast2smsApiKey: e.target.value })}
                        placeholder={gatewayStatus?.hasFast2Sms ? "••••••••••••••••" : "Paste your Fast2SMS API Key here"}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Get an instant free API Key in 30 seconds at <a href="https://www.fast2sms.com" target="_blank" rel="noreferrer" className="text-blue-600 underline">fast2sms.com</a> (No credit card required).
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-2 border-t border-zinc-100">
                    <div>
                      <label className="block text-xs font-mono font-bold text-zinc-700 mb-1">
                        Twilio Account SID:
                      </label>
                      <input
                        type="text"
                        value={smsGatewayConfig.twilioAccountSid}
                        onChange={(e) => setSmsGatewayConfig({ ...smsGatewayConfig, twilioAccountSid: e.target.value })}
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-bold text-zinc-700 mb-1">
                        Twilio Auth Token:
                      </label>
                      <input
                        type="password"
                        value={smsGatewayConfig.twilioAuthToken}
                        onChange={(e) => setSmsGatewayConfig({ ...smsGatewayConfig, twilioAuthToken: e.target.value })}
                        placeholder="••••••••••••••••••••••••••••••••"
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono font-bold text-zinc-700 mb-1">
                        Twilio Phone Number:
                      </label>
                      <input
                        type="text"
                        value={smsGatewayConfig.twilioPhoneNumber}
                        onChange={(e) => setSmsGatewayConfig({ ...smsGatewayConfig, twilioPhoneNumber: e.target.value })}
                        placeholder="+1 234 567 8900"
                        className="w-full px-3 py-2 rounded-lg border border-zinc-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
                  <button
                    onClick={async () => {
                      setSavingGateway(true);
                      try {
                        const res = await updateSmsConfig(smsGatewayConfig);
                        if (res.success) {
                          setGatewayStatus(res.data);
                          setFeedbackMessage("Gateway settings saved! Live SMS delivery enabled.");
                          setTimeout(() => setFeedbackMessage(null), 3500);
                        }
                      } catch (err) {
                        alert("Error saving gateway: " + err.message);
                      } finally {
                        setSavingGateway(false);
                      }
                    }}
                    disabled={savingGateway}
                    className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center space-x-1.5 shadow-2xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>{savingGateway ? "Saving..." : "Save Gateway Settings"}</span>
                  </button>

                  <span className="text-[11px] font-mono text-zinc-500">
                    Status: {gatewayStatus?.hasFast2Sms ? "Fast2SMS Active" : gatewayStatus?.hasTwilio ? "Twilio Active" : "Simulated + Direct Handset Mode"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between text-xs font-mono text-zinc-500">
          <span>SMS Gateway: Connected (AeroSense Carrier Mesh)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
