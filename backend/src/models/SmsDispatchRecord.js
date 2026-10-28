import mongoose from "mongoose";

const smsDispatchRecordSchema = new mongoose.Schema(
  {
    messageId: { type: String, required: true, unique: true, index: true },
    stationId: { type: String, required: true, index: true },
    stationName: { type: String, required: true },
    operatorName: { type: String, default: "" },
    operatorRole: { type: String, default: "" },
    recipientPhone: { type: String, required: true },
    triggerType: { type: String, required: true },
    severity: { type: String, default: "HIGH" },
    message: { type: String, required: true },
    characterCount: { type: Number, default: 0 },
    status: { type: String, required: true, index: true }, // e.g. "SIMULATED", "DELIVERED (TWILIO LIVE)", "FAILED"
    isSimulated: { type: Boolean, default: true },
    carrier: { type: String, default: "AeroSense Telemetry Dispatcher" },
    deliveryLatencyMs: { type: Number, default: 0 },
    providerResponse: { type: String, default: "" },
    smsDirectUri: { type: String, default: "" },
    whatsappDirectUri: { type: String, default: "" }
  },
  { timestamps: true }
);

smsDispatchRecordSchema.index({ createdAt: -1 });

export const SmsDispatchRecordModel =
  mongoose.models.SmsDispatchRecord ||
  mongoose.model("SmsDispatchRecord", smsDispatchRecordSchema);
