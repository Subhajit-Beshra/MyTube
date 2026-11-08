import mongoose from "mongoose";

const downloadSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    videoId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    filepath: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    filesize: {
      type: Number,
      required: true,
      min: 0,
    },
    dayKey: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
      required: true,
    },
    attempt: {
      type: Number,
      default: 1,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

downloadSchema.index({ user: 1, videoId: 1, dayKey: 1 }, { unique: true });

export default mongoose.models.download ||
  mongoose.model("download", downloadSchema);
