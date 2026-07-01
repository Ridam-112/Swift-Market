---
name: Resend email integration
description: Password reset emails sent via Resend SDK; swiftmart.space domain verified; helper in api-server/src/lib/email.ts
---

## Rule
All transactional emails go through `artifacts/api-server/src/lib/email.ts` using the Resend SDK.

## Secrets / Env vars required
- `RESEND_API_KEY` — secret (set in Replit Secrets)
- `RESEND_FROM_EMAIL` — env var, value: `SwiftMart <noreply@swiftmart.space>` (shared env)

## Sender domain
`swiftmart.space` is verified in Resend. Emails send from `noreply@swiftmart.space`.
If `RESEND_FROM_EMAIL` is not set, falls back to `onboarding@resend.dev` (Resend sandbox — only delivers to the Resend account owner's email).

## What's implemented
- `sendPasswordResetEmail({ to, resetUrl, expiresMinutes })` — branded HTML + plain-text email with reset link
- Called from `POST /api/auth/email-forgot-password`; falls back to console.log if `RESEND_API_KEY` missing

## 401 redirect bug (fixed)
`api.ts` global 401 handler used to redirect to `/auth` even on login/signup endpoints (wrong password → redirect instead of toast). Fixed by skipping the redirect for paths starting with `/auth/`.

**Why:** Auth endpoints return 401 for "wrong credentials", not "session expired". The redirect logic must only fire for authenticated API calls where a valid token previously existed.
