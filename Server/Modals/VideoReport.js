import mongoose from "mongoose";

const videoReportSchema = new mongoose.Schema(
  {
    videoId: { type: String, required: true, maxlength: 64, index: true },
    provider: { type: String, enum: ["platform", "youtube"], required: true },
    title: { type: String, maxlength: 500, default: "" },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ["open", "reviewed", "dismissed"],
      default: "open",
      index: true,
    },
  },
  { timestamps: true },
);

videoReportSchema.index({ videoId:  1, reporter: 1 }, { unique: true });

export default mongoose.models.videoReport ||
  mongoose.model("videoReport", videoReportSchema);
