# Viggle Studio

A professional Ionic Angular + Capacitor mobile app that puts the **entire Viggle V1 API** in your pocket, backed by a small Node server that keeps your Viggle API key off the device.

```
Viggle Web/
├── viggle-studio/   Ionic 9 · Angular 22 · Capacitor 8 mobile app (Android project included)
└── server/          Node 20+ · Express · TypeScript backend (proxy + Story Studio + ffmpeg stitching)
```

## What the app can do

| Area | Tools | Viggle endpoints |
|---|---|---|
| Video (H3) | Text to Video · Image to Video (first / first+last frame) · Reference to Video (≤4 images + 1 clip) · Upscale 2× | `POST /v1/videos`, `POST /v1/videos/super-resolution`, `GET /v1/videos`, `GET /v1/videos/{id}` |
| Character animation | Viggle Animate (planner / normal / agent, ≤10 character images) · Video Remix (image or saved character + motion video or saved motion, original / solid / transparent background, alpha matte) | `POST /v1/videos`, `POST /v1/renders`, `GET /v1/renders/{id}/events` (SSE), `/download` |
| Images | Viggle Image, 1–6 PNGs, 1K/2K, 7 aspect ratios, ≤8 reference images, seeds | `POST /v1/images`, `GET /v1/images/{id}` |
| Assets | Characters (2D render, 3D vsplat, both; joint sets, pruning, thumbnails, export) · Motions (from video, from text, import official templates; GLB/FBX export) | `/v1/characters*`, `/v1/motions*`, `/v1/motion-templates` |
| 3D | Scene Model: panorama from prompt or 360° image, generate new camera views, reconstruct `.spz` | `/v1/scenes/pano`, `/custom-pano`, `/generate`, `/reconstruct`, `GET /v1/scenes/{id}` |
| Stories | Story Studio: idea → script (Claude or built-in planner) → keyframes → clips → one stitched film | images + videos + server-side ffmpeg |
| Account | Live credit balance, cost estimate on every screen, job library with cloud sync | `GET /v1/credits` |

Every H3 video is generated **without a watermark** by default (the API's `watermark` flag is off; you can turn it on in Settings) and includes native audio. Output quality is the API's full "pro" quality: up to 15 s, 4K, any aspect ratio.

## 0. Quick start (from the repo root)

```bash
npm i                 # installs server/ and viggle-studio/ dependencies
npm run server        # backend on http://localhost:3000  (needs server/.env, see below)
npm run app           # app preview on http://localhost:4200 (in a second terminal)
```

Other root scripts: `npm run build`, `npm run app:lint`, `npm run android:sync`, `npm run android:open`.

## 1. Backend setup

```bash
cd server
cp .env.example .env         # then edit it
npm install
npm run dev                  # http://localhost:3000
```

`.env`:

| Variable | Purpose |
|---|---|
| `VIGGLE_API_KEY` | Project API key from https://portal.viggle.ai/keys. Never put it in the app. |
| `APP_ACCESS_TOKEN` | Shared secret the app sends as `x-app-token`. Set a long random string. |
| `ANTHROPIC_API_KEY` | Optional. Enables AI-written story scripts (Claude Opus 5.5). Without it a template planner is used. |
| `CORS_ORIGINS` | `*` for development, or `capacitor://localhost,http://localhost,https://your-domain`. |
| `MAX_UPLOAD_MIB` | Upload cap (Viggle allows 100 MiB per video). |
| `OUTPUT_DIR` | Where stitched story films are written. |

Smoke test:

```bash
curl http://localhost:3000/health
curl -H "x-app-token: <token>" http://localhost:3000/api/credits
```

`npm run build && npm start` for production. Put it behind HTTPS (Caddy, nginx, a PaaS) before using it outside your LAN.

### Backend routes (all under `/api`, all require `x-app-token`)

```
GET  /credits
POST /videos                       multipart – text / first-frame / first-last / reference / animate modes
POST /videos/super-resolution      multipart – video | video_url
GET  /videos?status=&cursor=&limit=
GET  /videos/:id                   vid_ · anim_ · render_ · vsr_
POST /images                       multipart
GET  /images/:id
POST /characters   GET /characters   GET|DELETE /characters/:id   GET /characters/:id/export?download_type=vsplat
POST /motions (multipart or JSON text-to-motion)   POST /motions/import   GET /motions/templates
GET /motions   GET|DELETE /motions/:id   GET /motions/:id/export?download_type=glb|fbx
POST /renders                      multipart – Video Remix
GET  /renders/:id/events           SSE passthrough
GET  /renders/:id/download         binary passthrough
POST /scenes/pano | /custom-pano | /generate | /reconstruct     GET /scenes/:id
GET  /media/proxy?url=&filename=   streams signed Viggle results (download/share)
POST /stories/plan                 { idea, scenes, style, tone, characters, language, duration_s, aspect_ratio }
GET  /stories/stitch/capabilities  { available }
POST /stories/stitch               { clips: [urls], aspect_ratio, resolution } → { url }
GET  /stories/output/:file         the stitched mp4
```

A Postman collection is in `server/postman/`.

## 2. Mobile app setup

```bash
cd viggle-studio
npm install
npm start                 # web preview at http://localhost:4200
```

In the app open **Settings** and enter the server URL and app token. Tap **Test connection**.

- On a real phone the server URL must be reachable from the phone, e.g. `http://192.168.1.10:3000` (your computer's LAN IP) or your deployed HTTPS URL.
- Cleartext HTTP is enabled in `capacitor.config.ts` for development only.

### Android

```bash
npm run build
npx cap sync android
npx cap open android      # Android Studio → Run
```

Permissions for camera, photos and video picking are declared in `android/app/src/main/AndroidManifest.xml`.

### iOS (macOS required)

```bash
npx cap add ios
npx cap sync ios
npx cap open ios
```

Add these keys to `ios/App/App/Info.plist`: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription`.

## 3. How the pieces fit

- **Jobs** – every create call returns an id; the app tracks it locally (Capacitor Preferences), polls `GET` endpoints every 4 s (configurable), streams SSE for Video Remix renders, and refreshes signed URLs (valid 1 h) whenever a job is opened.
- **Downloads / share** – signed results stream through `/api/media/proxy` to `Filesystem.downloadFile`, then the native share sheet (web build triggers a browser download).
- **Story Studio** – `POST /stories/plan` writes scenes (`video_prompt`, `image_prompt`, narration, camera, mood). The app then generates a keyframe per scene with Viggle Image, feeds it as `first_frame_image_url` to H3 video, and finally asks the server to stitch all clips into one mp4 with ffmpeg (scaled/padded to the chosen aspect ratio, audio preserved).
- **Pricing** – estimates follow docs.viggle.ai/v1/pricing: 1 credit/s for H3 video (5 at 4K), 1 credit/s of driving video for Animate/Remix/Upscale, 1–2 credits per image, 1/25–31 credits for characters, 0–5 credits/s for motions, 10 for text-to-motion, 6 per scene panorama. Failed jobs are refunded by Viggle.

## 4. Hosting the backend for free

The backend is a plain Docker container (`server/Dockerfile`). Recommended free option: **Render**.

1. Push this folder to a GitHub repo (`.env` is git-ignored, never commit it).
2. On https://render.com → New → **Blueprint** → select the repo. Render reads `render.yaml`.
3. In the service's Environment tab paste `VIGGLE_API_KEY` and `APP_ACCESS_TOKEN` (and optionally `ANTHROPIC_API_KEY`).
4. Deploy. Your URL looks like `https://viggle-studio-api.onrender.com`. Check `/health`.
5. In the app's Settings enter that URL and the app token.

Free-tier caveats: the service sleeps after ~15 min idle (first request takes ~30 s), and the disk is ephemeral, so stitched story films live only until the next restart. Download them after stitching.

Alternatives using the same Dockerfile: Koyeb (free, no sleep), Fly.io (`fly launch` in `server/`), Google Cloud Run (free tier, scales to zero), Railway (trial credit).

## 5. Scripts

| Where | Command | What |
|---|---|---|
| server | `npm run dev` / `build` / `start` / `typecheck` | tsx watch / tsc / node dist / type check |
| viggle-studio | `npm start` / `npm run build` / `npm run lint` | dev server / production bundle to `www/` / eslint |
| viggle-studio | `npx cap sync android` | copy `www/` + plugins into the Android project |
