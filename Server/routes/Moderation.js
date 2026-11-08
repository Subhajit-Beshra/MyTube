import express from "express";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import AccountReport from "../Modals/AccountReport.js";
import Comment from "../Modals/Comment.js";
import CommentReport from "../Modals/CommentReport.js";
import StaffAction from "../Modals/StaffAction.js";
import users from "../Modals/Auth.js";
import VideoModeration from "../Modals/VideoModeration.js";
import VideoReport from "../Modals/VideoReport.js";
import { requireAuth, requireStaff } from "../middleware/auth.js";
import {
  isValidModerationReason,
  isValidReportResolution,
  isValidVideoId,
} from "../services/moderation.js";

const router = express.Router();
const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const visibilityLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
router.get("/videos/:videoId/status", async (req, res) => {
  try {
    if (!isValidVideoId(req.params.videoId)) {
      return res.status(400).json({ message: "Invalid video ID." });
    }
    const hidden = await VideoModeration.exists({
      videoId: req.params.videoId,
      status: "hidden",
    });
    return res.status(200).json({ visible: !hidden });
  } catch (error) {
    console.error("Video moderation status error:", error);
    return res.status(500).json({ message: "Could not check video availability." });
  }
});

router.post("/videos/visibility", visibilityLimiter, async (req, res) => {
  try {
    const { videoIds } = req.body ?? {};
    if (
      !Array.isArray(videoIds) ||
      videoIds.length > 100 ||
      videoIds.some((videoId) => !isValidVideoId(videoId))
    ) {
      return res.status(400).json({ message: "Provide up to 100 valid video IDs." });
    }
    const hiddenVideos = await VideoModeration.find({
      videoId: { $in: [...new Set(videoIds)] },
      status: "hidden",
    })
      .select("videoId")
      .lean();
    return res.status(200).json({ hiddenVideoIds: hiddenVideos.map(({ videoId }) => videoId) });
  } catch (error) {
    console.error("Video moderation visibility error:", error);
    return res.status(500).json({ message: "Could not check video availability." });
  }
});

router.use(requireAuth);

router.post("/videos/:videoId/report", reportLimiter, async (req, res) => {
  try {
    const { provider, title, reason } = req.body ?? {};
    if (
      !isValidVideoId(req.params.videoId) ||
      !["platform", "youtube"].includes(provider) ||
      (typeof title !== "string" || title.length > 500) ||
      !isValidModerationReason(reason)
    ) {
      return res.status(400).json({ message: "Provide a video, provider, title, and report reason." });
    }
    await VideoReport.create({
      videoId: req.params.videoId,
      provider,
      title: title.trim(),
      reporter: req.userId,
      reason: reason.trim(),
    });
    return res.status(201).json({ message: "Video report sent for moderation review." });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "You have already reported this video." });
    }
    console.error("Video report error:", error);
    return res.status(500).json({ message: "Could not submit the video report." });
  }
});

router.post("/accounts/:userId/report", reportLimiter, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }
    if (req.params.userId === req.userId.toString()) {
      return res.status(400).json({ message: "You cannot report your own account." });
    }
    if (!isValidModerationReason(req.body?.reason)) {
      return res.status(400).json({ message: "Provide a report reason of 1 to 500 characters." });
    }
    const reportedUser = await users.findById(req.params.userId).select("_id");
    if (!reportedUser) return res.status(404).json({ message: "User not found." });

    await AccountReport.create({
      reportedUser: reportedUser._id,
      reporter: req.userId,
      reason: req.body.reason.trim(),
    });
    return res.status(201).json({ message: "Account report sent for moderation review." });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "You have already reported this account." });
    }
    console.error("Account report error:", error);
    return res.status(500).json({ message: "Could not submit the account report." });
  }
});

router.get("/reports", requireStaff, async (req, res) => {
  try {
    const status = req.query.status ?? "open";
    if (!["open", "reviewed", "dismissed", "all"].includes(status)) {
      return res.status(400).json({ message: "Choose a valid report status." });
    }
    const filter = status === "all" ? {} : { status };
    const [commentReports, videoReports, accountReports] = await Promise.all([
      CommentReport.find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .populate({ path: "comment", select: "videoId content author", populate: { path: "author", select: "name" } })
        .populate("reporter", "name email")
        .lean(),
      VideoReport.find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("reporter", "name email")
        .lean(),
      AccountReport.find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("reportedUser", "name email accountStatus")
        .populate("reporter", "name email")
        .lean(),
    ]);

    return res.status(200).json({
      commentReports,
      videoReports,
      accountReports,
    });
  } catch (error) {
    console.error("Moderation report list error:", error);
    return res.status(500).json({ message: "Could not load moderation reports." });
  }
});

router.patch("/reports/:type/:reportId", requireStaff, async (req, res) => {
  try {
    const { type, reportId } = req.params;
    const { status, hideContent, reason } = req.body ?? {};
    if (!["comments", "videos", "accounts"].includes(type)) {
      return res.status(400).json({ message: "Choose a valid report type." });
    }
    if (!mongoose.isValidObjectId(reportId) || !isValidReportResolution(status)) {
      return res.status(400).json({ message: "Choose a valid report and resolution." });
    }
    if (
      hideContent !== undefined &&
      typeof hideContent !== "boolean"
    ) {
      return res.status(400).json({ message: "Content action must be true or false." });
    }
    const moderationReason = typeof reason === "string" ? reason.trim().slice(0, 500) : "";

    if (type === "comments") {
      const report = await CommentReport.findById(reportId);
      if (!report) return res.status(404).json({ message: "Comment report not found." });
      report.status = status;
      await report.save();
      if (typeof hideContent === "boolean") {
        const comment = await Comment.findById(report.comment);
        if (comment) {
          comment.status = hideContent ? "hidden" : "visible";
          await comment.save();
          await StaffAction.create({
            actor: req.userId,
            targetType: "comment",
            targetId: comment._id.toString(),
            action: hideContent ? "content-hidden" : "content-restored",
            reason: moderationReason,
          });
        }
      }
    } else if (type === "videos") {
      const report = await VideoReport.findById(reportId);
      if (!report) return res.status(404).json({ message: "Video report not found." });
      report.status = status;
      await report.save();
      if (typeof hideContent === "boolean") {
        await VideoModeration.findOneAndUpdate(
          { videoId: report.videoId },
          {
            $set: {
              provider: report.provider,
              status: hideContent ? "hidden" : "visible",
              reason: moderationReason,
              actor: req.userId,
            },
          },
          { upsert: true, new: true, runValidators: true },
        );
        await StaffAction.create({
          actor: req.userId,
          targetType: "video",
          targetId: report.videoId,
          action: hideContent ? "content-hidden" : "content-restored",
          reason: moderationReason,
        });
      }
    } else {
      const report = await AccountReport.findById(reportId);
      if (!report) return res.status(404).json({ message: "Account report not found." });
      report.status = status;
      await report.save();
    }

    await StaffAction.create({
      actor: req.userId,
      targetType: type === "comments" ? "comment" : type === "videos" ? "video" : "user",
      targetId: reportId,
      action: "report-reviewed",
      reason: moderationReason,
    });
    return res.status(200).json({ message: "Report updated." });
  } catch (error) {
    console.error("Moderation report update error:", error);
    return res.status(500).json({ message: "Could not update the report." });
  }
});

router.get("/users", requireStaff, async (req, res) => {
  try {
    const status = req.query.status ?? "suspended";
    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({ message: "Choose active or suspended accounts." });
    }
    const userList = await users
      .find({ accountStatus: status })
      .select("name email role accountStatus suspensionReason createdAt")
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();
    return res.status(200).json({ users: userList });
  } catch (error) {
    console.error("Moderation user list error:", error);
    return res.status(500).json({ message: "Could not load user accounts." });
  }
});

router.post("/users/:userId/suspend", requireStaff, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }
    if (req.params.userId === req.userId.toString()) {
      return res.status(400).json({ message: "You cannot suspend your own account." });
    }
    if (!isValidModerationReason(req.body?.reason)) {
      return res.status(400).json({ message: "Provide a suspension reason of 1 to 500 characters." });
    }
    const account = await users.findById(req.params.userId).select("role accountStatus");
    if (!account) return res.status(404).json({ message: "User not found." });
    if (account.role === "staff") {
      return res.status(409).json({ message: "Staff accounts cannot be suspended through this dashboard." });
    }

    await users.updateOne(
      { _id: account._id },
      { $set: { accountStatus: "suspended", suspensionReason: req.body.reason.trim() } },
    );
    await StaffAction.create({
      actor: req.userId,
      targetType: "user",
      targetId: account._id.toString(),
      action: "account-suspended",
      reason: req.body.reason.trim(),
    });
    return res.status(200).json({ message: "Account suspended." });
  } catch (error) {
    console.error("Account suspension error:", error);
    return res.status(500).json({ message: "Could not suspend this account." });
  }
});

router.post("/users/:userId/restore", requireStaff, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }
    const account = await users.findById(req.params.userId).select("accountStatus");
    if (!account) return res.status(404).json({ message: "User not found." });
    await users.updateOne(
      { _id: account._id },
      { $set: { accountStatus: "active", suspensionReason: "" } },
    );
    await StaffAction.create({
      actor: req.userId,
      targetType: "user",
      targetId: account._id.toString(),
      action: "account-restored",
    });
    return res.status(200).json({ message: "Account restored." });
  } catch (error) {
    console.error("Account restoration error:", error);
    return res.status(500).json({ message: "Could not restore this account." });
  }
});

export default router;
