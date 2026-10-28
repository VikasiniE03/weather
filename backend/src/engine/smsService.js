import { operatorManager } from "./operatorManager.js";
import { STATIONS } from "../config/stations.js";
import { repository } from "../database/repository.js";

/**
 * Telecom SMS Alert Dispatch Service
 * Handles SMS alert transmissions to station operators
 * when sensor faults or serious weather emergencies are detected.
 * 
 * Features:
 * - Operator-specific routing based strictly on station ID
 * - Dual triggers: Sensor Faults and Serious Weather Hazards
 * - Anti-spam rate-limiting & cooldown window per station
 * - Provider support: Live Twilio, Live Fast2SMS, and Simulated Telecom Gateway
 * - Clear disclosure: Explicitly marks simulated dispatches when no real provider is configured
 * - Persists all dispatch attempts to database
 */
class SmsService {
  constructor() {
    this.smsLog = [];
    this.cooldowns = {}; // Key: `${stationId}_${triggerType}` -> timestamp
    this.cooldownMs = 180000; // 3-minute cooldown for repeated automated triggers
    this.carrierGateways = ["Airtel IoT Telecom", "Jio Enterprise SMS", "Twilio Cloud SMS", "BSNL Telecom Gateway"];

    // Configurable carrier gateway settings (Fast2SMS for India, Twilio Global)
    this.gatewayConfig = {
      provider: process.env.FAST2SMS_API_KEY
        ? "FAST2SMS"
        : process.env.TWILIO_ACCOUNT_SID
        ? "TWILIO"
        : "SIMULATED",
      fast2smsApiKey: process.env.FAST2SMS_API_KEY || "",
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
      twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
      twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || ""
    };
  }

  /**
   * Get active SMS carrier gateway configuration (secrets masked for client security)
   */
  getConfig() {
    return {
      provider: this.gatewayConfig.provider,
      isLiveConfigured: Boolean(
        (this.gatewayConfig.provider === "FAST2SMS" && this.gatewayConfig.fast2smsApiKey) ||
        (this.gatewayConfig.provider === "TWILIO" &&
          this.gatewayConfig.twilioAccountSid &&
          this.gatewayConfig.twilioAuthToken &&
          this.gatewayConfig.twilioPhoneNumber)
      ),
      hasFast2Sms: Boolean(this.gatewayConfig.fast2smsApiKey),
      hasTwilio: Boolean(this.gatewayConfig.twilioAccountSid && this.gatewayConfig.twilioAuthToken),
      twilioPhoneNumber: this.gatewayConfig.twilioPhoneNumber || null,
      fast2smsKeyMasked: this.gatewayConfig.fast2smsApiKey
        ? this.gatewayConfig.fast2smsApiKey.slice(0, 4) + "••••••••"
        : null
    };
  }

  /**
   * Update SMS carrier gateway configuration at runtime
   */
  updateConfig(updates = {}) {
    if (updates.provider) this.gatewayConfig.provider = updates.provider;
    if (updates.fast2smsApiKey !== undefined) this.gatewayConfig.fast2smsApiKey = updates.fast2smsApiKey.trim();
    if (updates.twilioAccountSid !== undefined) this.gatewayConfig.twilioAccountSid = updates.twilioAccountSid.trim();
    if (updates.twilioAuthToken !== undefined) this.gatewayConfig.twilioAuthToken = updates.twilioAuthToken.trim();
    if (updates.twilioPhoneNumber !== undefined) this.gatewayConfig.twilioPhoneNumber = updates.twilioPhoneNumber.trim();
    return this.getConfig();
  }

  /**
   * Check if an automated alert is currently suppressed by cooldown window
   */
  isSuppressed(stationId, triggerType) {
    const key = `${stationId}_${triggerType}`;
    const lastSent = this.cooldowns[key];
    if (!lastSent) return false;
    return Date.now() - lastSent < this.cooldownMs;
  }

  /**
   * Reset cooldown for a station/trigger (e.g., upon fault toggle or resolution)
   */
  resetCooldown(stationId, triggerType = null) {
    if (triggerType) {
      delete this.cooldowns[`${stationId}_${triggerType}`];
    } else {
      delete this.cooldowns[`${stationId}_SENSOR_FAULT`];
      delete this.cooldowns[`${stationId}_WEATHER_EMERGENCY`];
    }
  }

  /**
   * Dispatch an urgent SMS message to the station operator
   */
  async dispatchAlertSms({
    stationId,
    triggerType = "SENSOR_FAULT",
    severity = "CRITICAL",
    details = {},
    force = false
  }) {
    // 1. Check cooldown unless forced
    if (!force && this.isSuppressed(stationId, triggerType)) {
      return {
        dispatched: false,
        reason: "COOLDOWN_ACTIVE",
        message: `SMS suppressed by anti-spam cooldown for ${stationId}. Next window opens in ${Math.round(
          (this.cooldownMs - (Date.now() - this.cooldowns[`${stationId}_${triggerType}`])) / 1000
        )}s`
      };
    }

    // 2. Identify target station and operator
    const station = STATIONS.find((s) => s.id === stationId);
    const operator = operatorManager.getOperatorByStation(stationId);

    if (!operator) {
      return {
        dispatched: false,
        reason: "NO_OPERATOR",
        message: `No designated operator found for station ${stationId}`
      };
    }

    if (operator.smsAlertsEnabled === false) {
      return {
        dispatched: false,
        reason: "SMS_DISABLED_BY_OPERATOR",
        message: `SMS notifications are disabled in settings for Operator ${operator.name}`
      };
    }

    // 3. Compose standard telecom SMS payload
    let smsBody = "";
    const stnName = station ? station.name : stationId;
    const timeStr = new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" });

    if (triggerType === "SENSOR_FAULT") {
      const faultLabel = details.faultType ? details.faultType.replace(/_/g, " ") : "SENSOR FAULT";
      const metricInfo = details.primaryMetric ? `[${details.primaryMetric.toUpperCase()}]` : "";
      const valStr = details.currentValue !== undefined ? `Observed: ${details.currentValue}${details.primaryMetric === "temperature" ? "°C" : details.primaryMetric === "humidity" ? "%" : ""}` : "";
      const expStr = details.expectedValue !== undefined ? ` (Neighbor Baseline: ${details.expectedValue}${details.primaryMetric === "temperature" ? "°C" : details.primaryMetric === "humidity" ? "%" : ""})` : "";
      const confStr = details.confidence ? ` Conf: ${details.confidence}%` : "";

      smsBody = `🚨 AERO-SENSE ALERT: ${faultLabel} at ${stationId}, ${stnName}. ${metricInfo} ${valStr}.${expStr}. Severity: ${severity}.${confStr} Incharge: ${operator.name}. Please inspect station. Incident: ${details.incidentId || "INC-LIVE"}`;
    } else if (triggerType === "WEATHER_EMERGENCY") {
      const alertLabel = details.label || "SEVERE WEATHER EMERGENCY";
      const conditionStr = `Temp: ${details.currentTemp || "--"}°C | Hum: ${details.currentHum || "--"}% | Press: ${details.currentPress || "--"} hPa`;

      smsBody = `⚠️ AERO-SENSE WEATHER ALERT: ${alertLabel.toUpperCase()} at ${stationId}, ${stnName}. ${conditionStr}. Action: Incharge ${operator.name}: ${details.recommendedAction || "Execute contingency protocols."}`;
    } else if (triggerType === "TEST_DISPATCH") {
      smsBody = `📲 AERO-SENSE VERIFICATION: Station ${stationId} (${stnName}) cellular pathway test at ${timeStr}. Incharge: ${operator.name} (${operator.phone}). Gateway link active.`;
    } else {
      smsBody = `ℹ️ AERO-SENSE UPDATE: Station ${stationId} (${stnName}) status update at ${timeStr}. Operator: ${operator.name}.`;
    }

    const carrier = this.carrierGateways[Math.floor(Math.random() * this.carrierGateways.length)];
    const messageId = `MSG-IN-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const latencyMs = Math.floor(180 + Math.random() * 240);

    let providerStatus = "SIMULATED (No live carrier credentials configured)";
    let providerResponse = "Simulated carrier test dispatch: In-memory logging active. Configure Fast2SMS or Twilio API credentials for live delivery.";
    let isSimulated = true;

    // Check if phone number is a demo placeholder
    const isDemoPlaceholder = operator.phone.includes("9840") || operator.phone.includes("8122");

    // 4A. Optional Live Fast2SMS Gateway (India Instant Mobile Delivery)
    if (this.gatewayConfig.fast2smsApiKey && this.gatewayConfig.provider === "FAST2SMS") {
      if (isDemoPlaceholder && !force) {
        providerStatus = "SIMULATED (Demo placeholder phone number)";
        providerResponse = `Demo placeholder number ${operator.phone} detected. Live SMS skipped to prevent sending to dummy numbers. Set a real mobile number in Operator Settings to test live dispatch.`;
      } else {
        try {
          const clean10Digit = operator.phone.replace(/[^0-9]/g, "").slice(-10);
          if (clean10Digit.length === 10) {
            const f2sRes = await fetch("https://www.fast2sms.com/dev/bulkV2", {
              method: "POST",
              headers: {
                authorization: this.gatewayConfig.fast2smsApiKey,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                route: "q",
                message: smsBody,
                language: "english",
                flash: 0,
                numbers: clean10Digit
              })
            });
            const f2sData = await f2sRes.json();
            if (f2sData.return === true) {
              providerStatus = "DELIVERED (Fast2SMS Live)";
              providerResponse = `Fast2SMS Live Gateway Request ID: ${f2sData.request_id || "200 OK"}`;
              isSimulated = false;
            } else {
              providerStatus = "CARRIER_ERROR (Fast2SMS API Failed)";
              providerResponse = f2sData.message?.[0] || JSON.stringify(f2sData);
              isSimulated = false;
            }
          }
        } catch (err) {
          providerStatus = "CARRIER_ERROR (Network/API Failed)";
          providerResponse = `Fast2SMS call failed: ${err.message}`;
        }
      }
    }
    // 4B. Optional Live Twilio Gateway (Global Mobile Delivery)
    else if (
      this.gatewayConfig.twilioAccountSid &&
      this.gatewayConfig.twilioAuthToken &&
      this.gatewayConfig.twilioPhoneNumber &&
      this.gatewayConfig.provider === "TWILIO"
    ) {
      if (isDemoPlaceholder && !force) {
        providerStatus = "SIMULATED (Demo placeholder phone number)";
        providerResponse = `Demo placeholder number ${operator.phone} detected. Live SMS skipped to prevent sending to dummy numbers.`;
      } else {
        try {
          const auth = Buffer.from(`${this.gatewayConfig.twilioAccountSid}:${this.gatewayConfig.twilioAuthToken}`).toString("base64");
          const bodyParams = new URLSearchParams({
            To: operator.phone,
            From: this.gatewayConfig.twilioPhoneNumber,
            Body: smsBody
          });

          const twilioRes = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${this.gatewayConfig.twilioAccountSid}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded"
              },
              body: bodyParams.toString()
            }
          );

          if (twilioRes.ok) {
            const twData = await twilioRes.json();
            providerStatus = "DELIVERED (Twilio Live)";
            providerResponse = `Twilio Live SID: ${twData.sid}`;
            isSimulated = false;
          } else {
            const errText = await twilioRes.text();
            providerStatus = "CARRIER_ERROR (Twilio Failed)";
            providerResponse = `Twilio rejected request: ${errText.slice(0, 150)}`;
            isSimulated = false;
          }
        } catch (err) {
          providerStatus = "CARRIER_ERROR (Network/API Failed)";
          providerResponse = `Twilio network failure: ${err.message}`;
        }
      }
    }

    const rawDigits = operator.phone.replace(/[^0-9]/g, "");
    const cleanWithCountry = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits;

    // 5. Construct log record
    const smsRecord = {
      messageId,
      timestamp: new Date().toISOString(),
      timeFormatted: timeStr,
      stationId,
      stationName: stnName,
      stationZone: station ? station.zone : "Urban Grid",
      operatorName: operator.name,
      operatorRole: operator.role,
      recipientPhone: operator.phone,
      triggerType,
      severity,
      message: smsBody,
      characterCount: smsBody.length,
      status: providerStatus,
      isSimulated,
      carrier,
      deliveryLatencyMs: latencyMs,
      providerResponse,
      smsDirectUri: `sms:${operator.phone}?body=${encodeURIComponent(smsBody)}`,
      whatsappDirectUri: `https://api.whatsapp.com/send?phone=${cleanWithCountry}&text=${encodeURIComponent(smsBody)}`
    };

    // Store in historical outbox (in-memory cache)
    this.smsLog.unshift(smsRecord);
    if (this.smsLog.length > 50) this.smsLog.pop();

    // Persist to database
    repository.saveSmsRecord(smsRecord).catch((e) => console.warn("Failed saving SMS record to db:", e.message));

    // Update cooldown timestamp
    this.cooldowns[`${stationId}_${triggerType}`] = Date.now();

    // Record operator stats
    operatorManager.recordSmsSent(stationId, smsRecord.timestamp);

    console.log(
      `[SMS OUTBOX] Dispatch -> Operator ${operator.name} (${operator.phone}) for ${stationId}: [${providerStatus}]`
    );

    return {
      dispatched: true,
      record: smsRecord,
      message: `SMS processed for Operator ${operator.name} (${operator.phone}): ${providerStatus}.`
    };
  }

  getSmsLog() {
    return this.smsLog;
  }

  clearSmsLog() {
    this.smsLog = [];
    this.cooldowns = {};
    return { success: true, message: "SMS Outbox cleared." };
  }
}

export const smsService = new SmsService();
