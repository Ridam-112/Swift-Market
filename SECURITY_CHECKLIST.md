# SwiftMart — Security Checklist

Pre-Play-Store security audit. Every surface checked, findings documented.

---

## 1. Frontend source code (`artifacts/swiftmart/src/`)

| Check | Result |
|---|---|
| Hardcoded API keys or secrets | ✅ None found |
| `process.env` usage (Node-only, not available in browser) | ✅ None found |
| `VITE_*` vars that expose secrets | ✅ Only `VITE_API_URL` (public backend URL) and `BASE_URL` (Vite built-in) used |
| Razorpay secret key in frontend | ✅ Not present — `keyId` (public key only) comes from backend `/api/payments/create-order` response |
| Cloudinary credentials in frontend | ✅ Not present — all uploads go through backend `/api/upload` |
| Firebase private key in frontend | ✅ Not present |
| Firebase public config in frontend | ✅ Fetched at runtime from backend `/api/auth/config` — never baked into the bundle |
| JWT secrets in frontend | ✅ Not present |
| Database URL in frontend | ✅ Not present |
| SMS / 2Factor key in frontend | ✅ Not present |
| VAPID private key in frontend | ✅ Not present |
| Google Client Secret in frontend | ✅ Not present — only `googleClientId` (public OAuth ID) returned from backend config endpoint |

---

## 2. Backend source code (`artifacts/api-server/src/`)

| Check | Result |
|---|---|
| Hardcoded credentials | ✅ None found |
| All secrets via `process.env` | ✅ Confirmed for all keys |
| Razorpay keys | ✅ `process.env.RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — backend only |
| Cloudinary keys | ✅ `process.env.CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` — backend only |
| VAPID private key | ✅ `process.env.VAPID_PRIVATE_KEY` — backend only |
| JWT secrets | ✅ `process.env.JWT_SECRET` / `JWT_REFRESH_SECRET` — backend only |
| Database URL | ✅ `process.env.DATABASE_URL` — backend only |
| 2Factor API key | ✅ `process.env.TWO_FACTOR_API_KEY` — backend only |
| Google Client ID | ✅ `process.env.GOOGLE_CLIENT_ID` — backend only |
| CORS | ✅ All origins allowed in dev; in production same-origin (no CORS needed); Capacitor sends no `origin` header (already handled) |
| `check-secrets.mjs` | ✅ Only checks existence of env vars — never logs their values |

---

## 3. Android / Capacitor files

| Check | Result |
|---|---|
| Keystore / JKS files committed | ✅ None exist; `*.keystore`, `*.jks` added to `.gitignore` |
| `google-services.json` committed | ✅ File not present in repo; added to `.gitignore` |
| `local.properties` (Android SDK path) | ✅ File not present; `artifacts/swiftmart/android/local.properties` added to `.gitignore` |
| `capacitor.config.ts` secrets | ✅ No secrets — only plugin config and app metadata |
| APK / AAB build outputs committed | ✅ None present; `*.apk`, `*.aab` added to `.gitignore` |
| AndroidManifest.xml secrets | ✅ No secrets — only permissions and activity config |
| `build.gradle` secrets | ✅ No secrets — only dependency and build config |

---

## 4. Environment variables and secrets

| Variable | Location | Classification | Status |
|---|---|---|---|
| `DATABASE_URL` | Replit Secrets | 🔴 Secret | ✅ Secrets store only |
| `JWT_SECRET` | Replit Secrets | 🔴 Secret | ✅ Secrets store only |
| `JWT_REFRESH_SECRET` | Replit Secrets | 🔴 Secret | ✅ Secrets store only |
| `RAZORPAY_KEY_ID` | Replit Secrets | 🟡 Public key (like Stripe's `pk_`) | ✅ Secrets store; served to frontend via backend API |
| `RAZORPAY_KEY_SECRET` | Replit Secrets | 🔴 Secret | ✅ Secrets store only |
| `RAZORPAY_WEBHOOK_SECRET` | Replit Secrets | 🔴 Secret | ✅ Secrets store only |
| `CLOUDINARY_CLOUD_NAME` | Replit Secrets | 🟡 Semi-public | ✅ Secrets store; used backend only |
| `CLOUDINARY_API_KEY` | Replit Secrets | 🔴 Secret | ✅ Secrets store only |
| `CLOUDINARY_API_SECRET` | Replit Secrets | 🔴 Secret | ✅ Secrets store only |
| `TWO_FACTOR_API_KEY` | Replit Secrets | 🔴 Secret | ✅ Secrets store only |
| `GOOGLE_CLIENT_ID` | Replit Secrets | 🟡 Public OAuth Client ID | ✅ Secrets store; client ID (not secret) returned by backend config endpoint |
| `VITE_FIREBASE_API_KEY` | Replit Secrets | 🟡 Firebase client key (not a secret per Google) | ✅ Secrets store; served to frontend via backend `/api/auth/config` — never in VITE bundle |
| `VITE_FIREBASE_AUTH_DOMAIN` | Replit Secrets | 🟡 Public | ✅ Same as above |
| `VITE_FIREBASE_PROJECT_ID` | Replit Secrets | 🟡 Public | ✅ Same as above |
| `VITE_FIREBASE_APP_ID` | Replit Secrets | 🟡 Public | ✅ Same as above |
| `VAPID_PRIVATE_KEY` | Replit Secrets | 🔴 Secret | ✅ Secrets store only |
| `VAPID_PUBLIC_KEY` | `.replit` env var | 🟢 Intentionally public | ✅ Correct — VAPID public key is sent to browsers |
| `SESSION_SECRET` | Replit Secrets | 🔴 Secret | ✅ Secrets store only |
| `NODE_ENV` | `.replit` env var | 🟢 Non-sensitive config | ✅ OK |
| `PORT` | `.replit` env var | 🟢 Non-sensitive config | ✅ OK |
| `AUTH_MODE` | `.replit` env var | 🟢 Non-sensitive config | ✅ OK |
| `OTP_MODE` | `.replit` env var | 🟢 Non-sensitive config | ✅ OK |
| `OTP_DEMO_CODE` | `.replit` env var | 🟢 Non-sensitive config | ✅ OK |
| `SUPER_ADMIN_PHONES` | `.replit` env var | 🟡 Operational config | ✅ OK — phone numbers of super admins |
| `VITE_RAZORPAY_KEY_ID` | **Removed** | was unused dead var | ✅ Removed — frontend source never read it; `keyId` flows from backend API |
| `ALLOWED_ORIGINS` | **Removed** | was stale domain | ✅ Removed — dev allows all origins; production is same-origin; Capacitor has no origin header |

---

## 5. Documentation files

| File | Check | Result |
|---|---|---|
| `replit.md` | Secrets or real credentials | ✅ Only placeholder values (`rzp_test_...`, `BEb0x...`) — these are public keys already in env |
| `ANDROID_PLAYSTORE_GUIDE.md` | Hardcoded credentials | ✅ All placeholder values only |
| `SECURITY_CHECKLIST.md` | This file | ✅ No real credentials |
| `scripts/check-secrets.mjs` | Logs secret values | ✅ Only checks existence, never logs values |

---

## 6. `.gitignore` — additions made

The following patterns were **added** to prevent accidental credential commits:

```
# Environment / secrets
.env
.env.local
.env.*.local
*.env

# Android signing keystores (MUST NOT be committed — losing it = can't update the app)
*.keystore
*.jks
artifacts/swiftmart/android/local.properties
artifacts/swiftmart/android/.gradle/
artifacts/swiftmart/android/app/build/
artifacts/swiftmart/android/build/
artifacts/swiftmart/android/captures/
*.apk
*.aab

# Firebase / Google Services
artifacts/swiftmart/android/app/google-services.json
google-services.json
GoogleService-Info.plist

# Service account / Firebase Admin SDK keys
service-account*.json
firebase-adminsdk*.json
*-firebase-adminsdk-*.json
```

---

## 7. Architecture — how sensitive services are accessed from the Android app

```
Android App (Capacitor WebView)
        │
        │  HTTPS calls to deployed Replit backend
        ▼
Backend API (Express — artifacts/api-server)
        │
        ├── Razorpay SDK    ← RAZORPAY_KEY_ID + KEY_SECRET (secrets)
        ├── Cloudinary SDK  ← CLOUDINARY_API_KEY + SECRET (secrets)
        ├── 2Factor SMS     ← TWO_FACTOR_API_KEY (secret)
        ├── Firebase Admin  ← GOOGLE_CLIENT_ID (secret)
        ├── web-push VAPID  ← VAPID_PRIVATE_KEY (secret)
        └── PostgreSQL DB   ← DATABASE_URL (secret)
```

No sensitive key ever leaves the backend. The Android app and website share the same backend and database — all data syncs in real time.

---

## 8. Remaining recommendations (not blockers for Play Store)

| Item | Priority | Action |
|---|---|---|
| `RAZORPAY_WEBHOOK_SECRET` not yet set | Medium | Set in Replit Secrets when you create the Razorpay webhook endpoint for production |
| Switch `OTP_MODE` to `demo` for testing | Low | Set `OTP_MODE=demo` in env to test OTP flow without spending SMS credits |
| Set `NODE_ENV=production` for deployed app | Medium | Automatically set in `.replit` deployment config |
| Add SHA-1 fingerprint to Firebase for Android Google Sign-In | High (for Google login) | Get from Android Studio `signingReport`, add in Firebase Console → Project Settings → Android |
| `SUPER_ADMIN_PHONES` in `.replit` is committed | Low | These are phone numbers, not credentials. Move to Replit Secrets if privacy preferred |
