---
name: Google OAuth2 server-side flow
description: Firebase and GIS completely removed from Google login; server-side OAuth2 code flow is the only path; firebase.ts kept for FCM only
---

## Rule
Google Sign-In uses ONLY the server-side OAuth2 redirect flow. Do NOT add Firebase Auth or GIS back.

## Flow
1. Button click → `window.location.href = "/api/auth/google/redirect"` (Auth.tsx)
2. Server builds Google consent URL and redirects (auth.ts: `GET /api/auth/google/redirect`)
3. Google redirects to `/auth/google/callback` (GoogleCallback.tsx)
4. Frontend POSTs `{ code, state }` to `/api/auth/google/exchange`
5. Server exchanges code for ID token, looks up user by `googleId OR email`, issues JWT

## Backward Compatibility
Old Google users (signed in via old Firebase ID-token flow at `POST /api/auth/google`) are
preserved automatically — the exchange route matches by `googleId OR email`. No migration needed.

## Secrets required
- `GOOGLE_CLIENT_ID` — public, also returned in `/api/auth/config`
- `GOOGLE_CLIENT_SECRET` — required for code exchange; server logs ERROR at startup if missing
- Redirect URI must be registered in Google Cloud Console: `https://<domain>/api/auth/google/callback`

## What firebase.ts now contains
Only FCM helpers: `initFirebase`, `isFirebaseConfigured`, `getFirebaseApp`.
Auth functions (startGoogleSignIn, signInWithGooglePopup, getGoogleRedirectResult) were removed.
`initFirebase` is still called from main.tsx for push notifications.

## googleGIS.ts
Cleared to a no-op placeholder. Do not restore GIS One Tap — it fails with FedCM errors in iframes and WebViews.

**Why:** GIS One Tap fails in Replit preview iframes (FedCM blocked) and Capacitor WebViews. Firebase popup also fails in iframes. Server-side OAuth2 redirect works in all contexts.
