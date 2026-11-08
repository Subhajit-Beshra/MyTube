import assert from "node:assert/strict";
import test from "node:test";
import { downloadableVideos, getDownloadableVideo } from "./videos.js";

test("platform-hosted sample videos remain downloadable", () => {
  assert.deepEqual(Object.keys(downloadableVideos).sort(), ["1", "2", "3", "4"]);
  for (const [videoId, video] of Object.entries(downloadableVideos)) {
    assert.equal(getDownloadableVideo(videoId), video);
    assert.match(video.filepath, /^\/Video\/[\w.-]+\.mp4$/);
    assert.match(video.filename, /^[\w.-]+\.mp4$/);
  }
});

test("YouTube and inherited object IDs are not downloadable", () => {
  assert.equal(getDownloadableVideo("dQw4w9WgXcQ"), null);
  assert.equal(getDownloadableVideo("__proto__"), null);
  assert.equal(getDownloadableVideo("toString"), null);
  assert.equal(getDownloadableVideo(undefined), null);
});
