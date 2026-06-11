# SwiftMart — Deployment & Migration Checklist

Use this checklist when moving SwiftMart off Replit to a production server or when connecting a custom domain and enabling Google OAuth.

---

## 1. Moving Off Replit / Connecting a Custom Domain

- [ ] Choose a hosting provider (Railway, Render, VPS, etc.)
- [ ] Export production database from Replit (Neon PostgreSQL):
  - Run `pg_dump $DATABASE_URL > swiftmart_backup.sql` on Replit
  - Restore on new host: `psql $NEW_DATABASE_URL < swiftmart_backup.sql`
- [ ] Copy all environment secrets (see Section 4)
- [ ] Point your domain DNS to the new server (A record or CNAME)
- [ ] Provision an SSL certificate (Let's Encrypt / Cloudflare)
- [ ] Update `VITE_API_URL` in the frontend to your domain's API URL
- [ ] Verify CORS settings in `artifacts/api-server/src/app.ts` allow your new domain
- [ ] Run `pnpm --filter @workspace/db run push` against the production DB to apply any pending schema changes
- [ ] Set `NODE_ENV=production` on the server

---

## 2. Enabling Google OAuth (after domain is ready)

### Step 1 — Google Cloud Console
1. Go to https://console.cloud.google.com → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** (Web application type)
3. Add **Authorised JavaScript origins**: `https://yourdomain.com`
4. Add **Authorised redirect URIs**: `https://yourdomain.com/api/auth/google/callback`
5. Copy **Client ID** and **Client Secret**

### Step 2 — Set environment variables on the server
```
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
AUTH_MODE=both
```

### Step 3 — Switch auth mode
- Change `AUTH_MODE=both` to show both Phone OTP and Google login
- Or `AUTH_MODE=google` for Google-only login
- No code change needed — the UI reads `authMode` from `/api/auth/config` at runtime

### Step 4 — Verify
- [ ] Test Google login flow end-to-end
- [ ] Confirm OTP login still works (if AUTH_MODE=both)

---

## 3. Switching 2Factor from Voice OTP to SMS OTP

Currently: Voice OTP (works without DLT template registration)
Future: SMS OTP (requires TRAI DLT registration)

### Steps
1. Register on the DLT portal of your telecom provider (Airtel, Jio, BSNL, etc.)
2. Register your entity (brand/business)
3. Submit an OTP SMS template, e.g.:
   ```
   Your SwiftMart OTP is {#var#}. Valid for 5 minutes. Do not share with anyone.
   ```
4. Wait for DLT approval (typically 3–7 business days)
5. In 2Factor dashboard, link the approved template
6. Update `artifacts/api-server/src/lib/sms.ts`:
   - Change the AUTOGEN endpoint to use your approved template name:
     ```
     /SMS/91{phone}/{otp}/YOUR_TEMPLATE_NAME
     ```
   - Remove the 2Factor session-ID verification flow (revert to local OTP string comparison)
7. Test SMS delivery — confirm message arrives as SMS not voice

---

## 4. Final Production Environment Variables

Set all of these on your production server before going live:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Long random string for access tokens |
| `JWT_REFRESH_SECRET` | Yes | Long random string for refresh tokens |
| `TWO_FACTOR_API_KEY` | Yes | 2Factor.in API key for OTP delivery |
| `OTP_MODE` | Yes | Set to `real` in production |
| `AUTH_MODE` | Yes | `otp` now; change to `both` after Google OAuth setup |
| `PORT` | Yes | API server port (e.g. `8080`) |
| `NODE_ENV` | Yes | Set to `production` |
| `GOOGLE_CLIENT_ID` | When AUTH_MODE≠otp | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | When AUTH_MODE≠otp | From Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | When AUTH_MODE≠otp | e.g. `https://yourdomain.com/api/auth/google/callback` |
| `SUPER_ADMIN_PHONES` | Optional | Comma-separated phones seeded as super-admins |

---

## 5. Pre-Launch Checklist

- [ ] All env vars set and verified on production server
- [ ] Database migrations applied (`pnpm --filter @workspace/db run push`)
- [ ] OTP login tested end-to-end on production URL
- [ ] Rate limits confirmed working (2 OTP requests per 10 minutes per phone)
- [ ] HTTPS enabled and redirect from HTTP working
- [ ] Google OAuth tested (if AUTH_MODE=both or =google)
- [ ] Vendor onboarding flow tested
- [ ] Admin panel accessible and functional
- [ ] Order flow: place → accept → deliver tested
- [ ] Payout/commission calculations verified
- [ ] Push notifications tested (if VAPID keys set)
