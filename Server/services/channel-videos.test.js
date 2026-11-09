import test from "node:test";
import assert from "node:assert/strict";
import { isSupportedVideoFile, MAX_CHANNEL_VIDEO_SIZE } from "./channel-videos.js";

test("video uploads accept supported video MIME types and extensions", () => {
  assert.equal(isSupportedVideoFile({ mimetype: "video/mp4", originalname: "clip.MP4" }), true);
  assert.equal(isSupportedVideoFile({ mimetype: "video/webm", originalname: "clip.webm" }), true);
  assert.equal(isSupportedVideoFile({ mimetype: "image/png", originalname: "clip.mp4" }), false);
  assert.equal(isSupportedVideoFile({ mimetype: "video/mp4", originalname: "image.png" }), false);
});

test("video uploads have a bounded 500 MiB maximum size", () => {
  assert.equal(MAX_CHANNEL_VIDEO_SIZE, 500 * 1024 * 1024);
});
