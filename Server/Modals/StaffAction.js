import mongoose from "mongoose";

const staffActionSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["comment", "video", "user"],
      required: true,
    },
    targetId: { type: String, required: true, maxlength: 128, index: true },
    action: {
      type: String,
      enum: [
        "content-hidden",
        "content-restored",
        "report-reviewed",
        "account-suspended",
        "account-restored",
      ],
      required: true,
    },
    reason: { type: String, maxlength: 500, default: "" },
  },
  { timestamps: true },
);

export default mongoose.models.staffAction ||
  mongoose.model("staffAction", staffActionSchema);
