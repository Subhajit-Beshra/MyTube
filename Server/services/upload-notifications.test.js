import test from "node:test";
import assert from "node:assert/strict";
import { buildUploadNotifications } from "./upload-notifications.js";

test("new uploads create one notification for each channel subscriber", () => {
  assert.deepEqual(
    buildUploadNotifications(["user-1", "user-2"], "channel-1", "video-1"),
    [
      { recipient: "user-1", channel: "channel-1", video: "video-1" },
      { recipient: "user-2", channel: "channel-1", video: "video-1" },
    ],
  );
});

test("new uploads create no notifications when the channel has no subscribers", () => {
  assert.deepEqual(buildUploadNotifications([], "channel-1", "video-1"), []);
});
