import crypto from "node:crypto";
import express from "express";
import rateLimit from "express-rate-limit";
import Payment from "../Modals/Payment.js";
import users from "../Modals/Auth.js";
import { requireAuth } from "../middleware/auth.js";
import { expireSubscriptionIfNeeded, getPlans } from "../services/plans.js";
import { verifyRazorpayWebhookSignature } from "../services/razorpay.js";

const router = express.Router();
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

function getTestCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret || !keyId.startsWith("rzp_test_")) {
    return null;
  }
  return { keyId, keySecret };
}

function toSafePayment(payment) {
  return {
    id: payment._id,
    plan: payment.plan,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    failureMessage: payment.failureMessage,
    createdAt: payment.createdAt,
    paidAt: payment.paidAt,
  };
}

async function activatePlan(userId, payment) {
  const user = await users.findById(userId);
  if (!user) throw new Error("User account no longer exists.");

  if (
    user.subscriptionPaymentAt &&
    user.subscriptionPaymentAt > payment.paidAt
  ) {
    return user;
  }

  user.plan = payment.plan;
  user.subscriptionStatus = "active";
  user.subscriptionPaymentAt = payment.paidAt;
  user.subscriptionOrderId = payment.orderId;
  user.subscriptionExpiresAt = new Date(
    payment.paidAt.getTime() + 30 * 24 * 60 * 60 * 1000,
  );
  await user.save();
  return user;
}

export async function handleRazorpayWebhook(req, res) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return res.status(503).json({ message: "Razorpay webhook verification is not configured." });
  }

  const signature = req.get("x-razorpay-signature");
  if (!verifyRazorpayWebhookSignature(req.body, signature, webhookSecret)) {
    return res.status(400).json({ message: "Razorpay webhook signature verification failed." });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString("utf8"));
  } catch {
    return res.status(400).json({ message: "Razorpay webhook payload is invalid." });
  }

  const paymentEntity = event?.payload?.payment?.entity;
  if (!paymentEntity || typeof paymentEntity.order_id !== "string") {
    return res.status(200).json({ received: true, ignored: true });
  }
  if (!["payment.captured", "payment.failed"].includes(event.event)) {
    return res.status(200).json({ received: true, ignored: true });
  }

  try {
    const payment = await Payment.findOne({ orderId: paymentEntity.order_id });
    if (!payment) return res.status(200).json({ received: true, ignored: true });
    if (
      !Number.isSafeInteger(paymentEntity.amount) ||
      paymentEntity.amount !== payment.amount ||
      paymentEntity.currency !== payment.currency
    ) {
      return res.status(400).json({ message: "Razorpay payment does not match the stored order." });
    }

    if (event.event === "payment.failed") {
      if (payment.status !== "paid") {
        await Payment.updateOne(
          { _id: payment._id, status: { $ne: "paid" } },
          {
            $set: {
              status: "failed",
              failureMessage: "Payment failed according to the Razorpay webhook.",
            },
          },
        );
      }
      return res.status(200).json({ received: true });
    }

    if (
      typeof paymentEntity.id !== "string" ||
      paymentEntity.status !== "captured"
    ) {
      return res.status(400).json({ message: "Razorpay did not confirm a captured payment." });
    }
    if (payment.status === "paid") {
      if (payment.paymentId === paymentEntity.id) {
        await activatePlan(payment.user.toString(), payment);
        return res.status(200).json({ received: true, duplicate: true });
      }
      return res.status(200).json({ received: true, duplicate: payment.paymentId === paymentEntity.id });
    }

    const duplicatePayment = await Payment.findOne({ paymentId: paymentEntity.id });
    if (duplicatePayment && duplicatePayment.orderId !== payment.orderId) {
      console.error("Razorpay webhook payment ID is already associated with another order.");
      return res.status(200).json({ received: true, ignored: true });
    }

    const updatedPayment = await Payment.findOneAndUpdate(
      { _id: payment._id, status: { $ne: "paid" } },
      {
        $set: {
          paymentId: paymentEntity.id,
          status: "paid",
          paidAt: new Date(),
          failureMessage: "",
        },
      },
      { returnDocument: "after", runValidators: true },
    );
    if (!updatedPayment) {
      const current = await Payment.findById(payment._id).select("status paymentId paidAt");
      if (current?.status === "paid" && current.paymentId === paymentEntity.id) {
        await activatePlan(payment.user.toString(), {
          ...payment.toObject(),
          paidAt: current.paidAt ?? payment.paidAt ?? new Date(),
        });
        return res.status(200).json({ received: true, duplicate: true });
      }
      return res.status(200).json({ received: true, duplicate: false });
    }

    await activatePlan(updatedPayment.user.toString(), updatedPayment);
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Razorpay webhook processing error:", error);
    return res.status(500).json({ message: "Could not process the Razorpay webhook." });
  }
}

router.get("/plans", (_req, res) => {
  try {
    return res.status(200).json({ plans: getPlans() });
  } catch (error) {
    console.error("Subscription plan configuration error:", error);
    return res.status(500).json({ message: "Subscription plans are not configured correctly." });
  }
});

router.get("/current", requireAuth, async (req, res) => {
  try {
    const user = await users.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found." });
    await expireSubscriptionIfNeeded(user);

    return res.status(200).json({
      subscription: {
        plan: user.plan,
        status: user.subscriptionStatus,
        expiresAt: user.subscriptionExpiresAt,
        planDetails: getPlans().find((plan) => plan.id === user.plan),
      },
    });
  } catch (error) {
    console.error("Subscription lookup error:", error);
    return res.status(500).json({ message: "Could not load subscription details." });
  }
});

router.get("/payments", requireAuth, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(100);
    return res.status(200).json({ payments: payments.map(toSafePayment) });
  } catch (error) {
    console.error("Payment history error:", error);
    return res.status(500).json({ message: "Could not load payment history." });
  }
});

router.post("/orders", requireAuth, checkoutLimiter, async (req, res) => {
  try {
    const plan = getPlans().find((item) => item.id === req.body?.plan);
    if (!plan || plan.id === "Free") {
      return res.status(400).json({ message: "Choose a paid membership plan." });
    }
    if (!Number.isSafeInteger(plan.price) || plan.price < 1) {
      return res.status(500).json({ message: "The selected plan price is not configured." });
    }

    const credentials = getTestCredentials();
    if (!credentials) {
      return res.status(503).json({
        message: "Razorpay test-mode credentials are not configured.",
      });
    }

    const receipt = `mt_${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`;
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${credentials.keyId}:${credentials.keySecret}`,
        ).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: plan.price,
        currency: "INR",
        receipt,
        notes: { userId: req.userId, plan: plan.id },
      }),
    });

    if (!razorpayResponse.ok) {
      console.error("Razorpay order creation failed with status:", razorpayResponse.status);
      return res.status(502).json({ message: "Could not create a Razorpay test order." });
    }

    const order = await razorpayResponse.json();
    const payment = await Payment.create({
      user: req.userId,
      plan: plan.id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: "created",
    });

    return res.status(201).json({
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: credentials.keyId,
        plan: payment.plan,
      },
    });
  } catch (error) {
    console.error("Razorpay order error:", error);
    return res.status(500).json({ message: "Could not create a payment order." });
  }
});

router.post("/verify", requireAuth, checkoutLimiter, async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body ?? {};
    if (
      typeof orderId !== "string" ||
      typeof paymentId !== "string" ||
      typeof signature !== "string"
    ) {
      return res.status(400).json({ message: "Order and payment verification data are required." });
    }

    const payment = await Payment.findOne({ orderId, user: req.userId });
    if (!payment) return res.status(404).json({ message: "Payment order not found." });

    const credentials = getTestCredentials();
    if (!credentials) {
      return res.status(503).json({ message: "Razorpay test-mode credentials are not configured." });
    }

    const expected = crypto
      .createHmac("sha256", credentials.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest();
    const received = Buffer.from(signature, "hex");
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
      return res.status(400).json({ message: "Payment signature verification failed." });
    }

    if (payment.status === "paid") {
      if (payment.paymentId !== paymentId) {
        return res.status(409).json({ message: "This order has already been paid." });
      }
      const user = await activatePlan(req.userId, payment);
      return res.status(200).json({
        message: "Payment was already verified.",
        subscription: { plan: user.plan, expiresAt: user.subscriptionExpiresAt },
      });
    }

    const duplicatePayment = await Payment.findOne({ paymentId });
    if (duplicatePayment && duplicatePayment.orderId !== orderId) {
      return res.status(409).json({ message: "This payment has already been applied to another order." });
    }

    const paymentResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${credentials.keyId}:${credentials.keySecret}`,
          ).toString("base64")}`,
        },
      },
    );
    if (!paymentResponse.ok) {
      console.error("Razorpay payment lookup failed with status:", paymentResponse.status);
      return res.status(502).json({ message: "Could not verify the payment status with Razorpay." });
    }

    const remotePayment = await paymentResponse.json();
    if (
      remotePayment.order_id !== orderId ||
      remotePayment.status !== "captured" ||
      remotePayment.amount !== payment.amount ||
      remotePayment.currency !== payment.currency
    ) {
      return res.status(409).json({ message: "Razorpay has not confirmed a captured payment for this order." });
    }

    payment.paymentId = paymentId;
    payment.status = "paid";
    payment.paidAt = new Date();
    await payment.save();
    const user = await activatePlan(req.userId, payment);

    return res.status(200).json({
      message: "Payment verified and membership activated.",
      subscription: { plan: user.plan, expiresAt: user.subscriptionExpiresAt },
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({ message: "Could not verify the payment." });
  }
});

router.post("/failed", requireAuth, checkoutLimiter, async (req, res) => {
  try {
    const { orderId, reason } = req.body ?? {};
    if (typeof orderId !== "string") {
      return res.status(400).json({ message: "Order ID is required." });
    }

    const payment = await Payment.findOneAndUpdate(
      { orderId, user: req.userId, status: "created" },
      {
        $set: {
          status: "failed",
          failureMessage: typeof reason === "string" ? reason.slice(0, 200) : "",
        },
      },
      { returnDocument: "after" },
    );
    if (!payment) {
      const existing = await Payment.findOne({ orderId, user: req.userId });
      if (!existing) return res.status(404).json({ message: "Payment order not found." });
      if (existing.status === "paid") {
        return res.status(409).json({ message: "A successful payment cannot be marked as failed." });
      }
      return res.status(200).json({ message: "Payment was already marked as failed." });
    }
    return res.status(200).json({ message: "Payment failure recorded." });
  } catch (error) {
    console.error("Payment failure update error:", error);
    return res.status(500).json({ message: "Could not record payment failure." });
  }
});

router.post("/cancel", requireAuth, async (req, res) => {
  try {
    const user = await users.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found." });
    await expireSubscriptionIfNeeded(user);
    if (user.plan === "Free" || user.subscriptionStatus !== "active") {
      return res.status(409).json({ message: "There is no active paid membership to cancel." });
    }

    user.subscriptionStatus = "canceled";
    await user.save();
    return res.status(200).json({
      message: "Membership canceled. Access remains active until the validity date.",
      subscription: { plan: user.plan, expiresAt: user.subscriptionExpiresAt },
    });
  } catch (error) {
    console.error("Subscription cancellation error:", error);
    return res.status(500).json({ message: "Could not cancel the membership." });
  }
});

export default router;
