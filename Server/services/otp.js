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

export function verifyOtpHash(challengeId, otp, expectedHash, secret = process.env.JWT_SECRET) {
  if (!/^\d{6}$/.test(otp) || typeof expectedHash !== "string") return false;
  const expected = Buffer.from(hashOtp(challengeId, otp, secret), "hex");
  const received = Buffer.from(expectedHash, "hex");
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

export async function sendOtpEmail(email, otp, fetcher = fetch) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new OtpDeliveryError("Email OTP delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM.");
  }

  let response;
  try {
    response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Your MyTube verification code",
        text: `Your MyTube verification code is ${otp}. It expires in 5 minutes. If you did not request this code, you can ignore this email.`,
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new OtpDeliveryError("The verification email could not be sent. Please try again later.");
  }

  if (!response.ok) {
    console.error("Email OTP provider returned status:", response.status);
    throw new OtpDeliveryError("The verification email could not be sent. Please try again later.");
  }
}
