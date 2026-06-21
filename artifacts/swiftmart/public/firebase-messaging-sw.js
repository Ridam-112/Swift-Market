// ─── Firebase Messaging Service Worker ────────────────────────────────────────
// Uses the Firebase compat SDK (importScripts) so no bundler is needed.
// Firebase config is received from the main thread via postMessage.

importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js");

// ─── Lifecycle ────────────────────────────────────────────────────────────────
self.addEventListener("install",  (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// ─── Lazy init ────────────────────────────────────────────────────────────────
let _messaging = null;

function initFirebase(config) {
  if (_messaging) return;
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    _messaging = firebase.messaging();

    _messaging.onBackgroundMessage((payload) => {
      // Only called for data-only messages — notification-payload messages are
      // shown automatically by the browser.
      const title = payload.notification?.title ?? payload.data?.title ?? "SwiftMart";
      const body  = payload.notification?.body  ?? payload.data?.body  ?? "";
      self.registration.showNotification(title, {
        body,
        icon:               "/logo.png",
        badge:              "/logo.png",
        tag:                payload.data?.type ?? "swiftmart",
        requireInteraction: false,
        data:               payload.data ?? {},
      });
    });

    console.log("[FCM SW] Firebase initialized");
  } catch (err) {
    console.error("[FCM SW] init failed:", err);
  }
}

// Receive Firebase config from the main thread
self.addEventListener("message", (event) => {
  if (event.data?.type === "FCM_INIT" && event.data.config) {
    initFirebase(event.data.config);
  }
});

// ─── Notification click ───────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/";
  // targetUrl may be absolute (https://...) or relative (/path) — handle both
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
