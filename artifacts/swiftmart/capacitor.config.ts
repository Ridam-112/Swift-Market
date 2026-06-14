import type { CapacitorConfig } from '@capacitor/cli';

// Development mode: load the web app directly from the Replit dev server.
// This makes the APK behave like a browser — the Vite proxy handles /api → backend,
// OTP and all API calls work without any extra config.
//
// Production APK build (before publishing to Play Store):
//   1. Remove the server block below (or unset REPLIT_DEV_DOMAIN)
//   2. Set VITE_API_URL=https://your-deployed-api.replit.app in env
//   3. pnpm --filter @workspace/swiftmart run build
//   4. npx cap copy android
//   5. Build release APK in Android Studio
const devDomain = process.env.REPLIT_DEV_DOMAIN;
const devServerUrl = devDomain ? `https://${devDomain}` : undefined;

const config: CapacitorConfig = {
  appId: 'com.swiftmart.app',
  appName: 'SwiftMart',
  webDir: 'dist/public',

  // In dev: point the APK WebView at the live Replit server so /api proxy works.
  // In production: this block is absent and the APK uses bundled dist/public files.
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
    webContentsDebuggingEnabled: true,
  },
};

export default config;
