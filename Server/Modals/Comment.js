import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    videoId: { type: String, required: true, index: true },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    content: { type: String, required: true, trim: true, maxlength: 2000 },
    normalizedContent: { type: String, required: true, select: false },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "comment",
      default: null,
      index: true,
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    likeCount: { type: Number, default: 0, min: 0 },
    dislikeCount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["visible", "hidden"],
      default: "visible",
      index: true,
    },
  },
  { timestamps: true },
);

commentSchema.index({ videoId: 1, parent: 1, status: 1, createdAt: -1 });
commentSchema.index(
  { author: 1, videoId: 1, normalizedContent: 1 },
  { unique: true },
);

export default mongoose.models.comment ||
  mongoose.model("comment", commentSchema);
