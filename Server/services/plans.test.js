import assert from "node:assert/strict";
import test from "node:test";
import { getIndiaDayKey, getNextIndiaMidnight, getPlans } from "./plans.js";

test("daily quota keys use the Asia/Kolkata calendar day", () => {
  assert.equal(getIndiaDayKey(new Date("2026-11-07T18:29:59.000Z")), "2026-11-07");
  assert.equal(getIndiaDayKey(new Date("2026-11-07T18:30:00.000Z")), "2026-11-08");
});

test("quota reset timestamp is the next midnight in India", () => {
  assert.equal(
    getNextIndiaMidnight(new Date("2026-11-08T03:00:00.000Z")).toISOString(),
    "2026-11-08T18:30:00.000Z",
  );
});

test("plan prices and limits can be configured from the environment", () => {
  const keys = [
    "FREE_DOWNLOAD_LIMIT",
    "BRONZE_DOWNLOAD_LIMIT",
    "BRONZE_PRICE_PAISE",
    "SILVER_DOWNLOAD_LIMIT",
    "SILVER_PRICE_PAISE",
    "GOLD_DOWNLOAD_LIMIT",
    "GOLD_PRICE_PAISE",
  ];
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  try {
    process.env.FREE_DOWNLOAD_LIMIT = "2";
    process.env.BRONZE_DOWNLOAD_LIMIT = "7";
    process.env.BRONZE_PRICE_PAISE = "12345";
    process.env.SILVER_DOWNLOAD_LIMIT = "21";
    process.env.SILVER_PRICE_PAISE = "23456";
    process.env.GOLD_DOWNLOAD_LIMIT = "75";
    process.env.GOLD_PRICE_PAISE = "34567";

    assert.deepEqual(
      getPlans().map(({ id, price, downloadLimit }) => [id, price, downloadLimit]),
      [
        ["Free", 0, 2],
        ["Bronze", 12345, 7],
        ["Silver", 23456, 21],
        ["Gold", 34567, 75],
      ],
    );
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("invalid plan configuration is rejected", () => {
  const previous = process.env.FREE_DOWNLOAD_LIMIT;
  process.env.FREE_DOWNLOAD_LIMIT = "-1";
  try {
    assert.throws(() => getPlans(), /FREE_DOWNLOAD_LIMIT/);
  } finally {
    if (previous === undefined) delete process.env.FREE_DOWNLOAD_LIMIT;
    else process.env.FREE_DOWNLOAD_LIMIT = previous;
  }
});
