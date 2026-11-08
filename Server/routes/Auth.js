import { requireAuth } from "../middleware/auth.js";
import rateLimit from "express-rate-limit";
import express from "express";
import {
  register,
  login,
  googleLogin,
  verifyOtp,
  resendOtp,
  getMe,
  logout,
  updateprofile,
  getLoginHistory,
  updatePreferences,
} from "../controllers/Auth.js";

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const otpResendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

// Email and password authentication
router.post("/register", loginLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/otp/verify", otpVerifyLimiter, verifyOtp);
router.post("/otp/resend", otpResendLimiter, resendOtp);

// Google authentication
router.post("/google", loginLimiter, googleLogin);

// Current user and logout
router.get("/me", getMe);
router.post("/logout", logout);

// Channel profile update
router.patch("/update/:id", requireAuth, updateprofile);
router.get("/login-history", requireAuth, getLoginHistory);
router.patch("/preferences", requireAuth, updatePreferences);

export default router;
