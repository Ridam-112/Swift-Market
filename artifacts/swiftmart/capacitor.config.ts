import type { CapacitorConfig } from '@capacitor/cli';

// ─── Development vs Production mode ──────────────────────────────────────────
//
// DEV APK (testing on a device from Replit):
//   The WebView loads directly from the live Replit dev server.
//   API calls go through the Vite proxy → backend. Hot-reload works.
//   This mode activates automatically when REPLIT_DEV_DOMAIN is set
//   AND CAPACITOR_PRODUCTION is not "true".
//
// PRODUCTION APK (Play Store / release):
//   Run: VITE_API_URL=https://your-app.replit.app pnpm android:prod:build
//   The build script sets CAPACITOR_PRODUCTION=true and REPLIT_DEV_DOMAIN=""
//   so server.url is omitted. The APK uses the self-contained bundled files
//   in dist/public, and VITE_API_URL is baked into the JS bundle at build time.
//   No live server required — works fully offline for the UI layer.
//
// ─────────────────────────────────────────────────────────────────────────────

const isProductionBuild = process.env.CAPACITOR_PRODUCTION === "true";
const devDomain = !isProductionBuild ? process.env.REPLIT_DEV_DOMAIN : "";
const devServerUrl = devDomain ? `https://${devDomain}` : undefined;

const config: CapacitorConfig = {
  appId: 'com.swiftmart.app',
  appName: 'SwiftMart',
  webDir: 'dist/public',

  // server.url is ONLY injected in dev mode (never in production builds).
  // The build script (android-prod-build.mjs) ensures this block is absent
  // in the capacitor.config.json written to Android assets.
  ...(devServerUrl
    ? {
        server: {
          url: devServerUrl,
          cleartext: false,
        },
      }
    : {}),

  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#111111',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    // Disable remote debugging in production — enabled only in dev for Chrome DevTools
    webContentsDebuggingEnabled: !isProductionBuild,
  },
};

export default config;
