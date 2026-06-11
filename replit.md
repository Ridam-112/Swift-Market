# SwiftMart

## Overview

Hyper-local e-commerce platform. Customers browse shops and order for 10-minute delivery. Vendors manage products and orders. Admins oversee the full platform.

pnpm workspace monorepo · TypeScript · Express 5 · PostgreSQL + Drizzle ORM · React 19 + Vite · Tailwind CSS 4

---

## New Account / Fresh Setup Checklist

When you fork or move this project to a new Replit account, set these in **Tools → Secrets**:

### Required — app will not start without these

| Secret key | Where to get it |
|---|---|
| `DATABASE_URL` | Replit auto-provisions when you add a PostgreSQL database (Tools → Database) |
| `JWT_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | Same as above, different value |

### Required for Google login (`AUTH_MODE=both`)

| Secret key | Where to get it |
|---|---|
| `GOOGLE_CLIENT_ID` | Firebase Console → Project Settings → General → Web app → SDK config |
| `VITE_FIREBASE_API_KEY` | Firebase Console → Project Settings → General → Web app → SDK config |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | e.g. `your-project-id` |
| `VITE_FIREBASE_APP_ID` | e.g. `1:123456:web:abc123` |

> After getting your Replit preview URL, add it to **Firebase Console → Authentication → Settings → Authorized domains**

### Required for OTP SMS login (`OTP_MODE=real`)

| Secret key | Where to get it |
|---|---|
| `TWO_FACTOR_API_KEY` | https://2factor.in → Dashboard → API Key |

> Set `OTP_MODE=demo` in env vars to skip SMS during testing (uses code `123456`)

### Required for image uploads (Cloudinary)

| Secret key | Where to get it |
|---|---|
| `CLOUDINARY_CLOUD_NAME` | https://cloudinary.com → Dashboard |
| `CLOUDINARY_API_KEY` | Cloudinary → Settings → API Keys |
| `CLOUDINARY_API_SECRET` | Cloudinary → Settings → API Keys |

### Required for payments (Razorpay)

| Secret key | Where to get it |
|---|---|
| `RAZORPAY_KEY_ID` | https://razorpay.com → Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | Same page |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay → Webhooks → your webhook → Secret |

### After setting secrets

```bash
pnpm --filter @workspace/db run push   # create all DB tables
```

---

## Environment Variables (non-secret, already in .replit)

| Variable | Value | Notes |
|---|---|---|
| `AUTH_MODE` | `both` | `otp` \| `google` \| `both` |
| `OTP_MODE` | `real` | `real` \| `demo` |
| `NODE_ENV` | `development` | |
| `PORT` | `8080` | API server port |
| `VITE_RAZORPAY_KEY_ID` | `rzp_test_...` | Public key, safe as env var |
| `VAPID_PUBLIC_KEY` | `BEb0x...` | Web push public key |
| `VAPID_SUBJECT` | `mailto:admin@...` | Web push contact |
| `SUPER_ADMIN_PHONES` | `6296118949,...` | Comma-separated |
| `OTP_DEMO_CODE` | `123456` | Used when `OTP_MODE=demo` |

---

## Key Commands

- `pnpm run typecheck` — typecheck all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 24, **TypeScript**: 5.9, **Package manager**: pnpm
- **API**: Express 5, **DB**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (v4), drizzle-zod
- **Frontend**: React 19, Vite, Tailwind CSS 4, Shadcn UI
- **Auth**: OTP via 2Factor.in + Firebase Google Auth
- **Payments**: Razorpay, **Uploads**: Cloudinary, **Push**: web-push (VAPID)
- **Build**: esbuild (CJS bundle)

## User Preferences

- Keep OTP login always working as fallback alongside Google Auth
