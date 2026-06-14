# SwiftMart — Android APK Build & Play Store Guide

## Prerequisites (on your local machine)

| Tool | Download |
|---|---|
| **Android Studio** (latest) | https://developer.android.com/studio |
| **Java JDK 17+** | Bundled with Android Studio |
| **Node.js 20+** | https://nodejs.org |
| **pnpm** | `npm install -g pnpm` |

---

## Step 1 — Deploy SwiftMart to Replit

The Android app fetches all data from your deployed backend. You must deploy first.

1. Click the **Deploy** button in Replit
2. Wait for deployment to complete
3. Copy your production URL — it looks like: `https://swiftmart-abc123.replit.app`

---

## Step 2 — Set `VITE_API_URL` in Replit Secrets

1. In Replit, go to **Tools → Secrets**
2. Add a new secret:
   - **Key:** `VITE_API_URL`
   - **Value:** `https://your-deployed-app.replit.app` (your URL from Step 1)

> This tells the Android app where to send API requests. Without this, the app cannot connect to the backend.

---

## Step 3 — Clone the project locally

```bash
# Clone from Replit (use the Git tab in Replit to get the clone URL)
git clone <your-replit-git-url>
cd <project-folder>
pnpm install
```

---

## Step 4 — Build the web app with your production URL

```bash
# Set the API URL for the build (replace with your actual deployed URL)
export VITE_API_URL=https://your-deployed-app.replit.app

# Build frontend + sync to Android
cd artifacts/swiftmart
pnpm run android:build
```

This does two things:
1. Builds the React app with your production API URL baked in
2. Copies the built files into the Android project

---

## Step 5 — Open in Android Studio

```bash
# From the artifacts/swiftmart directory
npx cap open android
```

Android Studio will open automatically.

---

## Step 6 — Configure app signing (required for Play Store)

In Android Studio:
1. Go to **Build → Generate Signed Bundle / APK**
2. Choose **Android App Bundle (AAB)** — Play Store requires AAB
3. Click **Create new keystore** (first time only):
   - Save it somewhere safe — you MUST use the same keystore for every update
   - Fill in your details (name, organisation, etc.)
4. Enter your keystore password and key alias
5. Select **release** build variant
6. Click **Finish**

The AAB file will be created at:
`artifacts/swiftmart/android/app/build/outputs/bundle/release/app-release.aab`

---

## Step 7 — Upload to Google Play Store

1. Go to https://play.google.com/console
2. Create a new app (one-time setup, costs $25 registration fee)
3. Fill in store listing details:
   - App name: **SwiftMart**
   - Category: **Shopping**
   - Description, screenshots, icon (1024×1024 px)
4. Go to **Production → Create new release**
5. Upload your `.aab` file
6. Submit for review (usually takes 1–3 days)

---

## Updating the app later

Every time you make code changes:
1. Increment `versionCode` in `artifacts/swiftmart/android/app/build.gradle` (1 → 2 → 3...)
2. Update `versionName` (e.g., "1.0.1", "1.1.0")
3. Re-run Steps 4–6
4. Upload the new AAB to Play Console as a new release

---

## Features that work in the Android app

| Feature | Status |
|---|---|
| OTP phone login | ✅ Full support |
| Google sign-in | ✅ Full support |
| Browse shops & products | ✅ Full support |
| Place orders & checkout | ✅ Full support |
| Razorpay payments | ✅ Full support |
| Product image uploads (camera) | ✅ Permission added |
| Push notifications | ✅ Permission added |
| Vendor dashboard | ✅ Full support |
| Admin dashboard | ✅ Full support |
| Real-time data sync with website | ✅ Shared backend DB |

---

## Data sync

The Android app and website share the **same backend and database**. Any order placed on the app instantly shows on the vendor's web dashboard, and vice versa. There is no separate data store for mobile.

---

## App details

| Field | Value |
|---|---|
| App ID | `com.swiftmart.app` |
| Min Android | Android 7.0 (API 24) |
| Target Android | Android 16 (API 36) |
| Version | 1.0.0 (versionCode 1) |
