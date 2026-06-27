---
name: Password Auth Migration
description: OTP replaced with mobile+password; Google kept; migration approach and key decisions
---

## What changed
- Removed `send-otp` and `verify-otp` routes (now return 410 Gone for graceful degradation)
- Added: `POST /auth/signup`, `POST /auth/login`, `POST /auth/forgot-password`, `POST /auth/reset-password`
- DB: added `passwordHash` (nullable), `authProvider` (default "otp"), `profilePhoto`, `passwordResetTokenHash`, `passwordResetExpires`

## Key decisions
- Existing OTP users NOT deleted. Their `passwordHash` is null, `authProvider = "otp"`.
- On login attempt by OTP user: backend returns `{ needsPasswordSetup: true }` — frontend redirects to forgot-password flow.
- Reset token: `crypto.randomBytes(32).toString('hex')`, stored as SHA-256 hash, expires 15 min. Logged to server console only (dev) — never returned to frontend.
- After successful reset-password, user is auto-logged in (JWT issued immediately).
- `tokenVersion` is incremented on password reset to revoke all prior sessions.

**Why:** Phone numbers are unique — OTP users keep their phone as primary key. Password is grafted on safely via nullable column + authProvider field.

## Auth flows
- Login: `{ phone, password }` → JWT or `{ needsPasswordSetup: true }` or 401
- Signup: `{ name, phone, password }` → 201 + JWT
- Forgot: `{ phone }` → always 200 (no enumeration leak); token logged to console
- Reset: `{ phone, token, newPassword }` → JWT (auto-login)

## Frontend steps
Auth.tsx state machine: `login | signup | forgot-password | reset-password | onboarding | address`
- `forgot-password` step pre-fills `resetPhone` from login form phone field when `needsPasswordSetup` is detected
- `reset-password` accepts phone, token (from console), new password, confirm password

## AuthContext
- New: `loginWithPassword`, `signup`, `forgotPassword`, `resetPassword`
- Legacy stubs kept (throw errors): `loginWithPhone`, `verifyOtp` — so any stale import doesn't cause compile errors
- `applyAuthResult()` helper centralizes setUser/setUserRole/localStorage/setRoleState

## Rate limiting
- `loginLimiter`: per-phone, 10 per 15 min (prod)
- `signupLimiter`: per-IP, 5 per 15 min (prod)
- `resetPasswordLimiter`: per-phone, 3 per 15 min (prod)
