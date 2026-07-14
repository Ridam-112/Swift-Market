// ─── Firebase Messaging Service Worker ────────────────────────────────────────
// Uses the Firebase compat SDK (importScripts) so no bundler is needed.
// Firebase config is received from the main thread via postMessage { type: "FCM_INIT" }.
// Background messages (app closed/hidden): handled by onBackgroundMessage.
// Foreground messages (app open): handled by onMessage() in the main thread — NOT here.

importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js");

// ─── Lifecycle ────────────────────────────────────────────────────────────────
self.addEventListener("install", (e) => {
  console.log("[FCM SW] Installing — skipWaiting");
  e.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (e) => {
  console.log("[FCM SW] Activated — claiming clients");
  e.waitUntil(self.clients.claim());
});

// ─── Lazy init ────────────────────────────────────────────────────────────────
let _messaging = null;

function initFirebase(config) {
  if (_messaging) {
    console.log("[FCM SW] Already initialised — skipping");
    return;
  }
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
      console.log("[FCM SW] firebase.initializeApp() called with projectId:", config.projectId);
    } else {
      console.log("[FCM SW] Firebase app already exists — reusing");
    }
    _messaging = firebase.messaging();

    _messaging.onBackgroundMessage((payload) => {
      console.log("[FCM SW] Background message received:", JSON.stringify(payload));

      const title = payload.notification?.title ?? payload.data?.title ?? "SwiftMart";
      const body  = payload.notification?.body  ?? payload.data?.body  ?? "";

      // Build the deep-link URL for notification click
      const rawUrl = payload.data?.url ?? "/notifications";
      const fullUrl = rawUrl.startsWith("http")
        ? rawUrl
        : self.location.origin + (rawUrl.startsWith("/") ? rawUrl : "/" + rawUrl);

      // Show the system notification
      self.registration.showNotification(title, {
        body,
        icon:               "/icon-192.png",
        badge:              "/icon-192.png",
        tag:                payload.data?.type ?? "swiftmart",
        requireInteraction: false,
        data:               { ...(payload.data ?? {}), url: fullUrl },
        vibrate:            [200, 100, 200],
      });

      // Also post PUSH_RECEIVED to any open app windows so foreground toast fires
      // (catches the race where the app is visible but onMessage didn't fire)
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "PUSH_RECEIVED", title, body });
        });
      });
    });

    console.log("[FCM SW] Firebase Messaging initialised ✅");
  } catch (err) {
    console.error("[FCM SW] init failed:", err);
  }
}

// ─── Receive Firebase config from the main thread ─────────────────────────────
self.addEventListener("message", (event) => {
  console.log("[FCM SW] Message received:", event.data?.type);
  if (event.data?.type === "FCM_INIT" && event.data.config) {
    initFirebase(event.data.config);
  }
});

// ─── Notification click ───────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  console.log("[FCM SW] Notification clicked:", event.notification.tag);
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/";
  const fullUrl = targetUrl.startsWith("http")
    ? targetUrl
    : self.location.origin + (targetUrl.startsWith("/") ? targetUrl : "/" + targetUrl);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(fullUrl);
          return;
        }
      }
      return self.clients.openWindow(fullUrl);
    })
  );
});
