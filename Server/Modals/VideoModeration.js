import mongoose from "mongoose";

const videoModerationSchema = new mongoose.Schema(
  {
    videoId: { type: String, required: true, maxlength: 64, unique: true },
    provider: { type: String, enum: ["platform", "youtube"], required: true },
    status: { type: String, enum: ["visible", "hidden"], required: true },
    reason: { type: String, maxlength: 500, default: "" },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.models.videoModeration ||
  mongoose.model("videoModeration", videoModerationSchema);
