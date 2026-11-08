import mongoose from "mongoose";

const moderationRecordSchema = new mongoose.Schema(
  {
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "comment",
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    action: {
      type: String,
      enum: ["created", "edited", "deleted", "reported", "hidden"],
      required: true,
    },
    reason: { type: String, maxlength: 500, default: "" },
  },
  { timestamps: true },
);

export default mongoose.models.moderationRecord ||
  mongoose.model("moderationRecord", moderationRecordSchema);
