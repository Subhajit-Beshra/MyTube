# MyTube

MyTube is a Next.js video discovery app with an Express/Mongoose API for authentication, comments, moderation, sample-video downloads, membership payments, and LiveKit meetings.

## Run locally

1. Copy `.env.example` to `.env.local` and configure the YouTube API key and Google OAuth client ID as needed.
2. Copy `Server/.env.example` to `Server/.env`, set `DB_URL` and a long random `JWT_SECRET`, then configure the integrations described below.
3. In one terminal run `cd Server && npm start`.
4. In another terminal run `npm run dev`.

The backend uses HTTP-only JWT and trusted-device cookies. Set `CLIENT_URL` to a comma-separated allowlist of frontend origins. Do not commit `.env.local` or `Server/.env`.

## Integrations and credentials

### Email OTP and trusted devices

Email verification uses the Resend API. Set `RESEND_API_KEY` and `EMAIL_FROM` in `Server/.env`, and verify the sender domain in Resend. Registration and sign-in from an untrusted browser require a six-digit code; codes expire after five minutes, are limited to five attempts, and can be resent after 60 seconds (with an additional IP rate limit). A trusted-device cookie lasts 30 days. Without email configuration, verification returns an explicit service-unavailable error; authentication is not silently bypassed.

### Location permission

The Security page uses the browser's native Geolocation API only after the user clicks the permission check. MyTube discards the resulting coordinates, does not send them to the API, and does not store them. Browser permission denial, unavailable location services, and timeouts are surfaced. No location-provider credential is needed.

### Comment translation

Enable Google Cloud Translation API v2 and set `GOOGLE_TRANSLATE_API_KEY` in `Server/.env`. The key stays server-side. Translation is available for English, Spanish, French, German, Hindi, Bengali, Japanese, Korean, Portuguese, and Arabic; provider failures are shown per comment.

### Staff moderation

The `/staff` dashboard requires a user with `role: "staff"`; all moderation APIs enforce the role on the backend. Assign the role only to trusted staff using MongoDB administration, for example:

```javascript
db.users.updateOne(
  { email: "staff@example.com" },
  { $set: { role: "staff" } },
)
```

The dashboard handles comment, video, and account reports; comment/video hide and restore actions; and account suspension/restoration. Hiding a YouTube video only blocks it within MyTube; it does not remove content from YouTube.

### Razorpay test mode

Set `RAZORPAY_KEY_ID` to an `rzp_test_...` key, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` in `Server/.env`. Configure the Razorpay test webhook to call `https://<your-api-host>/subscriptions/webhook` for `payment.captured` and `payment.failed`, using the same webhook secret. The backend verifies the HMAC over the raw request body and reconciles only matching stored orders and captured payments. Frontend success callbacks alone never activate a plan. The API intentionally rejects live Razorpay keys.

Plan prices use paise and are configurable with `*_PRICE_PAISE`; plan download limits use `*_DOWNLOAD_LIMIT`. Memberships last 30 days. Quotas use the Asia/Kolkata calendar day.

### LiveKit

Set `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `LIVEKIT_URL` in `Server/.env`. `LIVEKIT_URL` is the browser WebSocket endpoint (`wss://`); the backend infers the matching HTTPS management API URL unless `LIVEKIT_API_URL` is explicitly set (that override must use `http://` or `https://`, not `wss://`). The API creates short-lived, room-scoped tokens and grants room-admin rights only to the host. Keep the API secret server-side; it is never sent to the browser. Actual room connectivity requires a configured LiveKit deployment and working browser camera/microphone permissions.

### Video downloads

Downloads are enabled only for the four platform-hosted sample MP4s in `public/Video`. YouTube downloads remain disabled in the UI and rejected by the backend allowlist. Download reservations and daily quotas are account-scoped.

## Tests and verification

Run:

```sh
cd Server && npm test
cd .. && npm run lint
npx tsc --noEmit
npm run build
```

The backend suite covers OTP generation/hash/delivery handling, location permission outcomes, translation provider behavior, moderation authorization/validation, Razorpay raw-body signatures, LiveKit token claims, plan configuration, and the sample-video download allowlist. External provider calls, actual Razorpay checkout/webhook delivery, MongoDB-backed moderation flows, and live LiveKit room joining/leaving require configured credentials/services and were not network-tested by these unit tests.
