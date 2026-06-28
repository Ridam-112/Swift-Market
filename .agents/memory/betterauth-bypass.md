---
name: BetterAuth bypass
description: The frontend used BetterAuth client for email/Google auth, but the app has its own working API endpoints — BetterAuth client was bypassed in favor of direct calls.
---

## Rule
Never use `authClient` (better-auth) calls in AuthContext or Auth page. The app has its own auth endpoints that return JWTs directly.

**Why:** The `VITE_NEON_AUTH_URL` environment variable (needed by the BetterAuth client) was not and should not be set here. All auth routes (`/api/auth/email-login`, `/api/auth/email-signup`, `/api/auth/google`, `/api/auth/email-forgot-password`, `/api/auth/email-reset-password`) live on the app's own Express API server and return `{ accessToken, refreshToken, user, needsProfile }`.

**How to apply:**
- `signInWithEmail` → `api.post('/auth/email-login', { email, password })`
- `signUpWithEmail` → `api.post('/auth/email-signup', { name, email, password })`
- `signInWithGoogle(idToken)` → `api.post('/auth/google', { credential: idToken })`
- `forgotPassword` → `api.post('/auth/email-forgot-password', { email })`
- `resetPassword` → `api.post('/auth/email-reset-password', { token, newPassword })`
- Google popup → `openGoogleSigninWindow(getGoogleClientId())` from `@/lib/googleGIS` — returns a Google ID token, pass to `signInWithGoogle`
- The `neonBridge` function and `NeonBridgeResult` interface are removed and should not be re-added.
