import crypto from "node:crypto";
import express from "express";
import rateLimit from "express-rate-limit";
import { RoomServiceClient } from "livekit-server-sdk";
import Meeting from "../Modals/Meeting.js";
import users from "../Modals/Auth.js";
import { requireAuth } from "../middleware/auth.js";
import { createMeetingToken, getLiveKitConfig } from "../services/livekit.js";

const router = express.Router();
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

function roomService(config) {
  return new RoomServiceClient(config.apiUrl, config.apiKey, config.apiSecret);
}

router.use(requireAuth);

router.post("/", createLimiter, async (req, res) => {
  try {
    const config = getLiveKitConfig();
    if (!config) {
      return res.status(503).json({ message: "LiveKit is not configured on the server." });
    }

    const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
    const mode = req.body?.mode;
    if (!title || title.length > 120 || !["one-to-one", "group"].includes(mode)) {
      return res.status(400).json({ message: "Enter a meeting title and choose one-to-one or group." });
    }
    const user = await users.findById(req.userId).select("name channelname email");
    if (!user) return res.status(404).json({ message: "User not found." });

    const roomId = crypto.randomUUID().replaceAll("-", "");
    const meeting = await Meeting.create({
      roomId,
      host: user._id,
      title,
      mode,
      maxParticipants: mode === "one-to-one" ? 2 : 100,
    });

    try {
      await roomService(config).createRoom({
        name: roomId,
        maxParticipants: meeting.maxParticipants,
        emptyTimeout: 10 * 60,
      });
    } catch (error) {
      await Meeting.deleteOne({ _id: meeting._id });
      console.error("LiveKit room creation error:", error);
      return res.status(502).json({ message: "Could not create the LiveKit room." });
    }

    return res.status(201).json({
      meeting: {
        roomId,
        title: meeting.title,
        mode: meeting.mode,
        url: `/meeting/${roomId}`,
      },
    });
  } catch (error) {
    console.error("Meeting creation error:", error);
    return res.status(500).json({ message: "Could not create the meeting." });
  }
});

router.get("/:roomId", async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ roomId: req.params.roomId })
      .populate("host", "name channelname");
    if (!meeting) return res.status(404).json({ message: "Meeting not found." });
    if (meeting.status !== "active") {
      return res.status(410).json({ message: "This meeting has ended." });
    }
    if (meeting.locked && meeting.host._id.toString() !== req.userId.toString()) {
      return res.status(423).json({ message: "This meeting is locked by the host." });
    }
    return res.status(200).json({
      meeting: {
        roomId: meeting.roomId,
        title: meeting.title,
        mode: meeting.mode,
        locked: meeting.locked,
        startedAt: meeting.startedAt,
        isHost: meeting.host._id.toString() === req.userId.toString(),
        hostName: meeting.host.name || meeting.host.channelname || "Host",
      },
    });
  } catch (error) {
    console.error("Meeting lookup error:", error);
    return res.status(500).json({ message: "Could not load meeting details." });
  }
});

router.post("/:roomId/token", async (req, res) => {
  try {
    const config = getLiveKitConfig();
    if (!config) {
      return res.status(503).json({ message: "LiveKit is not configured on the server." });
    }
    const meeting = await Meeting.findOne({
      roomId: req.params.roomId,
      status: "active",
    });
    if (!meeting) return res.status(404).json({ message: "Active meeting not found." });
    const isHost = meeting.host.toString() === req.userId.toString();
    if (meeting.locked && !isHost) {
      return res.status(423).json({ message: "This meeting is locked by the host." });
    }

    const user = await users.findById(req.userId).select("name channelname email");
    if (!user) return res.status(404).json({ message: "User not found." });
    const identity = `${user._id}-${crypto.randomUUID().slice(0, 8)}`;
    const token = await createMeetingToken({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      roomId: meeting.roomId,
      identity,
      name: user.name || user.channelname || user.email,
      isHost,
    });

    return res.status(200).json({
      token,
      serverUrl: config.serverUrl,
      meeting: {
        roomId: meeting.roomId,
        title: meeting.title,
        mode: meeting.mode,
        locked: meeting.locked,
        startedAt: meeting.startedAt,
        isHost,
      },
    });
  } catch (error) {
    console.error("Meeting token error:", error);
    return res.status(500).json({ message: "Could not join this meeting." });
  }
});

router.patch("/:roomId/lock", async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ roomId: req.params.roomId, host: req.userId, status: "active" });
    if (!meeting) return res.status(404).json({ message: "Active meeting not found or you are not the host." });
    if (typeof req.body?.locked !== "boolean") {
      return res.status(400).json({ message: "Provide a true or false lock state." });
    }
    meeting.locked = req.body.locked;
    await meeting.save();
    return res.status(200).json({ locked: meeting.locked });
  } catch (error) {
    console.error("Meeting lock update error:", error);
    return res.status(500).json({ message: "Could not update meeting permissions." });
  }
});

router.post("/:roomId/remove", async (req, res) => {
  try {
    const config = getLiveKitConfig();
    if (!config) return res.status(503).json({ message: "LiveKit is not configured on the server." });
    const meeting = await Meeting.findOne({ roomId: req.params.roomId, host: req.userId, status: "active" });
    if (!meeting) return res.status(404).json({ message: "Active meeting not found or you are not the host." });
    const { identity } = req.body ?? {};
    if (typeof identity !== "string" || !identity || identity.startsWith(`${req.userId}-`)) {
      return res.status(400).json({ message: "Choose a valid participant to remove." });
    }
    await roomService(config).removeParticipant(meeting.roomId, identity);
    return res.status(200).json({ message: "Participant removed." });
  } catch (error) {
    console.error("Participant removal error:", error);
    return res.status(500).json({ message: "Could not remove the participant." });
  }
});

router.post("/:roomId/mute", async (req, res) => {
  try {
    const config = getLiveKitConfig();
    if (!config) return res.status(503).json({ message: "LiveKit is not configured on the server." });
    const meeting = await Meeting.findOne({ roomId: req.params.roomId, host: req.userId, status: "active" });
    if (!meeting) return res.status(404).json({ message: "Active meeting not found or you are not the host." });
    const { identity, trackSid, muted } = req.body ?? {};
    if (
      typeof identity !== "string" ||
      typeof trackSid !== "string" ||
      typeof muted !== "boolean" ||
      identity.startsWith(`${req.userId}-`)
    ) {
      return res.status(400).json({ message: "Choose a participant audio track and mute state." });
    }
    await roomService(config).mutePublishedTrack(meeting.roomId, identity, trackSid, muted);
    return res.status(200).json({ message: muted ? "Participant muted." : "Participant unmuted." });
  } catch (error) {
    console.error("Participant mute error:", error);
    return res.status(500).json({ message: "Could not update participant audio." });
  }
});

router.post("/:roomId/end", async (req, res) => {
  try {
    const config = getLiveKitConfig();
    if (!config) return res.status(503).json({ message: "LiveKit is not configured on the server." });
    const meeting = await Meeting.findOne({ roomId: req.params.roomId, host: req.userId, status: "active" });
    if (!meeting) return res.status(404).json({ message: "Active meeting not found or you are not the host." });
    await roomService(config).deleteRoom(meeting.roomId);
    meeting.status = "ended";
    meeting.endedAt = new Date();
    await meeting.save();
    return res.status(200).json({ message: "Meeting ended." });
  } catch (error) {
    console.error("Meeting end error:", error);
    return res.status(500).json({ message: "Could not end the meeting." });
  }
});

export default router;
