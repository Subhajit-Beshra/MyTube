import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    mode: { type: String, enum: ["one-to-one", "group"], required: true },
    maxParticipants: { type: Number, min: 2, max: 100, required: true },
    locked: { type: Boolean, default: false },
    status: { type: String, enum: ["active", "ended"], default: "active" },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default mongoose.models.meeting ||
  mongoose.model("meeting", meetingSchema);
