#!/usr/bin/env node
/**
 * SwiftMart — Android Production Build Script
 *
 * Modes (CLI flag):
 *   --build   Full pipeline: prebuild checks → Vite build → cap sync → config verify → security scan
 *   --sync    Sync-only:    prebuild checks → cap copy  → config verify → security scan (skips Vite build)
 *
 * Usage (from repo root):
 *   VITE_API_URL=https://your-app.replit.app pnpm --filter @workspace/swiftmart android:prod:build
 *   VITE_API_URL=https://your-app.replit.app pnpm --filter @workspace/swiftmart android:prod:sync
 *
 * Or pass inline:
 *   VITE_API_URL=https://swiftmart-abc123.replit.app node scripts/android-prod-build.mjs --build
 */

import { execSync }                                           from "child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "fs";
import { join, resolve }                                      from "path";
import { fileURLToPath }                                      from "url";

// ─── Paths ────────────────────────────────────────────────────────────────────
const SCRIPT_DIR     = fileURLToPath(new URL(".", import.meta.url));
const ROOT           = resolve(SCRIPT_DIR, "..");
const SWIFTMART      = join(ROOT, "artifacts", "swiftmart");
const ANDROID        = join(SWIFTMART, "android");
const ANDROID_ASSETS = join(ANDROID, "app", "src", "main", "assets");
const DIST           = join(SWIFTMART, "dist", "public");
const DIST_ASSETS    = join(DIST, "assets");

// ─── Colors ───────────────────────────────────────────────────────────────────
const R  = (s) => `\x1b[31m${s}\x1b[0m`;   // red
const G  = (s) => `\x1b[32m${s}\x1b[0m`;   // green
const Y  = (s) => `\x1b[33m${s}\x1b[0m`;   // yellow
const B  = (s) => `\x1b[1m${s}\x1b[0m`;    // bold
const C  = (s) => `\x1b[36m${s}\x1b[0m`;   // cyan
const D  = (s) => `\x1b[2m${s}\x1b[0m`;    // dim

// ─── Logging helpers ──────────────────────────────────────────────────────────
let _errors = 0, _warnings = 0;

const section = (t) => console.log(`\n${B(C(`── ${t} ${"─".repeat(Math.max(0, 54 - t.length))}`))} `);
const pass    = (m) => console.log(G(`  ✅  ${m}`));
const warn    = (m) => { console.log(Y(`  ⚠️   ${m}`)); _warnings++; };
const fail    = (m) => { console.error(R(`  ❌  ${m}`)); _errors++; };
const info    = (m) => console.log(D(`       ${m}`));

function run(cmd, opts = {}) {
  console.log(D(`  $ ${cmd}`));
  execSync(cmd, { stdio: "inherit", cwd: SWIFTMART, ...opts });
}

// ─── File utilities ───────────────────────────────────────────────────────────
function collectFiles(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) collectFiles(full, exts, out);
    else if (exts.some((e) => full.endsWith(e))) out.push(full);
  }
  return out;
}

// ─── Secret patterns that must NEVER appear in frontend bundle or Android assets
const SECRET_PATTERNS = [
  // Real credential strings
  { name: "PostgreSQL connection string",  re: /postgres(?:ql)?:\/\/\S+:\S+@/ },
  { name: "PEM private key header",        re: /-----BEGIN\s+(?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },

  // Private env var NAMES — if these literals appear in a JS bundle,
  // a VITE_* alias or a build-time leak is exposing server config.
  { name: "DATABASE_URL in bundle",        re: /\bDATABASE_URL\b/ },
  { name: "JWT_SECRET in bundle",          re: /\bJWT_SECRET\b(?!_GENERATED)/ },
  { name: "JWT_REFRESH_SECRET in bundle",  re: /\bJWT_REFRESH_SECRET\b(?!_GENERATED)/ },
  { name: "CLOUDINARY_API_SECRET",         re: /\bCLOUDINARY_API_SECRET\b/ },
  { name: "RAZORPAY_KEY_SECRET",           re: /\bRAZORPAY_KEY_SECRET\b/ },
  { name: "TWO_FACTOR_API_KEY",            re: /\bTWO_FACTOR_API_KEY\b/ },
  { name: "VAPID_PRIVATE_KEY",             re: /\bVAPID_PRIVATE_KEY\b/ },
  { name: "GOOGLE_CLIENT_SECRET",          re: /\bGOOGLE_CLIENT_SECRET\b/ },

  // Node.js process.env in a browser bundle = misconfigured build
  { name: "process.env usage in bundle",   re: /process\.env\[/ },
];

function scanFiles(files) {
  const hits = [];
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n");
    for (const { name, re } of SECRET_PATTERNS) {
      for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i])) {
          hits.push({ file: file.replace(ROOT + "/", ""), pattern: name, line: i + 1 });
        }
      }
    }
  }
  return hits;
}

// ─── Mode ─────────────────────────────────────────────────────────────────────
const MODE        = process.argv.includes("--sync") ? "sync" : "build";
const VITE_API_URL = process.env.VITE_API_URL?.trim();

console.log(B(`\n🚀  SwiftMart Android Production ${MODE === "build" ? "Build" : "Sync"}`));
console.log(D(`    Root: ${ROOT}\n`));

// ══════════════════════════════════════════════════════════════════════════════
// 1. PREBUILD CHECKS
// ══════════════════════════════════════════════════════════════════════════════
section("1. Prebuild Checks");

// VITE_API_URL — required
if (!VITE_API_URL) {
  fail("VITE_API_URL is not set.");
  info("Set it before running this script:");
  info("  export VITE_API_URL=https://your-app.replit.app");
  info("Then re-run. Deploy the app in Replit first to get the .replit.app URL.");
  console.log();
  process.exit(1);
}

if (!VITE_API_URL.startsWith("https://")) {
  fail(`VITE_API_URL must use HTTPS. Got: ${VITE_API_URL}`);
  info("Correct format:  https://your-app.replit.app");
  process.exit(1);
}

if (/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(VITE_API_URL)) {
  fail(`VITE_API_URL points to localhost — the APK cannot reach your local machine.`);
  info(`Got:      ${VITE_API_URL}`);
  info(`Expected: https://your-app.replit.app`);
  process.exit(1);
}

if (/sisko\.replit\.dev|\.replit\.dev/.test(VITE_API_URL)) {
  warn(`VITE_API_URL uses a dev-preview URL (*.replit.dev) — this URL is stable for your repl`);
  info(`but may change if you rename the project. For Play Store releases, prefer the .replit.app URL.`);
}

pass(`VITE_API_URL = ${VITE_API_URL}`);

// Android project
if (!existsSync(ANDROID)) {
  fail("Android project missing at artifacts/swiftmart/android/");
  info("Add it with:  cd artifacts/swiftmart && npx cap add android");
  process.exit(1);
}
pass("Android project directory found");

// Android assets dir — create if absent (first run)
if (!existsSync(ANDROID_ASSETS)) {
  mkdirSync(ANDROID_ASSETS, { recursive: true });
  info("Created android/app/src/main/assets/");
}
pass("Android assets directory ready");

// ══════════════════════════════════════════════════════════════════════════════
// 2. VITE BUILD  (build mode only)
// ══════════════════════════════════════════════════════════════════════════════
if (MODE === "build") {
  section("2. Build Vite Frontend");
  info(`Baking VITE_API_URL=${VITE_API_URL} into the production bundle...`);

  run("pnpm run build", {
    env: {
      ...process.env,
      NODE_ENV: "production",
      VITE_API_URL,
      // Tell capacitor.config.ts to omit server.url (dev-mode WebView redirect)
      CAPACITOR_PRODUCTION: "true",
      // Suppress dev-only Replit plugins by unsetting the repl marker
      REPL_ID: "",
    },
  });

  if (!existsSync(join(DIST, "index.html"))) {
    fail("dist/public/index.html missing after build — Vite build may have failed.");
    process.exit(1);
  }
  pass("Frontend built → dist/public/");
} else {
  section("2. Vite Build (skipped — sync-only mode)");
  if (!existsSync(join(DIST, "index.html"))) {
    fail("dist/public/index.html not found. Run android:prod:build first.");
    process.exit(1);
  }
  pass("Existing dist/public/ found");
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. CAPACITOR COPY / SYNC
// ══════════════════════════════════════════════════════════════════════════════
section(`3. Capacitor ${MODE === "build" ? "Sync (plugins + assets)" : "Copy (assets only)"}`);

const capEnv = {
  ...process.env,
  CAPACITOR_PRODUCTION: "true",
  REPLIT_DEV_DOMAIN: "",           // prevents server.url from being written into config
};

run(MODE === "build" ? "npx cap sync android" : "npx cap copy android", { env: capEnv });
pass(`Capacitor ${MODE === "build" ? "sync" : "copy"} complete`);

// ══════════════════════════════════════════════════════════════════════════════
// 4. VERIFY ANDROID capacitor.config.json
// ══════════════════════════════════════════════════════════════════════════════
section("4. Verify Android capacitor.config.json");

const capConfigPath = join(ANDROID_ASSETS, "capacitor.config.json");

if (!existsSync(capConfigPath)) {
  fail("capacitor.config.json not found in Android assets after sync.");
} else {
  let capConfig;
  try {
    capConfig = JSON.parse(readFileSync(capConfigPath, "utf8"));
  } catch (e) {
    fail(`Failed to parse capacitor.config.json: ${e.message}`);
    process.exit(1);
  }

  // Must NOT have server.url — that tells Android to load from a remote dev server,
  // bypassing the bundled web assets and requiring an active network connection.
  if (capConfig.server?.url) {
    fail(`server.url = "${capConfig.server.url}" is present in capacitor.config.json.`);
    info("Production APK must not use server.url — it means the app won't work offline");
    info("and the APK fetches UI from a remote server instead of bundled files.");
    info("Ensure CAPACITOR_PRODUCTION=true and REPLIT_DEV_DOMAIN=\"\" during build.");
  } else {
    pass("No server.url — APK uses self-contained bundled web assets ✓");
  }

  // Must NOT contain localhost / file://
  const raw = JSON.stringify(capConfig);
  if (/localhost|127\.0\.0\.1|file:\/\//.test(raw)) {
    fail("capacitor.config.json contains localhost or file:// reference — remove it.");
  } else {
    pass("No localhost or file:// references in config ✓");
  }

  // webDir sanity check
  if (capConfig.webDir && capConfig.webDir !== "dist/public") {
    warn(`webDir = '${capConfig.webDir}' — expected 'dist/public'`);
  } else {
    pass(`webDir = "dist/public" ✓`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. SECURITY SCAN — bundle + Android assets
// ══════════════════════════════════════════════════════════════════════════════
section("5. Security Scan — Bundle & Android Assets");

const jsFiles   = collectFiles(DIST_ASSETS, [".js"]);
const jsonFiles = collectFiles(ANDROID_ASSETS, [".json"]);

info(`Scanning ${jsFiles.length} JS bundle file(s) + ${jsonFiles.length} Android asset file(s)...`);

const hits = scanFiles([...jsFiles, ...jsonFiles]);

if (hits.length === 0) {
  pass("No private secrets or dangerous patterns detected ✓");
} else {
  for (const h of hits) {
    fail(`"${h.pattern}" found → ${h.file}:${h.line}`);
  }
}

// Positive check — confirm VITE_API_URL is actually baked into the bundle
if (MODE === "build" && jsFiles.length > 0) {
  const bundleText = jsFiles.map((f) => readFileSync(f, "utf8")).join(" ");
  if (bundleText.includes(VITE_API_URL)) {
    pass(`Backend URL baked into bundle: ${VITE_API_URL} ✓`);
  } else {
    warn("VITE_API_URL not found in bundle text — double-check it was passed during build.");
    info("The app may fall back to relative /api paths (which won't work in an APK).");
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. SUMMARY
// ══════════════════════════════════════════════════════════════════════════════
section("6. Summary");

if (_errors > 0) {
  console.log(R(B(`\n  Build finished with ${_errors} error(s). Fix the issues above and retry.\n`)));
  process.exit(1);
} else if (_warnings > 0) {
  console.log(Y(B(`\n  Build completed with ${_warnings} warning(s). Review warnings above.\n`)));
} else {
  console.log(G(B(`\n  ✅  All checks passed — Android project is production-ready!\n`)));
}

console.log(D("  Next: open Android Studio and generate the signed AAB:"));
console.log(D(""));
console.log(D("    pnpm --filter @workspace/swiftmart android:open"));
console.log(D("    Build → Generate Signed Bundle / APK → Android App Bundle (AAB)"));
console.log(D("    Select 'release' build variant → Finish"));
console.log(D(""));
console.log(D("  AAB output path:"));
console.log(D("    artifacts/swiftmart/android/app/build/outputs/bundle/release/app-release.aab"));
console.log();
