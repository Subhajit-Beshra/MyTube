
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ["user", "staff"],
      default: "user",
      index: true,
    },
    accountStatus: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
      index: true,
    },
    suspensionReason: {
      type: String,
      maxlength: 500,
      default: "",
    },

    name: {
      type: String,
      trim: true,
    },

    // Store a hashed password, never the original password.
    passwordHash: {
      type: String,
      select: false,
    },

    // Google's unique ID for this user, when applicable.
    googleId: {
      type: String,
      sparse: true,
    },

    channelname: {
      type: String,
    },

    description: {
      type: String,
    },

    image: {
      type: String,
    },

    joinedon: {
      type: Date,
      default: Date.now,
    },

    plan: {
      type: String,
      enum: ["Free", "Bronze", "Silver", "Gold"],
      default: "Free",
    },

    subscriptionStatus: {
      type: String,
      enum: ["free", "active", "canceled", "expired"],
      default: "free",
    },

    subscriptionExpiresAt: {
      type: Date,
      default: null,
    },

    subscriptionPaymentAt: {
      type: Date,
      default: null,
    },

    subscriptionOrderId: {
      type: String,
      default: "",
    },

    themePreference: {
      type: String,
      enum: ["auto", "light", "dark"],
      default: "auto",
    },

    lastLoginTheme: {
      type: String,
      enum: ["light", "dark"],
      default: "dark",
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    downloadQuotaDay: {
      type: String,
      default: "",
    },

    downloadQuotaUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.models.user ||
  mongoose.model("user", userSchema);
