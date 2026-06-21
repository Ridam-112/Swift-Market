import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

const projectId   = process.env["FIREBASE_PROJECT_ID"]   ?? process.env["VITE_FIREBASE_PROJECT_ID"] ?? "";
const clientEmail = process.env["FIREBASE_CLIENT_EMAIL"] ?? "";
const privateKey  = (process.env["FIREBASE_PRIVATE_KEY"] ?? "").replace(/\\n/g, "\n");

let _ready = false;

function ensureInit(): boolean {
  if (_ready) return true;
  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      "[FCM] Firebase Admin SDK not configured — " +
      "set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY secrets to enable push notifications."
    );
    return false;
  }
  try {
    if (getApps().length === 0) {
      initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    }
    _ready = true;
    console.log("[FCM] Firebase Admin SDK initialized (project:", projectId, ")");
    return true;
  } catch (err) {
    console.error("[FCM] initializeApp failed:", err);
    return false;
  }
}

export function getMessagingInstance() {
  if (!ensureInit()) return null;
  try {
    return getMessaging();
  } catch (err) {
    console.error("[FCM] getMessaging failed:", err);
    return null;
  }
}
