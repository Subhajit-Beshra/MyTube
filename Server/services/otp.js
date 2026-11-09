
import crypto from "node:crypto";
import nodemailer from "nodemailer";

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

export async function sendOtpEmail(
  email,
  otp,
  fetchImpl = fetch,
  createTransport = nodemailer.createTransport,
) {
  if (process.env.OTP_DEMO_MODE === "true") {
    console.log("MyTube demo OTP for", email, ":", otp);
    return;
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser || gmailAppPassword) {
    if (!gmailUser || !gmailAppPassword) {
      throw new OtpDeliveryError(
        "Both GMAIL_USER and GMAIL_APP_PASSWORD are required for Gmail delivery.",
      );
    }

    try {
      const transporter = createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: gmailUser,
          pass: gmailAppPassword.replace(/\s+/g, ""),
        },
      });
      await transporter.sendMail({
        from: `MyTube <${gmailUser}>`,
        to: email,
        subject: "Your MyTube verification code",
        text: `Your MyTube verification code is ${otp}. It expires in 5 minutes.`,
        html: `<p>Your MyTube verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${otp}</p><p>This code expires in 5 minutes.</p>`,
      });
      return;
    } catch (error) {
      throw new OtpDeliveryError(
        "Could not send the verification email through Gmail. Check the Gmail app password and try again.",
        { cause: error },
      );
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new OtpDeliveryError("Email delivery is not configured.");
  }

  let response;
  try {
    response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Your MyTube verification code",
        text: `Your MyTube verification code is ${otp}. It expires in 5 minutes.`,
        html: `<p>Your MyTube verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${otp}</p><p>This code expires in 5 minutes.</p>`,
      }),
    });
  } catch (error) {
    throw new OtpDeliveryError("Could not send the verification email. Please try again later.", {
      cause: error,
    });
  }

  if (!response.ok) {
    throw new OtpDeliveryError(
      `Email provider rejected the request (HTTP ${response.status}).`,
    );
  }
}
