import users from "../Modals/Auth.js";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import LoginHistory from "../Modals/LoginHistory.js";
import AuthChallenge from "../Modals/AuthChallenge.js";
import TrustedDevice from "../Modals/TrustedDevice.js";
import {
  generateOtp,
  hashOtp,
  OtpDeliveryError,
  sendOtpEmail,
  verifyOtpHash,
} from "../services/otp.js";

// Google sign-in verification
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

// Create a JWT and store it in an HTTP-only cookie
const createToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const setAuthCookie = (res, token) => {
  res.cookie("mytube_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
};

const trustedDeviceCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 30 * 24 * 60 * 60 * 1000,
  path: "/",
};

const setTrustedDeviceCookie = (res, token) => {
  res.cookie("mytube_device", token, trustedDeviceCookieOptions);
};

// Return safe user information (never the password hash)
const safeUser = (user) => ({
  id: user._id,
  email: user.email,
  name: user.name,
  image: user.image,
  channelname: user.channelname,
  description: user.description,
  plan: user.plan,
  subscriptionStatus: user.subscriptionStatus,
  subscriptionExpiresAt: user.subscriptionExpiresAt,
  themePreference: user.themePreference,
  lastLoginTheme: user.lastLoginTheme,
  role: user.role || "user",
});

const requestDevice = (req) => {
  const userAgent = req.get("user-agent") || "";
  const browser =
    userAgent.match(/Edg\/[\d.]+/i)?.[0]?.split("/")[0] ||
    userAgent.match(/Chrome\/[\d.]+/i)?.[0]?.split("/")[0] ||
    userAgent.match(/Firefox\/[\d.]+/i)?.[0]?.split("/")[0] ||
    userAgent.match(/Version\/[\d.]+.*Safari/i)?.[0]?.replace(/\/.*/, "") ||
    "Unknown";
  const operatingSystem =
    /Windows/i.test(userAgent) ? "Windows" :
    /Android/i.test(userAgent) ? "Android" :
    /iPhone|iPad|iOS/i.test(userAgent) ? "iOS" :
    /Mac OS|Macintosh/i.test(userAgent) ? "macOS" :
    /Linux/i.test(userAgent) ? "Linux" : "Unknown";
  const deviceType =
    /iPad|Tablet/i.test(userAgent) ? "Tablet" :
    /Mobile|Android|iPhone/i.test(userAgent) ? "Mobile" :
    userAgent ? "Desktop" : "Unknown";

  return { ipAddress: req.ip || "", browser, operatingSystem, deviceType };
};

const loginThemeForCurrentTime = () => {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  );
  return hour >= 5 && hour < 12 ? "light" : "dark";
};

const recordLogin = async (user, req, succeeded) => {
  const device = requestDevice(req);
  let isNewDevice = false;
  if (succeeded && user) {
    const previous = await LoginHistory.findOne({ user: user._id, succeeded: true })
      .sort({ timestamp: -1 })
      .lean();
    isNewDevice = Boolean(
      previous &&
      (previous.browser !== device.browser ||
        previous.operatingSystem !== device.operatingSystem ||
        previous.deviceType !== device.deviceType),
    );
  }
  await LoginHistory.create({
    user: user?._id ?? null,
    email: user?.email ?? (typeof req.body?.email === "string" ? req.body.email : "unknown"),
    succeeded,
    ...device,
    isNewDevice,
  });
  return isNewDevice;
};

const recordSuccessfulLogin = async (user, req) => {
  user.lastLoginAt = new Date();
  user.lastLoginTheme =
    user.themePreference === "light" || user.themePreference === "dark"
      ? user.themePreference
      : loginThemeForCurrentTime();
  await user.save();
  await recordLogin(user, req, true);
};

const maskEmail = (email) => {
  const [localPart, domain] = email.split("@");
  return `${localPart.slice(0, 1)}${"*".repeat(Math.max(2, localPart.length - 1))}@${domain}`;
};

const startOtpChallenge = async (user) => {
  const challengeId = crypto.randomUUID();
  const otp = generateOtp();
  const now = new Date();
  const challenge = await AuthChallenge.create({
    challengeId,
    user: user._id,
    codeHash: hashOtp(challengeId, otp),
    expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
    cleanupAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    resendAfter: new Date(now.getTime() + 60 * 1000),
  });

  try {
    await sendOtpEmail(user.email, otp);
  } catch (error) {
    await challenge.deleteOne();
    throw error;
  }

  return { challengeId, maskedEmail: maskEmail(user.email) };
};

const getTrustedDevice = async (user, req) => {
  const token = req.cookies?.mytube_device;
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) return null;

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return TrustedDevice.findOneAndUpdate(
    { user: user._id, tokenHash, expiresAt: { $gt: new Date() } },
    {
      $set: { lastUsedAt: new Date() },
      $max: { expiresAt: new Date(Date.now() + trustedDeviceCookieOptions.maxAge) },
    },
    { new: true },
  );
};

const rememberTrustedDevice = async (user, req, res) => {
  const token = crypto.randomBytes(32).toString("hex");
  const device = requestDevice(req);
  await TrustedDevice.create({
    user: user._id,
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    ...device,
    expiresAt: new Date(Date.now() + trustedDeviceCookieOptions.maxAge),
  });
  setTrustedDeviceCookie(res, token);
};

const completeLogin = async (user, req, res, trustDevice = false) => {
  if (trustDevice) await rememberTrustedDevice(user, req, res);
  else {
    const token = req.cookies?.mytube_device;
    if (typeof token === "string" && /^[a-f0-9]{64}$/.test(token)) {
      setTrustedDeviceCookie(res, token);
    }
  }
  await recordSuccessfulLogin(user, req);
  setAuthCookie(res, createToken(user._id.toString()));
  return res.status(200).json({
    message: "Login successful.",
    user: safeUser(user),
  });
};

const beginLoginVerification = async (user, res) => {
  const challenge = await startOtpChallenge(user);
  return res.status(202).json({
    message: "Enter the verification code sent to your email.",
    requiresOtp: true,
    ...challenge,
  });
};

// Register using email and password
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      name.trim().length > 100 ||
      password.length < 8
    ) {
      return res.status(400).json({
        message: "Enter your name, a valid email, and a password of at least 8 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await users.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists. Try logging in.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await users.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    try {
      const challenge = await startOtpChallenge(user);
      return res.status(202).json({
        message: "Verify your email to finish creating your account.",
        requiresOtp: true,
        ...challenge,
      });
    } catch (error) {
      await user.deleteOne();
      throw error;
    }
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(error instanceof OtpDeliveryError ? 503 : 500).json({
      message: error instanceof OtpDeliveryError
        ? error.message
        : "Something went wrong during registration.",
    });
  }
};

// Login using email and password
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const user = await users
      .findOne({ email: email.trim().toLowerCase() })
      .select("+passwordHash");

    if (!user || !user.passwordHash) {
      await recordLogin(user, req, false);
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      await recordLogin(user, req, false);
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    if (user.accountStatus === "suspended") {
      return res.status(403).json({ message: "This account is suspended." });
    }

    if (!user.emailVerified) return beginLoginVerification(user, res);

    const trustedDevice = await getTrustedDevice(user, req);
    if (!trustedDevice) return beginLoginVerification(user, res);

    return completeLogin(user, req, res);
  } catch (error) {
    console.error("Login error:", error);
    return res.status(error instanceof OtpDeliveryError ? 503 : 500).json({
      message: error instanceof OtpDeliveryError
        ? error.message
        : "Something went wrong during login.",
    });
  }
};

// Login or register using a Google ID token
export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (
      typeof credential !== "string" ||
      !process.env.GOOGLE_CLIENT_ID
    ) {
      return res.status(400).json({
        message: "Google sign-in is not configured correctly.",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || !payload.email_verified) {
      return res.status(401).json({
        message: "Google account verification failed.",
      });
    }

    const email = payload.email.toLowerCase();

    let user = await users.findOne({ googleId: payload.sub });

    if (!user) {
      const existingUser = await users.findOne({ email });

      // Never automatically link Google to an existing password account.
      if (existingUser) {
        return res.status(409).json({
          message: "An account already exists with this email. Log in with that account first.",
        });
      }

      user = await users.create({
        email,
        emailVerified: true,
        googleId: payload.sub,
        name: payload.name || "",
        image: payload.picture || "",
      });
    }

    if (user.accountStatus === "suspended") {
      return res.status(403).json({ message: "This account is suspended." });
    }

    if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }
    if (!(await getTrustedDevice(user, req))) {
      return beginLoginVerification(user, res);
    }

    return completeLogin(user, req, res);
  } catch (error) {
    console.error("Google sign-in error:", error);
    return res.status(error instanceof OtpDeliveryError ? 503 : 401).json({
      message: error instanceof OtpDeliveryError ? error.message : "Google sign-in failed.",
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { challengeId, otp } = req.body ?? {};
    if (
      typeof challengeId !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(challengeId) ||
      typeof otp !== "string" ||
      !/^\d{6}$/.test(otp)
    ) {
      return res.status(400).json({ message: "Enter the 6-digit code from your email." });
    }

    const now = new Date();
    const challenge = await AuthChallenge.findOneAndUpdate(
      {
        challengeId,
        usedAt: null,
        expiresAt: { $gt: now },
        attempts: { $lt: 5 },
      },
      { $inc: { attempts: 1 } },
      { new: true },
    );
    if (!challenge) {
      const current = await AuthChallenge.findOne({ challengeId, usedAt: null }).select(
        "expiresAt attempts",
      );
      if (!current) return res.status(410).json({ message: "This verification code is no longer valid. Sign in again." });
      if (current.expiresAt <= now) return res.status(410).json({ message: "This verification code has expired. Request a new one." });
      return res.status(429).json({ message: "Too many incorrect codes. Request a new code." });
    }

    if (!verifyOtpHash(challengeId, otp, challenge.codeHash)) {
      return res.status(401).json({ message: "The verification code is incorrect." });
    }

    const claimed = await AuthChallenge.findOneAndUpdate(
      {
        _id: challenge._id,
        usedAt: null,
        expiresAt: { $gt: new Date() },
      },
      { $set: { usedAt: new Date() } },
      { new: true },
    );
    if (!claimed) {
      return res.status(409).json({ message: "This verification code has already been used." });
    }

    const user = await users.findById(challenge.user);
    if (!user) return res.status(404).json({ message: "The account for this code no longer exists." });
    if (user.accountStatus === "suspended") {
      return res.status(403).json({ message: "This account is suspended." });
    }

    if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }
    return completeLogin(user, req, res, true);
  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({ message: "Could not verify the email code." });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { challengeId } = req.body ?? {};
    if (typeof challengeId !== "string" || !/^[0-9a-f-]{36}$/i.test(challengeId)) {
      return res.status(400).json({ message: "A valid verification request is required." });
    }

    const now = new Date();
    const challenge = await AuthChallenge.findOneAndUpdate(
      {
        challengeId,
        usedAt: null,
        cleanupAt: { $gt: now },
        resendAfter: { $lte: now },
        resendCount: { $lt: 5 },
      },
      {
        $set: { resendAfter: new Date(now.getTime() + 60 * 1000) },
        $inc: { resendCount: 1 },
      },
      { new: true },
    );
    if (!challenge) {
      const current = await AuthChallenge.findOne({ challengeId, usedAt: null }).select(
        "resendAfter resendCount cleanupAt",
      );
      if (!current || current.cleanupAt <= now) {
        return res.status(410).json({ message: "This verification request has expired. Sign in again." });
      }
      if (current.resendCount >= 5) {
        return res.status(429).json({ message: "The resend limit was reached. Sign in again to restart verification." });
      }
      return res.status(429).json({ message: "Wait a minute before requesting another code." });
    }

    const user = await users.findById(challenge.user).select("email");
    if (!user) return res.status(404).json({ message: "The account for this code no longer exists." });

    const otp = generateOtp();
    await sendOtpEmail(user.email, otp);
    const updated = await AuthChallenge.findOneAndUpdate(
      { _id: challenge._id, usedAt: null },
      {
        $set: {
          codeHash: hashOtp(challengeId, otp),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          cleanupAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      },
      { new: true },
    );
    if (!updated) {
      return res.status(409).json({ message: "This verification request has already been completed." });
    }

    return res.status(200).json({ message: "A new verification code was sent." });
  } catch (error) {
    console.error("OTP resend error:", error);
    return res.status(error instanceof OtpDeliveryError ? 503 : 500).json({
      message: error instanceof OtpDeliveryError
        ? error.message
        : "Could not send a new verification code.",
    });
  }
};

// Get the currently authenticated user
export const getMe = async (req, res) => {
  try {
    const token = req.cookies?.mytube_token;

    if (!token) {
      return res.status(401).json({
        message: "You are not logged in.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (
      typeof decoded !== "object" ||
      !decoded.userId
    ) {
      return res.status(401).json({
        message: "Invalid session.",
      });
    }

    const user = await users.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        message: "User not found.",
      });
    }
    if (user.accountStatus === "suspended") {
      return res.status(403).json({ message: "This account is suspended." });
    }

    return res.status(200).json({
      user: safeUser(user),
    });
  } catch {
    return res.status(401).json({
      message: "Session expired or invalid. Please log in again.",
    });
  }
};

// Logout
export const logout = (req, res) => {
  res.clearCookie("mytube_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return res.status(200).json({
    message: "Logged out successfully.",
  });
};

// Update a user's channel profile
export const updateprofile = async (req, res) => {
  try {
    const { id } = req.params;
    const { channelname, description } = req.body;

    if (
      typeof channelname !== "string" ||
      !channelname.trim() ||
      channelname.trim().length > 100 ||
      typeof description !== "string" ||
      description.length > 500
    ) {
      return res.status(400).json({
        message: "Enter a channel name and a description no longer than 500 characters.",
      });
    }

    if (id !== req.userId) {
      return res.status(403).json({
        message: "You can only update your own profile.",
      });
    }

    const user = await users.findById(id);

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    user.channelname = channelname.trim();
    user.description = description.trim();

    await user.save();

    return res.status(200).json({
      user: safeUser(user),
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return res.status(500).json({
      message: "Something went wrong while updating the profile.",
    });
  }
};

export const getLoginHistory = async (req, res) => {
  try {
    const history = await LoginHistory.find({ user: req.userId })
      .sort({ timestamp: -1 })
      .limit(100)
      .select("succeeded timestamp ipAddress browser operatingSystem deviceType isNewDevice");
    return res.status(200).json({ history });
  } catch (error) {
    console.error("Login history error:", error);
    return res.status(500).json({ message: "Could not load login history." });
  }
};

export const updatePreferences = async (req, res) => {
  try {
    const { themePreference } = req.body ?? {};
    if (!["auto", "light", "dark"].includes(themePreference)) {
      return res.status(400).json({ message: "Choose auto, light, or dark theme." });
    }

    const user = await users.findByIdAndUpdate(
      req.userId,
      { $set: { themePreference } },
      { new: true, runValidators: true },
    );
    if (!user) return res.status(404).json({ message: "User not found." });
    user.lastLoginTheme =
      themePreference === "auto" ? loginThemeForCurrentTime() : themePreference;
    await user.save();
    return res.status(200).json({ user: safeUser(user) });
  } catch (error) {
    console.error("Preference update error:", error);
    return res.status(500).json({ message: "Could not update account preferences." });
  }
};
