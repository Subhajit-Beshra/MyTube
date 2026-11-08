import mongoose from "mongoose";

const authChallengeSchema = new mongoose.Schema(
  {
    challengeId: { type: String, required: true, unique: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    cleanupAt: { type: Date, required: true },
    resendAfter: { type: Date, required: true },
    resendCount: { type: Number, default: 0 },
    attempts: { type: Number, default: 0 },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

authChallengeSchema.index({ cleanupAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.authChallenge ||
  mongoose.model("authChallenge", authChallengeSchema);
