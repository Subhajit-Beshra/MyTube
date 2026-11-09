
import crypto from "node:crypto";
import nodemailer from "nodemailer";

export class OtpDeliveryError extends Error {}

async function getProviderErrorDetail(response) {
  try {
    const body = await response.json();
    const code = typeof body.code === "string" ? body.code : "";
    const message = typeof body.message === "string" ? body.message : "";
    const detail = [code, message]
      .filter(Boolean)
      .join(": ")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .slice(0, 300);

    return detail;
  } catch {
    return "";
  }
}

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

  const brevoApiKey = process.env.BREVO_API_KEY;
  const from = process.env.EMAIL_FROM;
  const message = {
    subject: "Your MyTube verification code",
    text: `Your MyTube verification code is ${otp}. It expires in 5 minutes.`,
    html: `<p>Your MyTube verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:4px">${otp}</p><p>This code expires in 5 minutes.</p>`,
  };

  if (brevoApiKey) {
    if (!from) {
      throw new OtpDeliveryError(
        "EMAIL_FROM is required when using the Brevo email provider.",
      );
    }

    let response;
    try {
      response = await fetchImpl("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": brevoApiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: process.env.EMAIL_FROM_NAME || "MyTube",
            email: from,
          },
          to: [{ email }],
          subject: message.subject,
          textContent: message.text,
          htmlContent: message.html,
        }),
      });
    } catch (error) {
      throw new OtpDeliveryError(
        "Could not send the verification email through Brevo. Check the backend's HTTPS connectivity and try again.",
        { cause: error },
      );
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new OtpDeliveryError(
          "Brevo authentication failed (HTTP 401). Set BREVO_API_KEY to a valid Brevo API v3 key in the backend service environment, then redeploy.",
        );
      }

      const detail = await getProviderErrorDetail(response);
      throw new OtpDeliveryError(
        `Brevo rejected the email request (HTTP ${response.status}). ${
          detail
            ? `Brevo says: ${detail}`
            : "Verify that EMAIL_FROM is a bare email address registered and verified as a sender in Brevo."
        }`,
      );
    }
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
        ...message,
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
        ...message,
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
