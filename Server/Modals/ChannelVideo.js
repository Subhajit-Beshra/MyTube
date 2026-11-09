import mongoose from "mongoose";

const channelVideoSchema = new mongoose.Schema(
  {
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },
    filePath: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { timestamps: true },
);

channelVideoSchema.index({ channel: 1, createdAt: -1 });

export default mongoose.models.ChannelVideo ||
  mongoose.model("ChannelVideo", channelVideoSchema);
