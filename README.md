# MyTube

MyTube is a video discovery and creator platform built with Next.js, React, Express, and MongoDB. Browse videos, create a channel, upload videos, subscribe to MyTube creators, and get in-app notifications when they publish.

> **Project status:** This is an active project. Some larger feature areas—such as video calls, subscriptions, downloads, the player, account security, and comments—are implemented in part. See [Current capabilities and limitations](#current-capabilities-and-limitations) before relying on them as production-ready.

## Features

- Browse, search, and watch platform sample videos and YouTube results.
- Create a channel with an editable channel name, then upload and manage its video list.
- Subscribe to MyTube channels and receive in-app notifications for new uploads.
- Use a custom video player for platform-hosted videos.
- Sign in with email/password or Google, with email OTP verification and trusted-device support.
- Join LiveKit video meetings.
- Use comments, translations, reports, staff moderation, downloads, and membership plans.

## Tech stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** Express 5, Node.js, MongoDB, Mongoose
- **Video meetings:** LiveKit
- **Payments:** Razorpay test mode
- **Email OTP:** Resend
- **Video search and translation:** YouTube Data API and Google Cloud Translation API

## Requirements

- Node.js 20.9 or newer and npm
- MongoDB (local or hosted)
- Optional provider accounts and credentials for Google sign-in, YouTube search, email OTP, translation, Razorpay, and LiveKit

## Getting started

### 1. Install dependencies

From the project root:

```sh
npm install
cd Server
npm install
cd ..
```

### 2. Configure the frontend

Copy the example file:

```sh
cp .env.example .env.local
```

Set values as needed:

| Variable | Required for | Example |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Backend origin used by server-side API requests and as a proxy fallback | `http://localhost:5000` |
| `BACKEND_API_URL` | Runtime backend origin for the Next.js same-origin API proxy | `http://localhost:5000` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google sign-in button | Google OAuth client ID |
| `YOUTUBE_API_KEY` | YouTube video search and recommendations | YouTube Data API v3 key |

YouTube search will be unavailable until a valid API key is configured. Keep provider secrets out of `NEXT_PUBLIC_*` variables.

### 3. Configure the backend

Copy the backend example file:

```sh
cp Server/.env.example Server/.env
```

At minimum, configure:

| Variable | Purpose |
| --- | --- |
| `PORT` | Backend HTTP port (defaults to `5000`) |
| `CLIENT_URL` | Comma-separated frontend origins allowed by CORS; include the deployed frontend origin |
| `DB_URL` | MongoDB connection string |
| `JWT_SECRET` | Long, random signing key for authentication cookies |
| `GOOGLE_CLIENT_ID` | Google ID-token verification; match the frontend client ID |

Optional integrations are described below. Keep `Server/.env` private and never commit real credentials.

### 4. Start the app

Run the backend and frontend in separate terminals:

```sh
cd Server
npm run dev
```

```sh
npm run dev
```

The frontend is available at [http://localhost:3000](http://localhost:3000). Browser API calls go through the frontend's `/api/backend` route so authentication cookies remain same-origin. The backend health endpoint is [http://localhost:5000/health](http://localhost:5000/health).

For Render, set the frontend service's `BACKEND_API_URL` to the backend service's HTTPS origin (for example, `https://mytube-api.onrender.com`). This is read at runtime, so it does not need to be baked into the frontend build. Set the backend service's `CLIENT_URL` to the exact deployed frontend origin (for example, `https://mytube.onrender.com`). Redeploy the frontend after setting the variable.

## Channels and uploads

1. Sign in, then select **Create** in the header.
2. The channel name starts with your account name; edit it if you want, then confirm.
3. Open your channel and select **Upload video**.
4. Upload an MP4, M4V, MOV, OGV, or WebM file up to 500 MiB.

Video files are stored on the backend host in `Server/uploads`; metadata is stored in MongoDB. Back up both. Use persistent storage when deploying the backend—ephemeral filesystems can erase uploads when an instance restarts or is replaced. Uploaded files are served by the backend and are not copied into the Git repository.

Signed-in viewers can subscribe to MyTube channels. A channel upload creates an in-app notification for its subscribers. The header bell shows unread notifications and refreshes periodically while the page is open. This does not monitor uploads from external YouTube channels.

## Optional integrations

### Google sign-in

Create a Google OAuth client and configure the same client ID in:

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `.env.local`
- `GOOGLE_CLIENT_ID` in `Server/.env`

Configure authorized origins and redirect settings in Google Cloud to match your local and deployed frontend.

### Email OTP and trusted devices

Email OTP can use Gmail SMTP at no domain cost. On the Gmail account that will send codes, enable 2-Step Verification and create an App Password in your Google Account security settings. Set `GMAIL_USER` to that Gmail address and `GMAIL_APP_PASSWORD` to the generated App Password in the backend service environment; do not use your regular Gmail password. If Gmail credentials are not set, the service can use Resend instead with `RESEND_API_KEY` and a verified sender in `EMAIL_FROM`. Do not enable `OTP_DEMO_MODE` in production because it logs codes instead of emailing them. OTP challenges expire after five minutes and are limited to five attempts. A trusted-device cookie lasts 30 days. Without valid email delivery configuration, OTP-protected registration and sign-in cannot be completed.

### YouTube search

Enable the YouTube Data API v3 and set `YOUTUBE_API_KEY` in `.env.local`. The key is used by the server-side YouTube integration; do not expose it through client-side code.

### Comment translation

Enable Google Cloud Translation API v2 and set `GOOGLE_TRANSLATE_API_KEY` in `Server/.env`. The key remains server-side. Supported target languages are English, Spanish, French, German, Hindi, Bengali, Japanese, Korean, Portuguese, and Arabic.

### Razorpay test payments

Set `RAZORPAY_KEY_ID` to a test key beginning with `rzp_test_`, along with `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` in `Server/.env`. Configure the Razorpay test webhook to call:

```text
https://<your-api-host>/subscriptions/webhook
```

Enable the `payment.captured` and `payment.failed` events and use the same webhook secret. The backend verifies payment data before activating a plan and intentionally rejects live Razorpay keys.

Plan prices are configured in paise with `BRONZE_PRICE_PAISE`, `SILVER_PRICE_PAISE`, and `GOLD_PRICE_PAISE`. Daily download limits are configurable with `FREE_DOWNLOAD_LIMIT` and the plan-specific `*_DOWNLOAD_LIMIT` variables. Memberships currently last 30 days.

### LiveKit meetings

Set `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and `LIVEKIT_URL` in `Server/.env`. `LIVEKIT_URL` is the browser WebSocket endpoint, for example `wss://your-project.livekit.cloud`. The backend infers the HTTPS management API URL; set `LIVEKIT_API_URL` only when an override is required. Never expose the API secret to the browser.

Calls require a valid LiveKit deployment and browser camera/microphone permissions.

## Main pages

| Route | Purpose |
| --- | --- |
| `/` | Home and video discovery |
| `/explore` | Explore videos |
| `/search` | Search |
| `/watch/[id]` | Watch a video |
| `/channel/[id]` | View a channel and its uploads |
| `/subscriptions` | View and manage followed channels |
| `/meetings` | Create or join meetings |
| `/downloads` | View download activity |
| `/plans` | Compare membership plans and view billing details |
| `/security` | Account security and preferences |
| `/staff` | Staff moderation dashboard |

## Current capabilities and limitations

The application includes useful foundations for the following areas, but not every item in the original product specifications is implemented:

- **Video meetings:** LiveKit rooms, meeting links, participant controls, and some host moderation are available. In-call chat/file sharing, co-host roles, recording, full device/reconnection handling, and end-to-end encryption are not complete.
- **Downloads:** Plan-based daily quotas and protected sample-video downloads are available. Downloads are limited to the platform sample videos; YouTube downloads are not supported. The full requested audit trail and registered-device enforcement are not implemented.
- **Memberships:** Free/Bronze/Silver/Gold plans and Razorpay test payment verification are available. Quarterly/yearly billing, automatic renewals, invoices/receipt emails, and comprehensive premium-content gating are not complete.
- **Video player:** Platform videos have custom playback controls and saved progress. Features such as hover-preview thumbnails, subtitles, quality selection, and autoplay countdown are not complete. YouTube videos use the YouTube embed.
- **Account security:** Email OTP, trusted-device cookies, login history, and theme preferences are available. Risk checks for new IP/location, geographic login details, and full session/device management are not complete.
- **Comments:** Commenting, replies, reactions, translation, reports, and basic moderation protections are available. CAPTCHA, a time-limited edit policy, location display, and all requested sorting/spam controls are not complete.
- **Notifications:** In-app upload notifications currently cover MyTube channels only; they do not track external YouTube channel uploads and are not push/email notifications.

Provider credentials, a reachable MongoDB instance, network permissions, and deployment storage may be required for end-to-end behavior. Passing local tests does not verify external provider accounts or production deployment.

## Development and tests

Run frontend checks from the repository root:

```sh
npm run lint
npx tsc --noEmit
npm run build
```

Run the backend unit tests:

```sh
cd Server
npm test
```

## Security and operations

- Do not commit `.env.local`, `Server/.env`, API keys, payment secrets, or uploaded media.
- Use a unique, long `JWT_SECRET` outside local development.
- Restrict `CLIENT_URL` to trusted frontend origins.
- Use HTTPS for deployed sites and configure secure cookies appropriately.
- Back up MongoDB and `Server/uploads` together.
- The staff role should only be assigned to trusted accounts through controlled database administration.
