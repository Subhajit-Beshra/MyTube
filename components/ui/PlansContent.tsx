"use client";

import Script from "next/script";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { platformRequest } from "@/lib/platform-api";

type Plan = {
  id: "Free" | "Bronze" | "Silver" | "Gold";
  price: number;
  currency: string;
  downloadLimit: number;
  durationDays: number;
};

type Subscription = {
  plan: Plan["id"];
  status: "free" | "active" | "canceled" | "expired";
  expiresAt: string | null;
};

type PaymentRecord = {
  id: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  paidAt: string | null;
};

type RazorpayOrder = {
  order: {
    id: string;
    amount: number;
    currency: string;
    keyId: string;
    plan: string;
  };
};

type RazorpayResult = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (result: RazorpayResult) => void;
  theme: { color: string };
  modal?: { ondismiss: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: string, callback: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(price / 100);
}

export default function PlansContent() {
  const { user, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadAccount = useCallback(async () => {
    if (!user) return;
    const [current, history] = await Promise.all([
      platformRequest<{ subscription: Subscription }>("/subscriptions/current"),
      platformRequest<{ payments: PaymentRecord[] }>("/subscriptions/payments"),
    ]);
    setSubscription(current.subscription);
    setPayments(history.payments);
  }, [user]);

  useEffect(() => {
    let active = true;
    Promise.all([
      platformRequest<{ plans: Plan[] }>("/subscriptions/plans"),
      user
        ? Promise.all([
            platformRequest<{ subscription: Subscription }>("/subscriptions/current"),
            platformRequest<{ payments: PaymentRecord[] }>("/subscriptions/payments"),
          ])
        : Promise.resolve(null),
    ])
      .then(([planData, accountData]) => {
        if (!active) return;
        setPlans(planData.plans);
        if (accountData) {
          setSubscription(accountData[0].subscription);
          setPayments(accountData[1].payments);
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load membership information.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  async function handlePurchase(planId: Plan["id"]) {
    if (!user) {
      setError("Sign in before choosing a membership plan.");
      return;
    }
    if (!window.Razorpay) {
      setError("Razorpay Checkout did not load. Check your connection and try again.");
      return;
    }

    setError("");
    setNotice("");
    setBusyPlan(planId);
    try {
      const { order } = await platformRequest<RazorpayOrder>("/subscriptions/orders", {
        method: "POST",
        body: JSON.stringify({ plan: planId }),
      });

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "MyTube",
        description: `${order.plan} membership · 30 days`,
        order_id: order.id,
        theme: { color: "#4f46e5" },
        modal: { ondismiss: () => setBusyPlan("") },
        handler: (result) => {
          void platformRequest<{ message: string }>("/subscriptions/verify", {
            method: "POST",
            body: JSON.stringify({
              orderId: result.razorpay_order_id,
              paymentId: result.razorpay_payment_id,
              signature: result.razorpay_signature,
            }),
          })
            .then(async (verification) => {
              setNotice(verification.message);
              await loadAccount();
            })
            .catch((cause: unknown) => {
              setError(cause instanceof Error ? cause.message : "Payment verification failed.");
            })
            .finally(() => setBusyPlan(""));
        },
      });
      checkout.on("payment.failed", (response) => {
        const reason = response.error?.description ?? "Payment failed.";
        void platformRequest<{ message: string }>("/subscriptions/failed", {
          method: "POST",
          body: JSON.stringify({ orderId: order.id, reason }),
        })
          .then(() => setError(`${reason} Your plan has not been changed.`))
          .catch((cause: unknown) => {
            const detail = cause instanceof Error ? cause.message : "The failure could not be recorded.";
            setError(`${reason} ${detail}`);
          })
          .finally(() => setBusyPlan(""));
      });
      checkout.open();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start checkout.");
      setBusyPlan("");
    }
  }

  async function cancelMembership() {
    setError("");
    setNotice("");
    setBusyPlan("cancel");
    try {
      const result = await platformRequest<{ message: string }>("/subscriptions/cancel", {
        method: "POST",
      });
      setNotice(result.message);
      await loadAccount();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not cancel membership.");
    } finally {
      setBusyPlan("");
    }
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onReady={() => setCheckoutReady(true)}
        onError={() => setError("Razorpay Checkout could not be loaded.")}
      />
      <div className="space-y-8">
        {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
        {loading ? (
          <p role="status" className="rounded-xl bg-white p-5 text-sm text-slate-500">Loading membership plans…</p>
        ) : (
          <>
            {user && subscription && (
              <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Current membership</p>
                    <h2 className="mt-1 text-xl font-bold text-slate-900">{subscription.plan}</h2>
                    <p className="mt-1 text-sm capitalize text-slate-600">
                      Status: {subscription.status}
                      {subscription.expiresAt && ` · Valid until ${new Date(subscription.expiresAt).toLocaleDateString("en-IN")}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link href="/downloads" className="text-sm font-semibold text-indigo-700 hover:underline">View downloads</Link>
                    {subscription.plan !== "Free" && subscription.status === "active" && (
                      <button type="button" disabled={busyPlan === "cancel"} onClick={() => void cancelMembership()} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
                        {busyPlan === "cancel" ? "Canceling…" : "Cancel renewal"}
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )}

            {!user && !authLoading && (
              <p className="rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
                <Link href="/login" className="font-semibold underline">Sign in</Link> to purchase a plan and save your membership to your account.
              </p>
            )}

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {plans.map((plan) => (
                <article key={plan.id} className={`flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ${subscription?.plan === plan.id ? "ring-2 ring-indigo-500" : "ring-slate-900/5"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-xl font-bold text-slate-900">{plan.id}</h2>
                    {subscription?.plan === plan.id && <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">Current</span>}
                  </div>
                  <p className="mt-3 text-2xl font-extrabold text-slate-900">{plan.price ? formatPrice(plan.price) : "Free"}</p>
                  <p className="mt-1 min-h-5 text-sm text-slate-500">{plan.durationDays ? `per ${plan.durationDays} days` : "no expiry"}</p>
                  <ul className="my-5 flex-1 space-y-3 text-sm text-slate-600">
                    {[
                      `${plan.downloadLimit} successful download${plan.downloadLimit === 1 ? "" : "s"} per day`,
                      plan.durationDays ? `${plan.durationDays}-day membership` : "No membership expiry",
                      "Watch history and custom player controls",
                    ].map((feature) => <li key={feature} className="flex gap-2"><span className="font-bold text-emerald-600">✓</span>{feature}</li>)}
                  </ul>
                  {plan.id === "Free" ? (
                    <button type="button" disabled className="w-full rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500">Included</button>
                  ) : subscription?.plan === plan.id ? (
                    <button type="button" disabled className="w-full rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500">Current plan</button>
                  ) : (
                    <button
                      type="button"
                      disabled={!user || authLoading || !checkoutReady || busyPlan !== ""}
                      onClick={() => void handlePurchase(plan.id)}
                      className="w-full rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyPlan === plan.id ? "Opening checkout…" : checkoutReady ? "Choose plan" : "Loading checkout…"}
                    </button>
                  )}
                </article>
              ))}
            </section>

            {user && (
              <section>
                <h2 className="mb-3 text-lg font-bold text-slate-900">Payment history</h2>
                {payments.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">No payments yet.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-900/5">
                    <table className="w-full min-w-[32rem] text-left text-sm">
                      <thead className="border-b border-slate-100 text-xs uppercase text-slate-500"><tr><th className="p-3">Date</th><th className="p-3">Plan</th><th className="p-3">Amount</th><th className="p-3">Status</th></tr></thead>
                      <tbody>{payments.map((payment) => (
                        <tr key={payment.id} className="border-b border-slate-50 last:border-0">
                          <td className="p-3">{new Date(payment.createdAt).toLocaleString("en-IN")}</td>
                          <td className="p-3">{payment.plan}</td>
                          <td className="p-3">{formatPrice(payment.amount)}</td>
                          <td className="p-3 capitalize">{payment.status}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}
