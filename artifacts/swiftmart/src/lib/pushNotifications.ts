import { api } from "./api";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
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

export type PushRegistrationResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Registers for push notifications, step by step.
 * Returns { success: true } on success, or { success: false; error: "<what failed>" }.
 * Always force-creates a fresh subscription to avoid VAPID key mismatch issues.
 */
export async function registerPushNotifications(): Promise<PushRegistrationResult> {
  // 1 — Feature check
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { success: false, error: "Push notifications are not supported by this browser." };
  }

  // 2 — Permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { success: false, error: "Notification permission was not granted." };
  }

  // 3 — Service worker registration + activation (15 s timeout)
  let reg: ServiceWorkerRegistration;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Service worker activation timed out (15 s). Try refreshing the page.")),
          15_000
        )
      ),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (import.meta.env.DEV) console.error("[Push] SW error:", msg);
    return { success: false, error: `Service worker error — ${msg}` };
  }

  // 4 — Fetch VAPID public key from backend
  let publicKey: string;
  try {
    const resp = await api.get<{ success: boolean; publicKey: string }>("/push/vapid-public-key");
    publicKey = resp.publicKey;
    if (!publicKey) throw new Error("Backend returned an empty VAPID public key.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (import.meta.env.DEV) console.error("[Push] VAPID fetch error:", msg);
    return { success: false, error: `Could not fetch push config from server — ${msg}` };
  }

  // 5 — Convert VAPID key
  let applicationServerKey: Uint8Array<ArrayBuffer>;
  try {
    applicationServerKey = urlBase64ToUint8Array(publicKey);
  } catch (err) {
    return { success: false, error: "Invalid VAPID public key format returned by server." };
  }

  // 6 — Always clear the existing subscription first.
  //     This prevents InvalidStateError when the VAPID key has changed since the
  //     last subscription was created (e.g. after a redeployment).
  try {
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await existing.unsubscribe();
      if (import.meta.env.DEV) console.log("[Push] Cleared existing subscription before re-subscribing.");
    }
  } catch (err) {
    if (import.meta.env.DEV) console.warn("[Push] Could not clear old subscription:", err);
  }

  // 7 — Create fresh push subscription
  let subscription: PushSubscription;
  try {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (import.meta.env.DEV) console.error("[Push] subscribe() failed:", msg);
    if (err instanceof DOMException && err.name === "NotAllowedError") {
      return { success: false, error: "Browser blocked the push subscription — allow notifications in browser settings and try again." };
    }
    return { success: false, error: `Push subscription failed — ${msg}` };
  }

  // 8 — Save subscription to backend
  try {
    await saveSubscriptionToServer(subscription);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (import.meta.env.DEV) console.error("[Push] saveSubscriptionToServer failed:", msg);
    // Undo browser subscription so state stays consistent
    try { await subscription.unsubscribe(); } catch { /* ignore */ }
    return { success: false, error: `Could not register device with server — ${msg}` };
  }

  if (import.meta.env.DEV) console.log("[Push] Registration complete:", subscription.endpoint.slice(0, 60) + "…");
  return { success: true };
}

export async function unregisterPushNotifications(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    if (!reg) return;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await api.post("/push/unsubscribe", { endpoint: sub.endpoint }).catch(() => {});
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
    // Check both common registration scopes
    const reg = await navigator.serviceWorker.getRegistration("/");
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
