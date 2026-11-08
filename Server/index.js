import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/Auth.js";
import subscriptionRoutes, { handleRazorpayWebhook } from "./routes/Subscriptions.js";
import downloadRoutes from "./routes/Downloads.js";
import commentRoutes from "./routes/Comments.js";
import meetingRoutes from "./routes/Meetings.js";
import moderationRoutes from "./routes/Moderation.js";

dotenv.config();

const app = express();

const allowedOrigins = new Set(
  (process.env.CLIENT_URL || "http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
);

app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.has(origin));
    },
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  })
);

app.use(cookieParser());
app.post(
  "/subscriptions/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
  handleRazorpayWebhook,
);
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));

app.get("/", (req, res) => {
  res.send("Youtube backend is working.");
});

app.get("/health", (_req, res) => {
  const ready = mongoose.connection.readyState === 1;
  return res.status(ready ? 200 : 503).json({
    status: ready ? "ok" : "not_ready",
    database: ready ? "connected" : "disconnected",
  });
});

app.use("/auth", authRoutes);
app.use("/subscriptions", subscriptionRoutes);
app.use("/downloads", downloadRoutes);
app.use("/comments", commentRoutes);
app.use("/meetings", meetingRoutes);
app.use("/moderation", moderationRoutes);

const PORT = process.env.PORT || 5000;
const dbURL = process.env.DB_URL;

if (!dbURL) {
  console.warn("DB_URL is not defined. MongoDB connection not established.");
} else {
  mongoose
    .connect(dbURL)
    .then(() => {
      console.log("MongoDB is connected✅!");
    })
    .catch((error) => {
      console.error("MongoDB connection error:", error);
    });
}

app.listen(PORT, () => {
  console.log(`Server started running on port ${PORT}`);
});
