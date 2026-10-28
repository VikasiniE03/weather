import React, { useState, useEffect, useCallback } from "react";
import {
  fetchOperators,
  updateOperator,
  resetOperators,
  fetchSmsConfig,
  updateSmsConfig,
  fetchSmsLog,
  sendTestSms,
  clearSmsLog
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Users,
  Smartphone,
  Send,
  Settings,
  PhoneCall,
  CheckCircle2,
  AlertCircle,
  Key,
  Shield,
  RotateCcw,
  Trash2,
  RefreshCw
} from "lucide-react";

export function OperatorsPage() {
  const { isAdmin } = useAuth();
  const [operators, setOperators] = useState([]);
  const [smsConfig, setSmsConfig] = useState(null);
  const [smsLog, setSmsLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingStation, setEditingStation] = useState(null);
  const [editPhone, setEditPhone] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [testStationId, setTestStationId] = useState("STN-003");
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [feedback, setFeedback] = useState(null);

  // Live Gateway Settings Modal/Inputs
  const [provider, setProvider] = useState("SIMULATED");
  const [fast2smsKey, setFast2smsKey] = useState("");
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [twilioPhone, setTwilioPhone] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [opRes, cfgRes, logRes] = await Promise.all([
        fetchOperators(),
        fetchSmsConfig(),
        fetchSmsLog()
      ]);
      if (opRes.success && opRes.data) setOperators(opRes.data);
      if (cfgRes.success && cfgRes.data) {
        setSmsConfig(cfgRes.data);
        setProvider(cfgRes.data.provider || "SIMULATED");
      }
      if (logRes.success && logRes.data) setSmsLog(logRes.data);
    } catch (err) {
      console.warn("Failed to load operator & SMS data:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleStartEdit = (op) => {
    setEditingStation(op.stationId);
    setEditName(op.name);
    setEditPhone(op.phone);
    setEditEmail(op.email);
  };

  const handleSaveOperator = async (stationId) => {
    try {
      await updateOperator(stationId, {
        name: editName,
        phone: editPhone,
        email: editEmail
      });
      setFeedback(`Operator details updated for ${stationId}`);
      setTimeout(() => setFeedback(null), 3000);
      setEditingStation(null);
      await loadData();
    } catch (err) {
      alert("Error updating operator: " + err.message);
    }
  };

  const handleSaveGateway = async () => {
    try {
      await updateSmsConfig({
        provider,
        fast2smsApiKey: fast2smsKey,
        twilioAccountSid: twilioSid,
        twilioAuthToken: twilioToken,
        twilioPhoneNumber: twilioPhone
      });
      setFeedback("SMS Carrier Gateway settings updated successfully.");
      setTimeout(() => setFeedback(null), 3000);
      await loadData();
    } catch (err) {
      alert("Error saving gateway: " + err.message);
    }
  };

  const handleSendTest = async () => {
    try {
      const res = await sendTestSms(testStationId, testPhone, testMessage);
      setFeedback(res.message);
      setTimeout(() => setFeedback(null), 4000);
      await loadData();
    } catch (err) {
      alert("Test SMS error: " + err.message);
    }
  };

  const handleClearOutbox = async () => {
    if (!window.confirm("Clear all logged SMS messages from the server?")) return;
    try {
      await clearSmsLog();
      setFeedback("SMS outbox cleared.");
      setTimeout(() => setFeedback(null), 2500);
      await loadData();
    } catch (err) {
      alert("Error clearing log: " + err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Station Operator Roster & Cellular SMS Gateway
            </h1>
            <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">
              GSM Protocol Active
            </span>
          </div>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            Designate mobile recipients, configure live cellular providers, and inspect telecom dispatch history
          </p>
        </div>

        <button
          onClick={handleClearOutbox}
          className="px-3 py-1.5 rounded-xl border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-mono text-xs flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Trash2 className="w-3.5 h-3.5 text-zinc-500" />
          <span>Clear Outbox</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 rounded-xl bg-zinc-900 text-white text-xs font-mono flex items-center justify-between shadow-sm animate-in fade-in">
          <span>⚡ {feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Grid: Operator Directory (Left) and SMS Gateway Config & Test Tool (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Operators Roster Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 p-5 shadow-card space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-zinc-700" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
                Designated Station Incharge Roster (5 Stations)
              </h3>
            </div>
            <span className="text-zinc-400 text-[11px]">Strict 1-to-1 Node Binding</span>
          </div>

          <div className="space-y-3">
            {operators.map((op) => {
              const isEditing = editingStation === op.stationId;
              return (
                <div
                  key={op.stationId}
                  className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/60 hover:bg-zinc-50 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-zinc-900 text-sm">{op.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-200 text-zinc-800">
                        {op.stationId}
                      </span>
                      <span className="text-zinc-500 font-sans text-xs">({op.stationName})</span>
                    </div>

                    {!isEditing && (
                      <button
                        onClick={() => handleStartEdit(op)}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Edit Details
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2 pt-2 border-t border-zinc-200">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-zinc-500 block mb-0.5">Name:</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full p-2 rounded-lg border border-zinc-300 font-mono text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 block mb-0.5">Mobile Number:</label>
                          <input
                            type="text"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full p-2 rounded-lg border border-zinc-300 font-mono text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 block mb-0.5">Official Email:</label>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="w-full p-2 rounded-lg border border-zinc-300 font-mono text-xs bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-1">
                        <button
                          onClick={() => setEditingStation(null)}
                          className="px-3 py-1 rounded-lg border border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveOperator(op.stationId)}
                          className="px-3 py-1 rounded-lg bg-zinc-900 text-white font-bold"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-zinc-600 text-[11px]">
                      <div>
                        <span className="text-zinc-400 block">Mobile Link:</span>
                        <span className="font-bold text-zinc-900">{op.phone}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block">Role:</span>
                        <span className="truncate block">{op.role}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block">Shift Vigil:</span>
                        <span className="truncate block">{op.shift}</span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block">Total Alerts Dispatched:</span>
                        <span className="font-bold text-zinc-900">{op.totalSmsDispatched || 0}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Carrier Gateway Config & Test Tool (1 col) */}
        <div className="space-y-6">
          {/* Carrier Configuration */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-card font-mono text-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <span className="font-bold text-zinc-900 uppercase">Carrier Gateway Settings</span>
              <Settings className="w-4 h-4 text-zinc-400" />
            </div>

            <div>
              <label className="block text-zinc-500 mb-1">Active SMS Provider:</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full p-2 rounded-xl border border-zinc-300 bg-white font-mono text-xs focus:ring-2 focus:ring-zinc-900"
              >
                <option value="SIMULATED">Simulated Telecom Gateway (Default)</option>
                <option value="FAST2SMS">Fast2SMS (India Bulk Mobile Delivery)</option>
                <option value="TWILIO">Twilio Cloud SMS (Global)</option>
              </select>
            </div>

            {provider === "FAST2SMS" && (
              <div>
                <label className="block text-zinc-500 mb-1">Fast2SMS Authorization API Key:</label>
                <input
                  type="password"
                  value={fast2smsKey}
                  onChange={(e) => setFast2smsKey(e.target.value)}
                  placeholder={smsConfig?.fast2smsKeyMasked || "Paste Fast2SMS API Key..."}
                  className="w-full p-2 rounded-xl border border-zinc-300 font-mono text-xs"
                />
              </div>
            )}

            {provider === "TWILIO" && (
              <div className="space-y-2">
                <div>
                  <label className="block text-zinc-500 mb-1">Twilio Account SID:</label>
                  <input
                    type="text"
                    value={twilioSid}
                    onChange={(e) => setTwilioSid(e.target.value)}
                    placeholder="ACxxxxxxxx..."
                    className="w-full p-2 rounded-xl border border-zinc-300 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">Twilio Auth Token:</label>
                  <input
                    type="password"
                    value={twilioToken}
                    onChange={(e) => setTwilioToken(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full p-2 rounded-xl border border-zinc-300 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1">Twilio Origin Phone Number:</label>
                  <input
                    type="text"
                    value={twilioPhone}
                    onChange={(e) => setTwilioPhone(e.target.value)}
                    placeholder="+1234567890"
                    className="w-full p-2 rounded-xl border border-zinc-300 font-mono text-xs"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleSaveGateway}
              className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold transition-all"
            >
              Update Gateway Credentials
            </button>

            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-500 space-y-1">
              <div>
                Status: <strong className="text-zinc-800">{smsConfig?.isLiveConfigured ? "Live Provider Configured" : "Simulated Carrier Active"}</strong>
              </div>
              <p>
                When no live API keys are present, the system explicitly reports dispatches as <code className="bg-zinc-200 px-1 py-0.5 rounded">SIMULATED</code>.
              </p>
            </div>
          </div>

          {/* Test SMS Dispatcher */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-card font-mono text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <span className="font-bold text-zinc-900 uppercase">On-Demand Test SMS</span>
              <Smartphone className="w-4 h-4 text-emerald-600" />
            </div>

            <div>
              <label className="block text-zinc-500 mb-1">Destination Station Operator:</label>
              <select
                value={testStationId}
                onChange={(e) => setTestStationId(e.target.value)}
                className="w-full p-2 rounded-xl border border-zinc-300 bg-white font-mono text-xs"
              >
                {operators.map((o) => (
                  <option key={o.stationId} value={o.stationId}>
                    {o.stationId} — {o.name} ({o.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-zinc-500 mb-1">Custom Recipient Mobile (Optional):</label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="e.g. +91 98401 11001"
                className="w-full p-2 rounded-xl border border-zinc-300 font-mono text-xs"
              />
            </div>

            <button
              onClick={handleSendTest}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center space-x-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch Test Verification SMS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Historical Outbox Log */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-card font-mono text-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-900">
              Telecom Outbox Dispatch Log ({smsLog.length} Records)
            </h3>
            <p className="text-zinc-500 text-[11px] mt-0.5">
              Auditable records of all cellular alert transmissions and carrier receipts
            </p>
          </div>
        </div>

        {smsLog.length === 0 ? (
          <div className="py-8 text-center text-zinc-400">
            Outbox empty. Automated dispatches occur whenever an anomaly or weather emergency triggers.
          </div>
        ) : (
          <div className="space-y-2.5">
            {smsLog.map((log) => {
              const isSimulated = log.status.includes("SIMULATED") || log.isSimulated;
              const isDelivered = log.status.includes("DELIVERED") && !isSimulated;

              return (
                <div
                  key={log.messageId || log.id}
                  className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/70 hover:bg-zinc-50 transition-all space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-zinc-900">{log.messageId || log.id}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800">
                        {log.stationId}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600">
                        {log.triggerType}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded self-start sm:self-auto ${
                        isDelivered
                          ? "bg-emerald-600 text-white"
                          : isSimulated
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : "bg-rose-600 text-white"
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>

                  <p className="text-zinc-800 text-[11px] leading-relaxed bg-white p-2.5 rounded-lg border border-zinc-200/80">
                    "{log.message}"
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-zinc-500">
                    <span>Recipient: <strong className="text-zinc-800">{log.operatorName} ({log.recipientPhone})</strong></span>
                    <span>Carrier: {log.carrier}</span>
                    <span>Latency: {log.deliveryLatencyMs || 180}ms</span>
                    <span>Timestamp: {log.timeFormatted || new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>

                  {log.providerResponse && (
                    <div className="text-[10px] text-zinc-400 truncate">
                      Provider Handshake: {log.providerResponse}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default OperatorsPage;
