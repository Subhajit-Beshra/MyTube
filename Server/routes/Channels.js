import crypto from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import users from "../Modals/Auth.js";
import ChannelVideo from "../Modals/ChannelVideo.js";
import ChannelSubscription from "../Modals/ChannelSubscription.js";
import Notification from "../Modals/Notification.js";
import { requireAuth } from "../middleware/auth.js";
import {
  isSupportedVideoFile,
  MAX_CHANNEL_VIDEO_SIZE,
} from "../services/channel-videos.js";
import { buildUploadNotifications } from "../services/upload-notifications.js";

const router = express.Router();
export const channelUploadDirectory = fileURLToPath(
  new URL("../uploads/", import.meta.url),
);

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    mkdir(channelUploadDirectory, { recursive: true })
      .then(() => callback(null, channelUploadDirectory))
      .catch(callback);
  },
  filename(_req, file, callback) {
    callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const receiveVideo = multer({
  storage,
  limits: { fileSize: MAX_CHANNEL_VIDEO_SIZE, files: 1 },
  fileFilter(_req, file, callback) {
    if (!isSupportedVideoFile(file)) {
      callback(new Error("Upload an MP4, M4V, MOV, OGV, or WebM video."));
      return;
    }
    callback(null, true);
  },
}).single("video");

router.post("/:channelId/videos", requireAuth, (req, res, next) => {
  receiveVideo(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    const status = error instanceof multer.MulterError &&
      error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({
      message: status === 413
        ? "Video files must be 500 MiB or smaller."
        : error.message || "The video upload could not be processed.",
    });
  });
}, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.channelId) || req.params.channelId !== req.userId) {
    if (req.file) await unlink(req.file.path);
    return res.status(403).json({ message: "You can only upload videos to your own channel." });
  }

  const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
  const description = typeof req.body.description === "string"
    ? req.body.description.trim()
    : "";
  if (!req.file || !title || title.length > 150 || description.length > 5000) {
    if (req.file) await unlink(req.file.path);
    return res.status(400).json({
      message: "Choose a video, enter a title, and keep the description under 5,000 characters.",
    });
  }

  let video;
  try {
    const channel = await users.findById(req.userId).select("channelname");
    if (!channel?.channelname) {
      await unlink(req.file.path);
      return res.status(409).json({ message: "Create a channel before uploading videos." });
    }

    video = await ChannelVideo.create({
      channel: req.userId,
      title,
      description,
      filePath: `/uploads/${req.file.filename}`,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
    });

    const subscribers = await ChannelSubscription.find({ channel: req.userId })
      .select("subscriber")
      .lean();
    if (subscribers.length) {
      await Notification.insertMany(
        buildUploadNotifications(
          subscribers.map(({ subscriber }) => subscriber),
          req.userId,
          video._id,
        ),
      );
    }

    return res.status(201).json({
      video: {
        id: video._id,
        title: video.title,
        description: video.description,
        filePath: video.filePath,
        fileType: video.fileType,
        fileSize: video.fileSize,
        createdAt: video.createdAt,
      },
    });
  } catch (error) {
    if (video) {
      await Promise.all([
        video.deleteOne().catch((cleanupError) => {
          console.error("Failed to remove a channel video after notification failure:", cleanupError);
        }),
        Notification.deleteMany({ video: video._id }).catch((cleanupError) => {
          console.error("Failed to remove notifications for an incomplete upload:", cleanupError);
        }),
      ]);
    }
    try {
      await unlink(req.file.path);
    } catch (cleanupError) {
      console.error("Failed to remove an unrecorded channel video:", cleanupError);
    }
    console.error("Channel video upload error:", error);
    return res.status(500).json({ message: "The video could not be saved to your channel." });
  }
});

router.get("/:channelId/subscription", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.channelId)) {
    return res.status(404).json({ message: "This channel does not exist." });
  }
  try {
    const subscribed = await ChannelSubscription.exists({
      subscriber: req.userId,
      channel: req.params.channelId,
    });
    return res.status(200).json({ subscribed: Boolean(subscribed) });
  } catch (error) {
    console.error("Channel subscription status error:", error);
    return res.status(500).json({ message: "Could not load subscription status." });
  }
});

router.post("/:channelId/subscribe", requireAuth, async (req, res) => {
  if (
    !mongoose.isValidObjectId(req.params.channelId) ||
    req.params.channelId === req.userId
  ) {
    return res.status(400).json({ message: "You cannot subscribe to this channel." });
  }

  try {
    const channel = await users.findOne({
      _id: req.params.channelId,
      channelname: { $exists: true, $ne: "" },
    }).select("_id");
    if (!channel) return res.status(404).json({ message: "This channel does not exist." });

    await ChannelSubscription.updateOne(
      { subscriber: req.userId, channel: channel._id },
      { $setOnInsert: { subscriber: req.userId, channel: channel._id } },
      { upsert: true },
    );
    return res.status(200).json({ subscribed: true });
  } catch (error) {
    console.error("Channel subscribe error:", error);
    return res.status(500).json({ message: "Could not subscribe to this channel." });
  }
});

router.delete("/:channelId/subscribe", requireAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.channelId)) {
    return res.status(404).json({ message: "This channel does not exist." });
  }
  try {
    await ChannelSubscription.deleteOne({
      subscriber: req.userId,
      channel: req.params.channelId,
    });
    return res.status(200).json({ subscribed: false });
  } catch (error) {
    console.error("Channel unsubscribe error:", error);
    return res.status(500).json({ message: "Could not unsubscribe from this channel." });
  }
});

router.get("/:channelId", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.channelId)) {
    return res.status(404).json({ message: "This channel does not exist." });
  }

  try {
    const owner = await users.findById(req.params.channelId)
      .select("name channelname description image channelCreatedAt createdAt");
    if (!owner?.channelname) {
      return res.status(404).json({ message: "This channel does not exist." });
    }

    const videos = await ChannelVideo.find({ channel: owner._id })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      channel: {
        id: owner._id,
        name: owner.channelname,
        description: owner.description || "",
        image: owner.image || "",
        createdAt: owner.channelCreatedAt || owner.createdAt,
      },
      videos: videos.map((video) => ({
        id: video._id,
        title: video.title,
        description: video.description,
        filePath: video.filePath,
        fileType: video.fileType,
        fileSize: video.fileSize,
        createdAt: video.createdAt,
      })),
    });
  } catch (error) {
    console.error("Channel load error:", error);
    return res.status(500).json({ message: "Could not load this channel." });
  }
});

router.post("/", requireAuth, async (req, res) => {
  const channelname = typeof req.body?.channelname === "string"
    ? req.body.channelname.trim()
    : "";
  const description = typeof req.body?.description === "string"
    ? req.body.description.trim()
    : "";

  if (!channelname || channelname.length > 100 || description.length > 500) {
    return res.status(400).json({
      message: "Enter a channel name (up to 100 characters) and a description under 500 characters.",
    });
  }

  try {
    const user = await users.findOneAndUpdate(
      {
        _id: req.userId,
        $or: [
          { channelname: { $exists: false } },
          { channelname: null },
          { channelname: "" },
        ],
      },
      {
        $set: {
          channelname,
          description,
          channelCreatedAt: new Date(),
        },
      },
      { new: true, runValidators: true },
    );
    if (!user) {
      return res.status(409).json({ message: "You already have a channel." });
    }

    return res.status(201).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        image: user.image,
        channelname: user.channelname,
        description: user.description,
        hasChannel: true,
      },
    });
  } catch (error) {
    console.error("Channel creation error:", error);
    return res.status(500).json({ message: "Could not create your channel." });
  }
});

export default router;
