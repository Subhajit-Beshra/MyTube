import { AccessToken } from "livekit-server-sdk";

export function getLiveKitConfig(env = process.env) {
  const apiKey = env.LIVEKIT_API_KEY;
  const apiSecret = env.LIVEKIT_API_SECRET;
  const serverUrl = env.LIVEKIT_URL;
  if (!apiKey || !apiSecret || !serverUrl) return null;
  if (/^([*•])\1{3,}$/.test(apiKey.trim())) {
    throw new Error("LIVEKIT_API_KEY is a masked placeholder. Set the actual key from LiveKit.");
  }
  if (/^([*•])\1{3,}$/.test(apiSecret.trim())) {
    throw new Error("LIVEKIT_API_SECRET is a masked placeholder. Set the actual secret from LiveKit.");
  }

  const clientUrl = new URL(serverUrl);
  if (!["ws:", "wss:"].includes(clientUrl.protocol)) {
    throw new Error("LIVEKIT_URL must use ws:// or wss://.");
  }
  const apiUrl =
    env.LIVEKIT_API_URL ||
    `${clientUrl.protocol === "wss:" ? "https:" : "http:"}//${clientUrl.host}`;
  const parsedApiUrl = new URL(apiUrl);
  if (!["http:", "https:"].includes(parsedApiUrl.protocol)) {
    throw new Error("LIVEKIT_API_URL must use http:// or https://.");
  }

  return { apiKey, apiSecret, serverUrl, apiUrl: parsedApiUrl.toString().replace(/\/$/, "") };
}

export async function createMeetingToken({
  apiKey,
  apiSecret,
  roomId,
  identity,
  name,
  isHost,
}) {
  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    ttl: "10m",
  });
  token.addGrant({
    roomJoin: true,
    room: roomId,
    roomAdmin: isHost,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    canUpdateOwnMetadata: true,
  });
  return token.toJwt();
}
