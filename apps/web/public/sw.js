// Service Worker for Push Notifications

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Mukha Mudra", body: event.data.text() };
  }

  const options = {
    body: payload.body,
    icon:
      payload.icon ||
      "/mukha_mudra_logos/mm_logo_t.png",
    badge:
      payload.badge ||
      "/mukha_mudra_logos/mm_logo_t.png",
    tag: payload.tag || "default",
    renotify: true,
    data: {
      url: payload.url || "/app",
    },
  };

  event.waitUntil(
    self.registration.showNotification(
      payload.title || "Mukha Mudra",
      options,
    ),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/app";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
