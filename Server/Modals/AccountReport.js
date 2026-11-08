import mongoose from "mongoose";

const accountReportSchema = new mongoose.Schema(
  {
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
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

accountReportSchema.index({ reportedUser: 1, reporter: 1 }, { unique: true });

export default mongoose.models.accountReport ||
  mongoose.model("accountReport", accountReportSchema);
