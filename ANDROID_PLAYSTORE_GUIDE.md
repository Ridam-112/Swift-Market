# SwiftMart — Android APK / AAB Production Build Guide

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| **Android Studio** (Hedgehog or later) | Latest stable | https://developer.android.com/studio |
| **Java JDK 17** | 17+ | Bundled with Android Studio |
| **Node.js** | 22+ | https://nodejs.org |
| **pnpm** | Latest | `npm install -g pnpm` |
| **Git** | Any | To clone the project |

> You can build entirely inside Replit (no local machine needed for the Vite + Capacitor steps).
> Android Studio is required **only** for signing and generating the final APK/AAB.

---

## Overview — Two APK modes

| Mode | When to use | How it works |
|---|---|---|
| **Dev APK** | Testing on a device during development | WebView loads from your live Replit server. OTP, payments, all features work. Requires the Replit server to be running. |
| **Prod APK** (Play Store) | Publishing to users | WebView uses self-contained bundled files. Backend URL baked in at build time. Works without a live dev server. |

---

## Part A — Dev APK (test on your device right now)

No build step needed. The Android project already points to your live Replit server.

```bash
# From artifacts/swiftmart/
pnpm android:open
```

This opens Android Studio. Press **Run ▶** to install on a connected device or emulator.

**Requires:** Your Replit server must be running (click **Run** in Replit).

---

## Part B — Production APK / AAB (Play Store)

### Step 1 — Deploy SwiftMart to Replit

1. In Replit, click **Deploy → Autoscale**
2. Wait for the deployment to go live
3. Copy your production URL — it looks like:
   ```
   https://swiftmart-abc123.replit.app
   ```

> This is your `VITE_API_URL`. All production API calls will go here.

---

### Step 2 — Run the production build script

From the **repo root** in Replit's Shell:

```bash
VITE_API_URL=https://your-app.replit.app \
  pnpm --filter @workspace/swiftmart android:prod:build
```

This single command:
1. ✅ **Checks** `VITE_API_URL` is set, HTTPS, and not localhost
2. ✅ **Builds** the React frontend with your backend URL baked in
3. ✅ **Syncs** built files into the Android project (no `server.url` — self-contained)
4. ✅ **Verifies** `capacitor.config.json` has no dev-server references
5. ✅ **Scans** for private secrets in the JS bundle and Android assets
6. ✅ **Confirms** your backend URL is present in the bundle

**The script will exit with an error and clear instructions if anything is wrong.**

---

### Step 3 — Verify the security scan passed

The build script prints a security report. Confirm you see:

```
✅  No private secrets or dangerous patterns detected ✓
✅  No server.url — APK uses self-contained bundled web assets ✓
✅  Backend URL baked into bundle: https://your-app.replit.app ✓
✅  All checks passed — Android project is production-ready!
```

If any ❌ errors appear, fix them before proceeding. Common issues:

| Error | Fix |
|---|---|
| `VITE_API_URL is not set` | `export VITE_API_URL=https://your-app.replit.app` before running |
| `VITE_API_URL points to localhost` | Use your deployed `.replit.app` URL, not localhost |
| `server.url present in capacitor.config.json` | Re-run with `CAPACITOR_PRODUCTION=true` (the script does this automatically) |
| Private secret found in bundle | A frontend file is using `import.meta.env.SECRET_NAME` — check for leaks |

---

### Step 4 — Open Android Studio

```bash
pnpm --filter @workspace/swiftmart android:open
```

Android Studio opens automatically with the project loaded.

---

### Step 5 — Increment version numbers (each release)

In Android Studio, open:
`artifacts/swiftmart/android/app/build.gradle`

Update both fields for every Play Store release:
```gradle
versionCode 2          // Integer — must be higher than the previous release
versionName "1.1.0"    // Human-readable version string
```

---

### Step 6 — Generate signed AAB

1. In Android Studio: **Build → Generate Signed Bundle / APK**
2. Select **Android App Bundle** (Play Store requires AAB, not APK)
3. Click **Create new keystore** (first time only):
   - Choose a safe permanent location — **back this file up**
   - You MUST use the same keystore for every future update
   - Fill in alias, passwords, validity (25+ years), and your details
4. Enter your keystore path, passwords, and key alias
5. Select **release** build variant
6. Click **Finish**

Output file:
```
artifacts/swiftmart/android/app/build/outputs/bundle/release/app-release.aab
```

---

### Step 7 — Upload to Google Play Store

1. Go to https://play.google.com/console
2. Create a new app (one-time $25 developer registration fee)
3. Fill in the store listing:
   - App name: **SwiftMart**
   - Category: **Shopping**
   - Description, screenshots (minimum 2), feature graphic (1024×500 px)
   - App icon: 512×512 px, PNG, no transparency
4. Navigate to **Production → Create new release**
5. Upload your `.aab` file
6. Add release notes
7. Review and submit for Google review (typically 1–3 business days)

---

## Script reference

All scripts run from the repo root with `pnpm --filter @workspace/swiftmart <script>`:

| Script | What it does |
|---|---|
| `android:prod:build` | Full production pipeline: Vite build + cap sync + verification + security scan |
| `android:prod:sync` | Sync-only: cap copy + verification + security scan (skips Vite build) |
| `android:open` | Opens Android Studio with the Android project |
| `android:sync` | Raw `cap sync android` — no checks, for advanced use |
| `android:build` | Legacy — use `android:prod:build` instead for production |

---

## Security guarantees

The production build script enforces:

| Check | What it catches |
|---|---|
| `VITE_API_URL` present + HTTPS | Fails fast if backend URL is missing or insecure |
| No `server.url` in Android config | Confirms APK is self-contained, not dev-server dependent |
| No `DATABASE_URL` in bundle | Catches accidental server-only var leaks |
| No `JWT_SECRET` / `JWT_REFRESH_SECRET` | Signing keys never reach the client |
| No `CLOUDINARY_API_SECRET` | Upload credentials stay server-side |
| No `RAZORPAY_KEY_SECRET` | Payment secret never exposed |
| No `TWO_FACTOR_API_KEY` | SMS API key never exposed |
| No `VAPID_PRIVATE_KEY` | Push notification signing key stays server-side |
| No PEM private key headers | Catches any mistakenly embedded private keys |
| No `process.env[` in bundle | Detects Node.js env access in browser code (build misconfiguration) |
| Backend URL present in bundle | Confirms `VITE_API_URL` was correctly baked in |

---

## Updating the app

Every time you push a code update:

```bash
# 1. Bump versionCode + versionName in android/app/build.gradle
# 2. Re-run production build
VITE_API_URL=https://your-app.replit.app \
  pnpm --filter @workspace/swiftmart android:prod:build

# 3. Open Android Studio
pnpm --filter @workspace/swiftmart android:open

# 4. Build → Generate Signed Bundle / APK → release
# 5. Upload new AAB to Play Console as a new release
```

---

## Features in the Android app

| Feature | Status |
|---|---|
| OTP phone login (voice call) | ✅ Working |
| Google sign-in | ✅ Working (Firebase) |
| Browse shops & products | ✅ Working |
| Place orders & checkout | ✅ Working |
| Razorpay payments | ✅ Working |
| Product image uploads | ✅ Camera permission added |
| Push notifications | ✅ FCM permission added |
| Vendor dashboard | ✅ Working |
| Admin dashboard | ✅ Working |
| Real-time sync with web | ✅ Shared backend & database |

---

## App details

| Field | Value |
|---|---|
| App ID | `com.swiftmart.app` |
| Min Android | Android 7.0 (API 24) |
| Target Android | Android 16 (API 36) |
| Current version | 1.0.0 (versionCode 1) |
| Backend URL | Set via `VITE_API_URL` at build time |
