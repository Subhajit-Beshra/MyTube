import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { verifyRazorpayWebhookSignature } from "./razorpay.js";

test("Razorpay webhook verification authenticates the exact raw payload", () => {
  const secret = "test-webhook-secret";
  const body = Buffer.from('{"event":"payment.captured"}');
  const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(verifyRazorpayWebhookSignature(body, signature, secret), true);
  assert.equal(verifyRazorpayWebhookSignature(Buffer.from('{"event":"payment.failed"}'), signature, secret), false);
  assert.equal(verifyRazorpayWebhookSignature(body, "invalid", secret), false);
  assert.equal(verifyRazorpayWebhookSignature(body, signature, ""), false);
});
