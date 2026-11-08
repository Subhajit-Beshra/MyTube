import assert from "node:assert/strict";
import test from "node:test";
import {
  generateOtp,
  hashOtp,
  OtpDeliveryError,
  sendOtpEmail,
  verifyOtpHash,
} from "./otp.js";

test("OTP generation returns a six-digit decimal code", () => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    assert.match(generateOtp(), /^\d{6}$/);
  }
});

test("OTP hashes are bound to both the challenge and code", () => {
  const hash = hashOtp("challenge-1", "123456", "test-secret");
  assert.equal(verifyOtpHash("challenge-1", "123456", hash, "test-secret"), true);
  assert.equal(verifyOtpHash("challenge-2", "123456", hash, "test-secret"), false);
  assert.equal(verifyOtpHash("challenge-1", "654321", hash, "test-secret"), false);
  assert.equal(verifyOtpHash("challenge-1", "12345", hash, "test-secret"), false);
});

test("OTP email sends the code through the configured provider without returning credentials", async () => {
  const previous = {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM,
  };
  process.env.RESEND_API_KEY = "test-resend-key";
  process.env.EMAIL_FROM = "MyTube <noreply@example.com>";
  let request;
  try {
    await sendOtpEmail("viewer@example.com", "123456", async (url, options) => {
      request = { url, options };
      return { ok: true };
    });
    assert.equal(request.url, "https://api.resend.com/emails");
    assert.equal(request.options.headers.Authorization, "Bearer test-resend-key");
    assert.match(request.options.body, /123456/);
  } finally {
    if (previous.apiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previous.apiKey;
    if (previous.from === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = previous.from;
  }
});

test("OTP email reports missing configuration and provider errors", async () => {
  const previous = {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM,
  };
  try {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    await assert.rejects(
      sendOtpEmail("viewer@example.com", "123456"),
      OtpDeliveryError,
    );
    process.env.RESEND_API_KEY = "test-resend-key";
    process.env.EMAIL_FROM = "MyTube <noreply@example.com>";
    await assert.rejects(
      sendOtpEmail("viewer@example.com", "123456", async () => ({ ok: false, status: 401 })),
      OtpDeliveryError,
    );
  } finally {
    if (previous.apiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previous.apiKey;
    if (previous.from === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = previous.from;
  }
});
