/**
 * Firebase Cloud Messaging — frontend token management.
 *
 * Flow (first-time registration):
 *  1. Request notification permission
 *  2. Register firebase-messaging-sw.js service worker
 *  3. Send FCM_INIT config to SW  ← must happen BEFORE getToken
 *  4. Fetch VAPID key from /api/fcm/config
 *  5. Call getToken() with the registered SW
 *  6. POST token to /api/fcm/register-token
 *
 * Flow (every page load, already registered):
 *  - initFcmOnLoad() re-sends FCM_INIT to the existing active SW
 *  - setupFcmForegroundListener() hooks onMessage() so foreground pushes show as toasts
 */

import { getMessaging, getToken, deleteToken, isSupported, onMessage } from "firebase/messaging";
import { api } from "./api";
import { getFirebaseApp, isFirebaseConfigured } from "./firebase";

const SW_PATH = "/firebase-messaging-sw.js";

function getFirebaseAppSafe() {
  if (!isFirebaseConfigured()) return null;
  try { return getFirebaseApp(); } catch { return null; }
}

async function fetchVapidKey(): Promise<string> {
  try {
    const d = await api.get<{ success: boolean; vapidKey: string }>("/fcm/config");
    console.log("[FCM] VAPID key fetched, length:", d.vapidKey?.length ?? 0);
    return d.vapidKey ?? "";
  } catch (err) {
    console.error("[FCM] fetchVapidKey failed:", err);
    return "";
  }
}

/**
 * Sends the Firebase config to the active service worker via postMessage.
 * The SW listens for { type: "FCM_INIT", config } to initialise firebase.messaging().
 * This MUST be sent before getToken() so the SW is ready to receive push events.
 */
async function sendConfigToSW(reg: ServiceWorkerRegistration): Promise<void> {
  const app = getFirebaseAppSafe();
  if (!app) {
    console.warn("[FCM] sendConfigToSW: Firebase app not configured — skipping");
    return;
  }
  const config = app.options;
  const sw = reg.active ?? reg.waiting ?? reg.installing;
  if (!sw) {
    console.warn("[FCM] sendConfigToSW: No SW worker found in registration");
    return;
  }

  const send = () => {
    sw.postMessage({ type: "FCM_INIT", config });
    console.log("[FCM] FCM_INIT sent to service worker (state:", sw.state, ")");
  };

  if (sw.state === "activated") {
    send();
  } else {
    console.log("[FCM] SW not yet activated (state:", sw.state, ") — waiting for activation");
    sw.addEventListener("statechange", function handler() {
      if (sw.state === "activated") {
        send();
        sw.removeEventListener("statechange", handler);
      }
    });
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export type FcmResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Called on every page load for users who have already granted notification permission.
 * Re-sends FCM_INIT to the existing service worker so background messages keep working.
 */
export async function initFcmOnLoad(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (!isFirebaseConfigured()) {
    console.log("[FCM] initFcmOnLoad: Firebase not configured — skipping");
    return;
  }
  if (Notification.permission !== "granted") {
    console.log("[FCM] initFcmOnLoad: Permission not granted (", Notification.permission, ") — skipping");
    return;
  }

  try {
    // Register (or get existing) firebase-messaging-sw.js
    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
    await navigator.serviceWorker.ready;
    console.log("[FCM] initFcmOnLoad: SW registered/found:", reg.scope, "active:", !!reg.active);
    await sendConfigToSW(reg);
  } catch (err) {
    console.error("[FCM] initFcmOnLoad: error:", err);
  }
}

/**
 * Sets up an onMessage() listener for foreground FCM messages.
 * Firebase calls this (not the SW) when the app is open in the browser.
 * Returns a cleanup function — call it on component unmount.
 */
export function setupFcmForegroundListener(
  onReceive: (title: string, body: string) => void
): () => void {
  const app = getFirebaseAppSafe();
  if (!app) {
    console.log("[FCM] setupFcmForegroundListener: Firebase not configured — skipping");
    return () => {};
  }

  try {
    const messaging = getMessaging(app);
    const unsub = onMessage(messaging, (payload) => {
      console.log("[FCM] Foreground message received:", JSON.stringify(payload));
      const title = payload.notification?.title ?? (payload.data?.["title"] as string) ?? "SwiftMart";
      const body  = payload.notification?.body  ?? (payload.data?.["body"]  as string) ?? "";
      onReceive(title, body);
    });
    console.log("[FCM] Foreground message listener active");
    return unsub;
  } catch (err) {
    console.error("[FCM] setupFcmForegroundListener error:", err);
    return () => {};
  }
}

/**
 * Registers this device for FCM push notifications.
 * Handles permission, SW registration, FCM_INIT, token generation, and backend save.
 */
export async function registerFcmToken(): Promise<FcmResult> {
  console.log("[FCM] registerFcmToken: starting");

  if (typeof window === "undefined" || !("Notification" in window)) {
    return { success: false, error: "Notifications are not supported by your browser." };
  }

  const supported = await isSupported().catch(() => false);
  if (!supported) {
    console.warn("[FCM] Firebase Messaging not supported in this browser");
    return { success: false, error: "Firebase Messaging is not supported in this browser." };
  }

  // 1 — Permission
  const permission = await Notification.requestPermission();
  console.log("[FCM] Permission status:", permission);
  if (permission === "denied") {
    return { success: false, error: "Notifications blocked. Please allow them in your browser settings." };
  }
  if (permission !== "granted") {
    return { success: false, error: "Notification permission was not granted." };
  }

  // 2 — Firebase app
  const app = getFirebaseAppSafe();
  if (!app) {
    console.error("[FCM] Firebase app not initialised — check VITE_FIREBASE_* config from /api/auth/config");
    return { success: false, error: "Firebase is not initialized. Try reloading the page." };
  }

  // 3 — Register service worker
  let swReg: ServiceWorkerRegistration;
  try {
    swReg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" });
    await navigator.serviceWorker.ready;
    console.log("[FCM] SW registered:", SW_PATH, "| active:", !!swReg.active);
  } catch (err) {
    console.error("[FCM] SW registration failed:", err);
    return { success: false, error: "Could not register service worker. Try reloading." };
  }

  // 4 — Send FCM config to SW BEFORE getToken (SW must be initialised first)
  await sendConfigToSW(swReg);
  // Give the SW a tick to process the message
  await new Promise(r => setTimeout(r, 200));

  // 5 — Fetch VAPID key
  const vapidKey = await fetchVapidKey();
  if (!vapidKey) {
    return { success: false, error: "Server is not configured for push notifications yet. Contact support." };
  }
  console.log("[FCM] Using VAPID key (first 20 chars):", vapidKey.substring(0, 20) + "...");

  // 6 — Get FCM token
  let token: string;
  try {
    const messaging = getMessaging(app);
    token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
    console.log("[FCM] Token generated:", token ? token.substring(0, 20) + "..." : "(empty)");
  } catch (firstErr) {
    const firstMsg = firstErr instanceof Error ? firstErr.message : String(firstErr);
    console.warn("[FCM] getToken failed (first attempt):", firstMsg);

    const isKeyMismatch =
      firstMsg.includes("application server key") ||
      firstMsg.includes("applicationServerKey") ||
      firstMsg.includes("different") ||
      firstMsg.includes("push subscription");

    if (isKeyMismatch) {
      console.log("[FCM] VAPID key mismatch — clearing old push subscription and retrying…");
      try {
        const existingSub = await swReg.pushManager.getSubscription();
        if (existingSub) await existingSub.unsubscribe();
        const messaging = getMessaging(app);
        token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
        console.log("[FCM] Token generated after clearing old subscription:", token?.substring(0, 20) + "...");
      } catch (retryErr) {
        console.error("[FCM] getToken retry also failed:", retryErr);
        return { success: false, error: "Could not renew push subscription. Try turning notifications off and on again." };
      }
    } else if (firstMsg.includes("permission-blocked") || firstMsg.includes("denied")) {
      return { success: false, error: "Notifications blocked. Please allow them in your browser settings." };
    } else {
      console.error("[FCM] getToken failed:", firstErr);
      return { success: false, error: `Could not get FCM token: ${firstMsg}` };
    }
  }

  if (!token!) {
    return { success: false, error: "Firebase returned an empty token. Please try again." };
  }

  // 7 — Save token to backend
  try {
    await api.post("/fcm/register-token", {
      token,
      platform: /android/i.test(navigator.userAgent) ? "android"
              : /iphone|ipad|ipod/i.test(navigator.userAgent) ? "ios" : "web",
    });
    console.log("[FCM] Token saved to backend successfully");
  } catch (err) {
    console.error("[FCM] register-token API failed:", err);
    return { success: false, error: "Token generated but could not save to server. Check your connection." };
  }

  console.log("[FCM] Registration complete ✅");
  return { success: true };
}

/**
 * Unregisters the FCM token for this device and notifies the backend.
 */
export async function unregisterFcmToken(): Promise<void> {
  try {
    const app = getFirebaseAppSafe();
    if (!app) return;
    const messaging = getMessaging(app);

    let currentToken: string | null = null;
    try {
      const vapidKey = await fetchVapidKey();
      if (vapidKey) {
        const swReg = await navigator.serviceWorker.getRegistration("/").catch(() => undefined);
        currentToken = await getToken(messaging, { vapidKey, ...(swReg ? { serviceWorkerRegistration: swReg } : {}) });
      }
    } catch { /* fall back to unregister-all */ }

    if (currentToken) {
      await api.post("/fcm/unregister-token", { token: currentToken }).catch(() => {});
    } else {
      await api.post("/fcm/unregister-all", {}).catch(() => {});
    }

    await deleteToken(messaging).catch(() => {});
    console.log("[FCM] Token unregistered");
  } catch {
    // Non-fatal
  }
}

/**
 * Returns the current notification state.
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
