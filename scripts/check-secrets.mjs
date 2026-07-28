/**
 * Startup secrets checker.
 * Prints a clear summary of which secrets are set and which are missing.
 * Run via: node scripts/check-secrets.mjs
 * Also called automatically by post-merge.sh
 */

const REQUIRED = [
  { key: "DATABASE_URL",        desc: "Auto-provisioned by Replit PostgreSQL (Tools → Database)" },
  { key: "JWT_SECRET",          desc: "Random 64-byte hex: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"" },
  { key: "JWT_REFRESH_SECRET",  desc: "Random 64-byte hex (same command as above)" },
];

const NEON_SHARDS = [
  { key: "DATABASE1_URL", desc: "Neon shard 1 — primary write DB" },
  { key: "DATABASE2_URL", desc: "Neon shard 2" },
  { key: "DATABASE3_URL", desc: "Neon shard 3" },
  { key: "DATABASE4_URL", desc: "Neon shard 4" },
  { key: "DATABASE5_URL", desc: "Neon shard 5" },
];

const GOOGLE_AUTH = [
  { key: "GOOGLE_CLIENT_ID",          desc: "Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID" },
  { key: "GOOGLE_CLIENT_SECRET",      desc: "Same page as GOOGLE_CLIENT_ID" },
  { key: "VITE_FIREBASE_API_KEY",     desc: "Firebase Console → Project Settings → Web app → apiKey" },
  { key: "VITE_FIREBASE_AUTH_DOMAIN", desc: "e.g. your-project.firebaseapp.com" },
  { key: "VITE_FIREBASE_PROJECT_ID",  desc: "e.g. swiftmart2026-blg" },
  { key: "VITE_FIREBASE_APP_ID",      desc: "e.g. 1:123456:web:abc123" },
];

const FCM = [
  { key: "FIREBASE_CLIENT_EMAIL", desc: "Firebase → Project Settings → Service Accounts → Generate new private key → client_email" },
  { key: "FIREBASE_PRIVATE_KEY",  desc: "Same JSON file → private_key (keep \\n newlines)" },
];

const OTP_SMS = [
  { key: "TWO_FACTOR_API_KEY", desc: "https://2factor.in → Dashboard → API Key" },
];

const TRUECALLER = [
  { key: "TRUECALLER_APP_KEY", desc: "Truecaller Developer Portal → your app → App Key" },
];

const IMAGEKIT = [
  { key: "IMAGEKIT_PUBLIC_KEY",   desc: "ImageKit → Developer Options → API Keys → Public key" },
  { key: "IMAGEKIT_PRIVATE_KEY",  desc: "ImageKit → Developer Options → API Keys → Private key" },
  { key: "IMAGEKIT_URL_ENDPOINT", desc: "ImageKit → Developer Options → URL endpoint (e.g. https://ik.imagekit.io/yourId)" },
];

const RAZORPAY = [
  { key: "RAZORPAY_KEY_ID",        desc: "https://razorpay.com → Settings → API Keys" },
  { key: "RAZORPAY_KEY_SECRET",    desc: "Same page as KEY_ID" },
  { key: "RAZORPAY_WEBHOOK_SECRET",desc: "Razorpay → Webhooks → your webhook → Secret (optional)" },
];

const EMAIL = [
  { key: "RESEND_API_KEY", desc: "https://resend.com → API Keys → Create API Key" },
];

const VAPID = [
  { key: "VAPID_PRIVATE_KEY",   desc: "Web push private key — generate with: npx web-push generate-vapid-keys" },
  { key: "FIREBASE_VAPID_KEY",  desc: "Firebase Console → Cloud Messaging → Web Push certificates → Key pair" },
];

function check(group, label) {
  const missing = group.filter(s => !process.env[s.key]);
  const set     = group.filter(s =>  process.env[s.key]);

  console.log(`\n  ${label}`);
  for (const s of set)     console.log(`    ✅  ${s.key}`);
  for (const s of missing) console.log(`    ❌  ${s.key}  ← ${s.desc}`);

  return missing;
}

console.log("\n╔══════════════════════════════════════════════╗");
console.log("║        SwiftMart — Secrets Check             ║");
console.log("╚══════════════════════════════════════════════╝");

const missingRequired  = check(REQUIRED,    "Core (required — app crashes without these)");
const missingShards    = check(NEON_SHARDS, "Neon DB shards (falls back to DATABASE_URL if missing)");
const missingGoogle    = check(GOOGLE_AUTH, "Google Auth (required when AUTH_MODE=google or both)");
const missingFcm       = check(FCM,         "FCM push notifications (optional)");
const missingOtp       = check(OTP_SMS,     "OTP SMS (required when OTP_MODE=real)");
const missingTruecal   = check(TRUECALLER,  "Truecaller one-tap login (Android mobile only)");
const missingImageKit  = check(IMAGEKIT,    "ImageKit image uploads");
const missingRazorpay  = check(RAZORPAY,    "Razorpay payments");
const missingEmail     = check(EMAIL,       "Password-reset emails (Resend)");
const missingVapid     = check(VAPID,       "Web / FCM Push (VAPID)");

const allOptionalMissing = [
  ...missingShards, ...missingGoogle, ...missingFcm, ...missingOtp,
  ...missingTruecal, ...missingImageKit, ...missingRazorpay,
  ...missingEmail, ...missingVapid,
];

console.log("");
if (missingRequired.length > 0) {
  console.log(`  🚨  ${missingRequired.length} REQUIRED secret(s) missing — server will crash on start.`);
  console.log(`      Add them in Replit: Tools → Secrets\n`);
  process.exit(1);
} else if (allOptionalMissing.length > 0) {
  console.log(`  ⚠️   ${allOptionalMissing.length} optional secret(s) missing — some features will be unavailable.`);
  console.log(`      See replit.md for setup instructions.\n`);
} else {
  console.log(`  ✅  All secrets are configured. Ready to go!\n`);
}
