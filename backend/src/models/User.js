import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["admin", "operator"], required: true, index: true },
    assignedStationId: { type: String, default: null, index: true }, // e.g. "STN-001" (null for admin)
    phone: { type: String, default: "" },
    status: { type: String, enum: ["ACTIVE", "SUSPENDED"], default: "ACTIVE" }
  },
  { timestamps: true }
);

export const UserModel = mongoose.models.User || mongoose.model("User", userSchema);
