// Service Worker for push notifications
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "Aligned ✨";
  const options = {
    body: data.body || "Your daily cosmic intention is ready",
    icon: "/aligned-logo.png",
    badge: "/aligned-logo.png",
    vibrate: [100, 50, 100],
    data: { url: data.url || "/insights" },
    actions: [{ action: "open", title: "View Intention" }],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/insights";
  event.waitUntil(clients.openWindow(url));
});
