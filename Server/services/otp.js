
import crypto from "node:crypto";

export class OtpDeliveryError extends Error {}

export function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashOtp(challengeId, otp, secret = process.env.JWT_SECRET) {
  if (!secret) throw new Error("JWT_SECRET is required to protect OTP challenges.");

  return crypto
    .createHmac("sha256", secret)
    .update(`${challengeId}:${otp}`)
    .digest("hex");
}

export function verifyOtpHash(
  challengeId,
  otp,
  expectedHash,
  secret = process.env.JWT_SECRET
) {
  if (!/^\d{6}$/.test(otp) || typeof expectedHash !== "string") return false;

  const expected = Buffer.from(hashOtp(challengeId, otp, secret), "hex");
  const received = Buffer.from(expectedHash, "hex");

  return (
    received.length === expected.length &&
    crypto.timingSafeEqual(received, expected)
  );
}

// DEMO MODE: Print OTP in backend logs instead of sending email.
export async function sendOtpEmail(email, otp) {
  if (process.env.OTP_DEMO_MODE !== "true") {
    throw new OtpDeliveryError("Email delivery is not configured.");
  }

  console.log("------------------------------------");
  console.log("MYTUBE DEMO OTP");
  console.log("Email:", email);
  console.log("OTP:", otp);
  console.log("Expires in 5 minutes.");
  console.log("------------------------------------");
}
