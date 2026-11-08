import assert from "node:assert/strict";
import test from "node:test";
import { requestLocationPermission } from "../../lib/location.js";

test("location check resolves after browser permission succeeds without returning coordinates", async () => {
  const provider = {
    getCurrentPosition(success) {
      success({});
    },
  };
  assert.equal(await requestLocationPermission(provider), undefined);
});

test("location denial gives a browser-settings message", async () => {
  const provider = {
    getCurrentPosition(_success, error) {
      error({ code: 1 });
    },
  };
  await assert.rejects(
    requestLocationPermission(provider),
    /permission was denied/i,
  );
});

test("unavailable location services fail explicitly", async () => {
  await assert.rejects(
    requestLocationPermission(undefined),
    /not available in this browser/i,
  );
});
