import mongoose from "mongoose";

const trustedDeviceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    browser: { type: String, default: "Unknown" },
    operatingSystem: { type: String, default: "Unknown" },
    deviceType: { type: String, default: "Unknown" },
    lastUsedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

trustedDeviceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.trustedDevice ||
  mongoose.model("trustedDevice", trustedDeviceSchema);
