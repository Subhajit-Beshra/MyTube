import users from "../Modals/Auth.js";

function readPositiveInteger(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }
  return value;
}

export function getPlans() {
  return [
    {
      id: "Free",
      price: 0,
      currency: "INR",
      downloadLimit: readPositiveInteger("FREE_DOWNLOAD_LIMIT", 1),
      durationDays: 0,
    },
    {
      id: "Bronze",
      price: readPositiveInteger("BRONZE_PRICE_PAISE", 9900),
      currency: "INR",
      downloadLimit: readPositiveInteger("BRONZE_DOWNLOAD_LIMIT", 5),
      durationDays: 30,
    },
    {
      id: "Silver",
      price: readPositiveInteger("SILVER_PRICE_PAISE", 19900),
      currency: "INR",
      downloadLimit: readPositiveInteger("SILVER_DOWNLOAD_LIMIT", 20),
      durationDays: 30,
    },
    {
      id: "Gold",
      price: readPositiveInteger("GOLD_PRICE_PAISE", 39900),
      currency: "INR",
      downloadLimit: readPositiveInteger("GOLD_DOWNLOAD_LIMIT", 100),
      durationDays: 30,
    },
  ];
}

export function getIndiaDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getNextIndiaMidnight(date = new Date()) {
  const dayKey = getIndiaDayKey(date);
  return new Date(`${dayKey}T18:30:00.000Z`);
}

export async function expireSubscriptionIfNeeded(user) {
  if (
    user.plan !== "Free" &&
    user.subscriptionExpiresAt &&
    user.subscriptionExpiresAt <= new Date()
  ) {
    user.plan = "Free";
    user.subscriptionStatus = "expired";
    user.subscriptionExpiresAt = null;
    await user.save();
  }
  return user;
}

export function getDownloadLimit(plan) {
  const configuredPlan = getPlans().find((item) => item.id === plan);
  return configuredPlan?.downloadLimit ?? getPlans()[0].downloadLimit;
}

export async function resetDailyDownloadQuota(userId, dayKey) {
  await users.updateOne(
    { _id: userId, downloadQuotaDay: { $ne: dayKey } },
    { $set: { downloadQuotaDay: dayKey, downloadQuotaUsed: 0 } },
  );
}
