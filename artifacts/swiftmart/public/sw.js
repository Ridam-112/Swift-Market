self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch { data = { title: "SwiftMart", body: event.data.text() }; }

  const title = data.title ?? "SwiftMart";
  const options = {
    body:    data.body    ?? data.message ?? "",
    icon:    data.icon    ?? "/logo.png",
    badge:   data.badge   ?? "/logo.png",
    tag:     data.tag     ?? "swiftmart-notification",
    data:    data.data    ?? {},
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/notifications";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(url);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
