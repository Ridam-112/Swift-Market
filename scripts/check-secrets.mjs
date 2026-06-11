/**
 * Startup secrets checker.
 * Prints a clear summary of which secrets are set and which are missing.
 * Run via: node scripts/check-secrets.mjs
 * Also called automatically by post-merge.sh
 */

const REQUIRED = [
  { key: "DATABASE_URL",        desc: "PostgreSQL connection string (Replit: Tools → Database)" },
  { key: "JWT_SECRET",          desc: "Random 64-byte hex string for signing access tokens" },
  { key: "JWT_REFRESH_SECRET",  desc: "Random 64-byte hex string for signing refresh tokens" },
];

const GOOGLE_AUTH = [
  { key: "GOOGLE_CLIENT_ID",          desc: "Firebase Console → Project Settings → Web app" },
  { key: "VITE_FIREBASE_API_KEY",     desc: "Firebase Console → Project Settings → Web app" },
  { key: "VITE_FIREBASE_AUTH_DOMAIN", desc: "e.g. your-project.firebaseapp.com" },
  { key: "VITE_FIREBASE_PROJECT_ID",  desc: "e.g. your-project-id" },
  { key: "VITE_FIREBASE_APP_ID",      desc: "e.g. 1:123456:web:abc123" },
];

const OTP_SMS = [
  { key: "TWO_FACTOR_API_KEY", desc: "https://2factor.in → Dashboard → API Key" },
];

const CLOUDINARY = [
  { key: "CLOUDINARY_CLOUD_NAME", desc: "https://cloudinary.com → Dashboard" },
  { key: "CLOUDINARY_API_KEY",    desc: "Cloudinary → Settings → API Keys" },
  { key: "CLOUDINARY_API_SECRET", desc: "Cloudinary → Settings → API Keys" },
];

const RAZORPAY = [
  { key: "RAZORPAY_KEY_ID",        desc: "https://razorpay.com → Settings → API Keys" },
  { key: "RAZORPAY_KEY_SECRET",    desc: "Same page as KEY_ID" },
  { key: "RAZORPAY_WEBHOOK_SECRET",desc: "Razorpay → Webhooks → your webhook → Secret (optional)" },
];

const VAPID = [
  { key: "VAPID_PRIVATE_KEY", desc: "Web push private key (VAPID)" },
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
const missingGoogle    = check(GOOGLE_AUTH, "Google Auth (required when AUTH_MODE=google or both)");
const missingOtp       = check(OTP_SMS,     "OTP SMS (required when OTP_MODE=real)");
const missingCloudinary= check(CLOUDINARY,  "Cloudinary image uploads");
const missingRazorpay  = check(RAZORPAY,    "Razorpay payments");
const missingVapid     = check(VAPID,       "Web Push (VAPID)");

const allMissing = [
  ...missingRequired, ...missingGoogle, ...missingOtp,
  ...missingCloudinary, ...missingRazorpay, ...missingVapid,
];

console.log("");
if (missingRequired.length > 0) {
  console.log(`  🚨  ${missingRequired.length} REQUIRED secret(s) missing — server will crash on start.`);
  console.log(`      Add them in Replit: Tools → Secrets\n`);
  process.exit(1);
} else if (allMissing.length > 0) {
  console.log(`  ⚠️   ${allMissing.length} optional secret(s) missing — some features will be unavailable.`);
  console.log(`      See replit.md for setup instructions.\n`);
} else {
  console.log(`  ✅  All secrets are configured. Ready to go!\n`);
}
