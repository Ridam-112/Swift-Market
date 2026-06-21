/**
 * Firebase Cloud Messaging — frontend token management.
 *
 * Flow:
 *  1. Request notification permission
 *  2. Fetch VAPID key from /api/fcm/config
 *  3. Get Firebase app (already initialized by AuthContext)
 *  4. Register firebase-messaging-sw.js
 *  5. Call getToken() → FCM registration token
 *  6. POST token to /api/fcm/register-token
 *  7. Send Firebase config to SW via postMessage for background message handling
 */

import { getMessaging, getToken, deleteToken, isSupported } from "firebase/messaging";
import { getApps, getApp } from "firebase/app";
import { api } from "./api";

const SW_PATH = "/firebase-messaging-sw.js";

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getFirebaseApp() {
  return getApps().length > 0 ? getApp() : null;
}

async function fetchVapidKey(): Promise<string> {
  try {
    const d = await api.get<{ success: boolean; vapidKey: string }>("/fcm/config");
    return d.vapidKey ?? "";
  } catch {
    return "";
  }
}

async function sendConfigToSW(reg: ServiceWorkerRegistration): Promise<void> {
  const app = getFirebaseApp();
  if (!app) return;
  const config = app.options;
  const sw = reg.active ?? reg.installing ?? reg.waiting;
  if (!sw) return;
  const send = () => sw.postMessage({ type: "FCM_INIT", config });
  if (sw.state === "activated") {
    send();
  } else {
    sw.addEventListener("statechange", () => { if (sw.state === "activated") send(); }, { once: true });
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type FcmResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Registers this device for FCM push notifications.
 * Handles permission, SW registration, token generation, and backend save.
 */
export async function registerFcmToken(): Promise<FcmResult> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return { success: false, error: "Notifications are not supported by your browser." };
  }

  const supported = await isSupported().catch(() => false);
  if (!supported) {
    return { success: false, error: "Firebase Messaging is not supported in this browser." };
  }

  const permission = await Notification.requestPermission();
  if (permission === "denied") {
    return { success: false, error: "Notifications blocked. Please allow them in your browser settings." };
  }
  if (permission !== "granted") {
    return { success: false, error: "Notification permission was not granted." };
  }

  const app = getFirebaseApp();
  if (!app) {
    return { success: false, error: "Firebase is not initialized. Try reloading the page." };
  }

  const vapidKey = await fetchVapidKey();
  if (!vapidKey) {
    return { success: false, error: "Server is not configured for push notifications yet. Contact support." };
  }

  let swReg: ServiceWorkerRegistration;
  try {
    swReg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
    await navigator.serviceWorker.ready;
  } catch (err) {
    console.error("[FCM] SW registration failed:", err);
    return { success: false, error: "Could not register service worker. Try reloading." };
  }

  let token: string;
  try {
    const messaging = getMessaging(app);
    token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
  } catch (err) {
    console.error("[FCM] getToken failed:", err);
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("permission-blocked") || msg.includes("denied")) {
      return { success: false, error: "Notifications blocked. Please allow them in your browser settings." };
    }
    return { success: false, error: "Could not get FCM token. Check browser console for details." };
  }

  if (!token) {
    return { success: false, error: "Firebase returned an empty token. Please try again." };
  }

  try {
    await api.post("/fcm/register-token", {
      token,
      platform: /android/i.test(navigator.userAgent) ? "android"
              : /iphone|ipad|ipod/i.test(navigator.userAgent) ? "ios" : "web",
    });
  } catch (err) {
    console.error("[FCM] register-token API failed:", err);
    return { success: false, error: "Token generated but could not save to server. Check your connection." };
  }

  void sendConfigToSW(swReg);
  return { success: true };
}

/**
 * Unregisters the FCM token for this device and notifies the backend.
 * Falls back to deactivating all tokens for this user if the specific token
 * cannot be retrieved (e.g. VAPID key mismatch after a redeploy).
 */
export async function unregisterFcmToken(): Promise<void> {
  try {
    const app = getFirebaseApp();
    if (!app) return;
    const messaging = getMessaging(app);

    // Try to get the current token with the VAPID key so we know which one to deactivate
    let currentToken: string | null = null;
    try {
      const vapidKey = await fetchVapidKey();
      if (vapidKey) {
        // Re-use the existing service worker registration if available
        const swReg = await navigator.serviceWorker.getRegistration("/").catch(() => undefined);
        currentToken = await getToken(messaging, { vapidKey, ...(swReg ? { serviceWorkerRegistration: swReg } : {}) });
      }
    } catch {
      // Couldn't retrieve token — will fall back to unregister-all below
    }

    if (currentToken) {
      await api.post("/fcm/unregister-token", { token: currentToken }).catch(() => {});
    } else {
      // Fallback: deactivate all tokens for this user on the server
      await api.post("/fcm/unregister-all", {}).catch(() => {});
    }

    // Always delete the local Firebase token, regardless of backend result
    await deleteToken(messaging).catch(() => {});
  } catch {
    // Non-fatal
  }
}

/**
 * Returns the current notification state.
 * "subscribed"  — permission granted (token should be in browser)
 * "default"     — permission not yet asked
 * "denied"      — permission blocked by user
 * "unsupported" — browser doesn't support push messaging
 */
export async function getFcmState(): Promise<"subscribed" | "default" | "denied" | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  const supported = await isSupported().catch(() => false);
  if (!supported) return "unsupported";
  const permission = Notification.permission;
  if (permission === "denied") return "denied";
  if (permission !== "granted") return "default";
  return "subscribed";
}
