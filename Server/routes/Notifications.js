import express from "express";
import Notification from "../Modals/Notification.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: req.userId })
        .sort({ createdAt: -1 })
        .limit(30)
        .populate("channel", "channelname")
        .populate("video", "title")
        .lean(),
      Notification.countDocuments({ recipient: req.userId, readAt: null }),
    ]);

    return res.status(200).json({
      unreadCount,
      notifications: notifications
        .filter((notification) => notification.channel && notification.video)
        .map((notification) => ({
          id: notification._id,
          channelId: notification.channel._id,
          channelName: notification.channel.channelname,
          videoTitle: notification.video.title,
          createdAt: notification.createdAt,
          read: Boolean(notification.readAt),
        })),
    });
  } catch (error) {
    console.error("Notification load error:", error);
    return res.status(500).json({ message: "Could not load notifications." });
  }
});

router.post("/read", async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.userId, readAt: null },
      { $set: { readAt: new Date() } },
    );
    return res.status(200).json({ markedRead: result.modifiedCount });
  } catch (error) {
    console.error("Notification read error:", error);
    return res.status(500).json({ message: "Could not mark notifications as read." });
  }
});

export default router;
