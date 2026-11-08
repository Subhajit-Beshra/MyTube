import express from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import Comment from "../Modals/Comment.js";
import CommentReport from "../Modals/CommentReport.js";
import ModerationRecord from "../Modals/ModerationRecord.js";
import { requireAuth } from "../middleware/auth.js";
import {
  isSupportedTranslationLanguage,
  translateText,
  TranslationConfigurationError,
  TranslationProviderError,
} from "../services/translation.js";

const router = express.Router();
const commentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const translationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const profanityPattern = /\b(?:fuck|shit|bitch|asshole)\b/i;
const videoIdPattern = /^[\w-]{1,64}$/;

function optionalAuth(req, _res, next) {
  const token = req.cookies?.mytube_token;
  if (token && process.env.JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (typeof decoded === "object" && decoded.userId) req.userId = decoded.userId;
    } catch {
      req.userId = undefined;
    }
  }
  next();
}

function normalizedText(text) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function validateCommentText(value) {
  if (typeof value !== "string") return "Comment text is required.";
  const content = value.trim();
  if (!content || content.length > 2000) return "Comments must be between 1 and 2000 characters.";
  if (profanityPattern.test(content)) return "Please remove profanity before posting.";
  if ((content.match(/https?:\/\//gi) ?? []).length > 3) return "This comment contains too many links.";
  return null;
}

function safeComment(comment, userId) {
  const liked = comment.likes.some((id) => id.toString() === userId?.toString());
  const disliked = comment.dislikes.some((id) => id.toString() === userId?.toString());
  return {
    id: comment._id,
    videoId: comment.videoId,
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    parentId: comment.parent,
    likeCount: comment.likeCount,
    dislikeCount: comment.dislikeCount,
    myVote: liked ? "like" : disliked ? "dislike" : null,
    author: {
      id: comment.author?._id,
      name: comment.author?.name || comment.author?.channelname || "MyTube user",
      image: comment.author?.image || "",
    },
  };
}

router.get("/:videoId", optionalAuth, async (req, res) => {
  try {
    if (!videoIdPattern.test(req.params.videoId)) {
      return res.status(400).json({ message: "Invalid video ID." });
    }
    const sort = ["oldest", "most-liked"].includes(req.query.sort)
      ? req.query.sort
      : "newest";
    const sortOrder =
      sort === "oldest"
        ? { createdAt: 1 }
        : sort === "most-liked"
          ? { likeCount: -1, createdAt: -1 }
          : { createdAt: -1 };

    const roots = await Comment.find({
      videoId: req.params.videoId,
      parent: null,
      status: "visible",
    })
      .sort(sortOrder)
      .limit(100)
      .populate("author", "name channelname image");
    const replies = roots.length
      ? await Comment.find({
          videoId: req.params.videoId,
          parent: { $in: roots.map((comment) => comment._id) },
          status: "visible",
        })
          .sort({ createdAt: 1 })
          .limit(500)
          .populate("author", "name channelname image")
      : [];
    const replyGroups = new Map();
    for (const reply of replies) {
      const key = reply.parent.toString();
      const group = replyGroups.get(key) ?? [];
      group.push(safeComment(reply, req.userId));
      replyGroups.set(key, group);
    }

    return res.status(200).json({
      comments: roots.map((comment) => ({
        ...safeComment(comment, req.userId),
        replies: replyGroups.get(comment._id.toString()) ?? [],
      })),
    });
  } catch (error) {
    console.error("Comment list error:", error);
    return res.status(500).json({ message: "Could not load comments." });
  }
});

router.post("/:commentId/translate", translationLimiter, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.commentId)) {
      return res.status(400).json({ message: "Invalid comment ID." });
    }
    const targetLanguage = req.body?.targetLanguage;
    if (!isSupportedTranslationLanguage(targetLanguage)) {
      return res.status(400).json({ message: "Choose a supported translation language." });
    }
    const comment = await Comment.findOne({
      _id: req.params.commentId,
      status: "visible",
    }).select("content");
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    const translation = await translateText(comment.content, targetLanguage);
    return res.status(200).json({ ...translation, targetLanguage });
  } catch (error) {
    if (error instanceof TranslationConfigurationError) {
      return res.status(503).json({ message: error.message });
    }
    if (error instanceof TranslationProviderError) {
      return res.status(502).json({ message: error.message });
    }
    console.error("Comment translation error:", error);
    return res.status(500).json({ message: "Could not translate the comment." });
  }
});

router.post("/:videoId", requireAuth, commentLimiter, async (req, res) => {
  try {
    if (!videoIdPattern.test(req.params.videoId)) {
      return res.status(400).json({ message: "Invalid video ID." });
    }
    const validationError = validateCommentText(req.body?.content);
    if (validationError) return res.status(400).json({ message: validationError });

    const content = req.body.content.trim();
    const normalizedContentValue = normalizedText(content);
    const duplicate = await Comment.findOne({
      author: req.userId,
      videoId: req.params.videoId,
      normalizedContent: normalizedContentValue,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }).select("_id");
    if (duplicate) {
      return res.status(409).json({ message: "You already posted this comment recently." });
    }

    let parent = null;
    if (req.body.parentId !== undefined && req.body.parentId !== null) {
      if (!mongoose.isValidObjectId(req.body.parentId)) {
        return res.status(400).json({ message: "Invalid reply target." });
      }
      parent = await Comment.findOne({
        _id: req.body.parentId,
        videoId: req.params.videoId,
        parent: null,
        status: "visible",
      });
      if (!parent) return res.status(404).json({ message: "Comment to reply to was not found." });
    }

    const comment = await Comment.create({
      videoId: req.params.videoId,
      author: req.userId,
      content,
      normalizedContent: normalizedContentValue,
      parent: parent?._id ?? null,
    });
    await ModerationRecord.create({
      comment: comment._id,
      actor: req.userId,
      action: "created",
    });
    await comment.populate("author", "name channelname image");
    return res.status(201).json({ comment: safeComment(comment, req.userId) });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "You already posted this comment recently." });
    }
    console.error("Comment creation error:", error);
    return res.status(500).json({ message: "Could not post the comment." });
  }
});

router.patch("/:commentId", requireAuth, commentLimiter, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.commentId)) {
      return res.status(400).json({ message: "Invalid comment ID." });
    }
    const validationError = validateCommentText(req.body?.content);
    if (validationError) return res.status(400).json({ message: validationError });
    const comment = await Comment.findOne({
      _id: req.params.commentId,
      author: req.userId,
      status: "visible",
    });
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    const content = req.body.content.trim();
    const duplicate = await Comment.findOne({
      _id: { $ne: comment._id },
      author: req.userId,
      videoId: comment.videoId,
      normalizedContent: normalizedText(content),
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }).select("_id");
    if (duplicate) {
      return res.status(409).json({ message: "You already posted this comment recently." });
    }

    comment.content = content;
    comment.normalizedContent = normalizedText(content);
    await comment.save();
    await ModerationRecord.create({
      comment: comment._id,
      actor: req.userId,
      action: "edited",
    });
    await comment.populate("author", "name channelname image");
    return res.status(200).json({ comment: safeComment(comment, req.userId) });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "You already posted this comment recently." });
    }
    console.error("Comment update error:", error);
    return res.status(500).json({ message: "Could not update the comment." });
  }
});

router.delete("/:commentId", requireAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.commentId)) {
      return res.status(400).json({ message: "Invalid comment ID." });
    }
    const comment = await Comment.findOne({
      _id: req.params.commentId,
      author: req.userId,
    });
    if (!comment) return res.status(404).json({ message: "Comment not found." });
    await Comment.deleteMany({ parent: comment._id });
    await ModerationRecord.create({
      comment: comment._id,
      actor: req.userId,
      action: "deleted",
    });
    await comment.deleteOne();
    return res.status(200).json({ message: "Comment deleted." });
  } catch (error) {
    console.error("Comment deletion error:", error);
    return res.status(500).json({ message: "Could not delete the comment." });
  }
});

router.post("/:commentId/vote", requireAuth, commentLimiter, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.commentId)) {
      return res.status(400).json({ message: "Invalid comment ID." });
    }
    const { vote } = req.body ?? {};
    if (vote !== "like" && vote !== "dislike") {
      return res.status(400).json({ message: "Choose like or dislike." });
    }
    const comment = await Comment.findOne({
      _id: req.params.commentId,
      status: "visible",
    });
    if (!comment) return res.status(404).json({ message: "Comment not found." });

    const userKey = req.userId.toString();
    const liked = comment.likes.some((id) => id.toString() === userKey);
    const disliked = comment.dislikes.some((id) => id.toString() === userKey);
    comment.likes = comment.likes.filter((id) => id.toString() !== userKey);
    comment.dislikes = comment.dislikes.filter((id) => id.toString() !== userKey);
    if (vote === "like" && !liked) comment.likes.push(req.userId);
    if (vote === "dislike" && !disliked) comment.dislikes.push(req.userId);
    comment.likeCount = comment.likes.length;
    comment.dislikeCount = comment.dislikes.length;
    await comment.save();
    return res.status(200).json({
      vote: vote === "like" ? (liked ? null : "like") : disliked ? null : "dislike",
      likeCount: comment.likeCount,
      dislikeCount: comment.dislikeCount,
    });
  } catch (error) {
    console.error("Comment vote error:", error);
    return res.status(500).json({ message: "Could not update the comment reaction." });
  }
});

router.post("/:commentId/report", requireAuth, commentLimiter, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.commentId)) {
      return res.status(400).json({ message: "Invalid comment ID." });
    }
    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim() : "";
    if (!reason || reason.length > 500) {
      return res.status(400).json({ message: "Provide a report reason of 1 to 500 characters." });
    }
    const comment = await Comment.findOne({
      _id: req.params.commentId,
      status: "visible",
    });
    if (!comment) return res.status(404).json({ message: "Comment not found." });
    if (comment.author.toString() === req.userId.toString()) {
      return res.status(400).json({ message: "You cannot report your own comment." });
    }

    await CommentReport.create({
      comment: comment._id,
      reporter: req.userId,
      reason,
    });
    await ModerationRecord.create({
      comment: comment._id,
      actor: req.userId,
      action: "reported",
      reason,
    });
    return res.status(201).json({ message: "Report sent for moderation review." });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "You have already reported this comment." });
    }
    console.error("Comment report error:", error);
    return res.status(500).json({ message: "Could not submit the comment report." });
  }
});

export default router;
