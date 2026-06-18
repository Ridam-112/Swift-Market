import { api } from "./api";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function registerPushNotifications(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    // Register SW and wait for it to be fully active before using pushManager
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    const reg = await navigator.serviceWorker.ready;

    const { publicKey } = await api.get<{ success: boolean; publicKey: string }>("/push/vapid-public-key");
    if (!publicKey) return false;

    // Check for an existing subscription first — if key matches, reuse it
    let subscription = await reg.pushManager.getSubscription();
    const serverKey = urlBase64ToUint8Array(publicKey);

    if (!subscription) {
      // No existing subscription — create one
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: serverKey, // pass Uint8Array directly, not .buffer
      });
    }

    const subJson = subscription.toJSON() as {
      endpoint: string;
      keys?: { p256dh?: string; auth?: string };
    };

    await api.post("/push/subscribe", {
      endpoint: subJson.endpoint,
      keys: { p256dh: subJson.keys?.p256dh ?? "", auth: subJson.keys?.auth ?? "" },
    });

    return true;
  } catch (err) {
    console.error("[Push] Registration failed:", err);
    return false;
  }
}

export async function unregisterPushNotifications(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await api.post("/push/unsubscribe", { endpoint: sub.endpoint });
    await sub.unsubscribe();
  } catch { /* ignore */ }
}

export async function getPushPermissionState(): Promise<"granted" | "denied" | "default" | "unsupported"> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  return Notification.permission as "granted" | "denied" | "default";
}
