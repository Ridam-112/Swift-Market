import { api } from "./api";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function saveSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  const subJson = subscription.toJSON() as {
    endpoint: string;
    keys?: { p256dh?: string; auth?: string };
  };

  const p256dh = subJson.keys?.p256dh ?? "";
  const auth   = subJson.keys?.auth   ?? "";

  if (!subJson.endpoint || !p256dh || !auth) {
    throw new Error("Push subscription is missing required fields (endpoint/p256dh/auth)");
  }

  await api.post("/push/subscribe", {
    endpoint: subJson.endpoint,
    keys: { p256dh, auth },
  });
}

export async function registerPushNotifications(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    const reg = await navigator.serviceWorker.ready;

    const { publicKey } = await api.get<{ success: boolean; publicKey: string }>("/push/vapid-public-key");
    if (!publicKey) return false;

    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // Try reusing the existing browser subscription first
    let subscription = await reg.pushManager.getSubscription();

    if (subscription) {
      try {
        await saveSubscriptionToServer(subscription);
        return true;
      } catch (err) {
        // Subscription is stale (VAPID key mismatch or missing fields) — clear it and start fresh
        console.warn("[Push] Existing subscription invalid, clearing:", err);
        await subscription.unsubscribe();
        subscription = null;
      }
    }

    // Create a fresh subscription with the current VAPID key
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    await saveSubscriptionToServer(subscription);
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

/**
 * Returns the REAL push state: checks both the browser permission AND whether
 * an active push subscription exists. Use this for banner display so we don't
 * show "Push notifications on" when permission is granted but no subscription
 * was ever successfully created.
 */
export async function getActualPushState(): Promise<"subscribed" | "permission_only" | "denied" | "default" | "unsupported"> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  const permission = Notification.permission;
  if (permission === "denied") return "denied";
  if (permission !== "granted") return "default";
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!reg) return "permission_only";
    const sub = await reg.pushManager.getSubscription();
    return sub ? "subscribed" : "permission_only";
  } catch {
    return "permission_only";
  }
}

/**
 * Plays three sharp urgent beeps — used for new vendor orders.
 * Also vibrates the device if supported.
 */
export function playVendorAlert(): void {
  try {
    if ("vibrate" in navigator) navigator.vibrate([300, 120, 300, 120, 300]);

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    [0, 0.22, 0.44].forEach((startAt) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(880, ctx.currentTime + startAt);
      gain.gain.setValueAtTime(0.28, ctx.currentTime + startAt);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startAt + 0.17);
      osc.start(ctx.currentTime + startAt);
      osc.stop(ctx.currentTime + startAt + 0.17);
    });

    setTimeout(() => ctx.close().catch(() => {}), 1000);
  } catch { /* ignore */ }
}

/**
 * Plays a two-note notification chime using the Web Audio API.
 * Works even when the device is in silent mode for web audio (not ringer).
 */
export function playNotificationSound(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const play = (freq: number, startAt: number, duration: number, volume = 0.35) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt);
      gain.gain.setValueAtTime(volume, ctx.currentTime + startAt);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startAt + duration);
      osc.start(ctx.currentTime + startAt);
      osc.stop(ctx.currentTime + startAt + duration);
    };

    play(784,  0,    0.22);
    play(988,  0.14, 0.28);

    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch { /* ignore — audio API unavailable */ }
}

/**
 * Sets up a listener for messages posted by the service worker when a push
 * arrives while the app is in the foreground. Returns a cleanup function.
 */
export function setupPushMessageListener(
  onReceive: (title: string, body: string) => void
): () => void {
  if (!("serviceWorker" in navigator)) return () => {};

  const handler = (event: MessageEvent) => {
    if (event.data?.type === "PUSH_RECEIVED") {
      onReceive(event.data.title as string, event.data.body as string);
    }
  };

  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}
