import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidModerationReason,
  isValidReportResolution,
  isValidVideoId,
} from "./moderation.js";

test("moderation accepts supported public content IDs and report resolutions", () => {
  assert.equal(isValidVideoId("youtube_abc-123"), true);
  assert.equal(isValidVideoId("bad/video"), false);
  assert.equal(isValidVideoId(""), false);
  assert.equal(isValidReportResolution("reviewed"), true);
  assert.equal(isValidReportResolution("dismissed"), true);
  assert.equal(isValidReportResolution("open"), false);
});

test("moderation report reasons are required and bounded", () => {
  assert.equal(isValidModerationReason("spam"), true);
  assert.equal(isValidModerationReason("  "), false);
  assert.equal(isValidModerationReason("x".repeat(501)), false);
});
