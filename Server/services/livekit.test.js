import assert from "node:assert/strict";
import test from "node:test";
import { createMeetingToken, getLiveKitConfig } from "./livekit.js";

test("LiveKit configuration is absent until all required credentials and URLs are supplied", () => {
  assert.equal(getLiveKitConfig({}), null);
  assert.deepEqual(
    getLiveKitConfig({
      LIVEKIT_API_KEY: "test-key",
      LIVEKIT_API_SECRET: "test-secret",
      LIVEKIT_URL: "wss://my-livekit.example",
    }),
    {
      apiKey: "test-key",
      apiSecret: "test-secret",
      serverUrl: "wss://my-livekit.example",
      apiUrl: "https://my-livekit.example",
    },
  );
  assert.throws(
    () => getLiveKitConfig({
      LIVEKIT_API_KEY: "test-key",
      LIVEKIT_API_SECRET: "test-secret",
      LIVEKIT_URL: "https://my-livekit.example",
    }),
    /LIVEKIT_URL/,
  );
  assert.throws(
    () => getLiveKitConfig({
      LIVEKIT_API_KEY: "test-key",
      LIVEKIT_API_SECRET: "••••••••••••••••••••••••••••••••",
      LIVEKIT_URL: "wss://my-livekit.example",
    }),
    /LIVEKIT_API_SECRET is a masked placeholder/,
  );
});

test("LiveKit tokens grant room access and host privileges only to hosts", async () => {
  const token = await createMeetingToken({
    apiKey: "test-key",
    apiSecret: "test-secret",
    roomId: "room-1",
    identity: "user-1-device-1",
    name: "Test User",
    isHost: true,
  });
  const claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  assert.equal(claims.sub, "user-1-device-1");
  assert.equal(claims.name, "Test User");
  assert.equal(claims.video.room, "room-1");
  assert.equal(claims.video.roomJoin, true);
  assert.equal(claims.video.roomAdmin, true);

  const guestToken = await createMeetingToken({
    apiKey: "test-key",
    apiSecret: "test-secret",
    roomId: "room-1",
    identity: "user-2-device-1",
    name: "Guest",
    isHost: false,
  });
  const guestClaims = JSON.parse(Buffer.from(guestToken.split(".")[1], "base64url").toString("utf8"));
  assert.equal(guestClaims.video.roomAdmin, false);
});
