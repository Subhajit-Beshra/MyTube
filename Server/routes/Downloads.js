import express from "express";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import Download from "../Modals/Download.js";
import VideoModeration from "../Modals/VideoModeration.js";
import users from "../Modals/Auth.js";
import { requireAuth } from "../middleware/auth.js";
import {
  expireSubscriptionIfNeeded,
  getDownloadLimit,
  getIndiaDayKey,
  getNextIndiaMidnight,
  resetDailyDownloadQuota,
} from "../services/plans.js";
import { getDownloadableVideo } from "../data/videos.js";

const router = express.Router();
const startLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const publicDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../public",
);

async function releaseStaleReservations(userId) {
  const dayKey = getIndiaDayKey();
  await Download.updateMany(
    {
      user: userId,
      status: "pending",
      dayKey: { $ne: dayKey },
      createdAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) },
    },
    { $set: { status: "failed" } },
  );
  const result = await Download.updateMany(
    {
      user: userId,
      status: "pending",
      dayKey,
      createdAt: { $lt: new Date(Date.now() - 30 * 60 * 1000) },
    },
    { $set: { status: "failed" } },
  );
  if (result.modifiedCount > 0) {
    await users.updateOne(
      { _id: userId },
      { $inc: { downloadQuotaUsed: -result.modifiedCount } },
    );
  }
}

async function loadQuotaUser(userId, dayKey) {
  await resetDailyDownloadQuota(userId, dayKey);
  const user = await users.findById(userId);
  if (!user) return null;
  await expireSubscriptionIfNeeded(user);
  return user;
}

async function reserveQuota(userId, dayKey) {
  const user = await loadQuotaUser(userId, dayKey);
  if (!user) return { error: "User not found.", status: 404 };
  const limit = getDownloadLimit(user.plan);
  const updatedUser = await users.findOneAndUpdate(
    {
      _id: userId,
      downloadQuotaDay: dayKey,
      downloadQuotaUsed: { $lt: limit },
    },
    { $inc: { downloadQuotaUsed: 1 } },
    { new: true },
  );
  if (!updatedUser) {
    return {
      error: `Daily download limit reached (${limit} per day).`,
      status: 429,
    };
  }
  return { user: updatedUser, limit };
}

async function failReservation(download, allowStarted = true) {
  const filter = { _id: download._id, status: "pending" };
  if (!allowStarted) filter.startedAt = null;
  const updated = await Download.findOneAndUpdate(
    filter,
    { $set: { status: "failed" } },
    { new: true },
  );
  if (updated) {
    await users.updateOne(
      { _id: download.user, downloadQuotaDay: download.dayKey },
      { $inc: { downloadQuotaUsed: -1 } },
    );
  }
  return updated;
}

function toSafeDownload(download) {
  return {
    id: download._id,
    videoId: download.videoId,
    title: download.title,
    filepath: download.filepath,
    filename: download.filename,
    filesize: download.filesize,
    status: download.status,
    createdAt: download.createdAt,
    completedAt: download.completedAt,
    attempt: download.attempt,
    startedAt: download.startedAt,
  };
}

router.use(requireAuth);

router.get("/quota", async (req, res) => {
  try {
    const dayKey = getIndiaDayKey();
    await releaseStaleReservations(req.userId);
    const user = await loadQuotaUser(req.userId, dayKey);
    if (!user) return res.status(404).json({ message: "User not found." });

    const limit = getDownloadLimit(user.plan);
    const used = Math.min(user.downloadQuotaUsed, limit);
    return res.status(200).json({
      quota: {
        plan: user.plan,
        limit,
        used,
        remaining: Math.max(0, limit - used),
        dayKey,
        resetsAt: getNextIndiaMidnight(),
      },
    });
  } catch (error) {
    console.error("Download quota lookup error:", error);
    return res.status(500).json({ message: "Could not load download quota." });
  }
});

router.get("/", async (req, res) => {
  try {
    const downloads = await Download.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(100);
    return res.status(200).json({ downloads: downloads.map(toSafeDownload) });
  } catch (error) {
    console.error("Download history error:", error);
    return res.status(500).json({ message: "Could not load download history." });
  }
});

router.post("/:videoId/start", startLimiter, async (req, res) => {
  try {
    if (await VideoModeration.exists({ videoId: req.params.videoId, status: "hidden" })) {
      return res.status(404).json({ message: "This video is no longer available." });
    }
    const video = getDownloadableVideo(req.params.videoId);
    if (!video) {
      return res.status(404).json({ message: "This video is not available for download." });
    }

    await releaseStaleReservations(req.userId);
    const dayKey = getIndiaDayKey();
    const existing = await Download.findOne({
      user: req.userId,
      videoId: req.params.videoId,
      dayKey,
    });
    if (existing?.status === "success") {
      return res.status(409).json({ message: "This video has already been downloaded today." });
    }
    if (existing?.status === "pending") {
      return res.status(409).json({ message: "A download for this video is already in progress." });
    }

    const reservation = await reserveQuota(req.userId, dayKey);
    if (reservation.error) {
      return res.status(reservation.status).json({ message: reservation.error });
    }

    let download;
    try {
      if (existing) {
        download = await Download.findOneAndUpdate(
          { _id: existing._id, status: "failed" },
          {
            $set: {
              title: video.title,
              filepath: video.filepath,
              filename: video.filename,
              filesize: video.filesize,
              status: "pending",
              completedAt: null,
              startedAt: null,
            },
            $inc: { attempt: 1 },
          },
          { new: true },
        );
        if (!download) {
          await users.updateOne({ _id: req.userId }, { $inc: { downloadQuotaUsed: -1 } });
          return res.status(409).json({ message: "A download for this video is already in progress." });
        }
      } else {
        download = await Download.create({
          user: req.userId,
          videoId: req.params.videoId,
          title: video.title,
          filepath: video.filepath,
          filename: video.filename,
          filesize: video.filesize,
          dayKey,
          status: "pending",
        });
      }
    } catch (error) {
      await users.updateOne({ _id: req.userId }, { $inc: { downloadQuotaUsed: -1 } });
      if (error?.code === 11000) {
        return res.status(409).json({ message: "A download for this video is already in progress." });
      }
      throw error;
    }

    return res.status(201).json({
      download: {
        id: download._id,
        title: download.title,
        filepath: download.filepath,
        filename: download.filename,
        filesize: download.filesize,
        downloadUrl: `/downloads/${download._id}/file`,
      },
    });
  } catch (error) {
    console.error("Download reservation error:", error);
    return res.status(500).json({ message: "Could not start the download." });
  }
});

router.get("/:downloadId/file", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.downloadId)) {
      return res.status(400).json({ message: "Invalid download ID." });
    }
    const download = await Download.findOneAndUpdate(
      {
        _id: req.params.downloadId,
        user: req.userId,
        status: "pending",
        startedAt: null,
      },
      { $set: { startedAt: new Date() } },
      { new: true },
    );
    if (!download) {
      return res.status(409).json({ message: "This download is not available or has already started." });
    }

    if (await VideoModeration.exists({ videoId: download.videoId, status: "hidden" })) {
      await failReservation(download);
      return res.status(404).json({ message: "This video is no longer available." });
    }

    const video = getDownloadableVideo(download.videoId);
    const filePath = video
      ? path.resolve(publicDirectory, `.${video.filepath}`)
      : "";
    if (!video || !filePath.startsWith(`${publicDirectory}${path.sep}`) || !existsSync(filePath)) {
      await failReservation(download);
      return res.status(404).json({ message: "The video file is unavailable." });
    }

    const fileStats = statSync(filePath);
    res.status(200).set({
      "Content-Type": "video/mp4",
      "Content-Length": String(fileStats.size),
      "Content-Disposition": `attachment; filename="${video.filename}"`,
      "Cache-Control": "private, no-store",
    });

    const stream = createReadStream(filePath);
    stream.on("error", (error) => {
      console.error("Video download stream error:", error);
      void failReservation(download).catch((failureError) => {
        console.error("Could not release failed video download:", failureError);
      });
      if (res.headersSent) res.destroy(error);
      else res.status(500).json({ message: "Could not read the video file." });
    });
    res.on("finish", () => {
      void Download.findOneAndUpdate(
        { _id: download._id, user: req.userId, status: "pending" },
        { $set: { status: "success", completedAt: new Date() } },
      ).catch((error) => {
        console.error("Could not record completed video download:", error);
      });
    });
    res.on("close", () => {
      if (!res.writableFinished) {
        stream.destroy();
        void failReservation(download).catch((error) => {
          console.error("Could not release interrupted video download:", error);
        });
      }
    });
    stream.pipe(res);
  } catch (error) {
    console.error("Video download stream error:", error);
    return res.status(500).json({ message: "Could not serve the video file." });
  }
});

router.patch("/:downloadId/fail", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.downloadId)) {
      return res.status(400).json({ message: "Invalid download ID." });
    }
    const download = await Download.findOne({
      _id: req.params.downloadId,
      user: req.userId,
      status: "pending",
      startedAt: null,
    });
    if (!download) {
      return res.status(409).json({ message: "This download cannot be marked failed after it has started." });
    }
    const updated = await failReservation(download, false);
    if (!updated) {
      return res.status(409).json({ message: "This download has already started." });
    }
    return res.status(200).json({ download: toSafeDownload(updated) });
  } catch (error) {
    console.error("Download failure update error:", error);
    return res.status(500).json({ message: "Could not record the failed download." });
  }
});

export default router;
