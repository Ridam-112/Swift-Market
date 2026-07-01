/**
 * Firebase SDK — used ONLY for Firebase Cloud Messaging (FCM push notifications).
 * Google Sign-In is handled by the server-side OAuth2 flow at /api/auth/google/redirect.
 * Do NOT add auth imports here.
 */
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  messagingSenderId: string;
  storageBucket?: string;
}

let _config: FirebaseConfig | null = null;
let _app: FirebaseApp | null = null;

/** Called once at bootstrap with config fetched from /api/auth/config */
export function initFirebase(config: FirebaseConfig): void {
  _config = config;
}

export const isFirebaseConfigured = (): boolean =>
  !!(_config?.apiKey && _config?.projectId && _config?.appId);

export function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  if (!isFirebaseConfigured()) throw new Error("Firebase is not configured. Set VITE_FIREBASE_* env vars.");
  _app = getApps().length > 0 ? getApps()[0]! : initializeApp(_config!);
  return _app;
}
