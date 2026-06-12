import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { completeAuthRedirectFromUrl } from "@/lib/authRedirect";
import { Capacitor } from "@capacitor/core";

const hydrateOAuthSessionBeforeRender = async () => {
  await completeAuthRedirectFromUrl();
};

// Keep this Vite entry point present in GitHub for Codemagic builds.
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Stellara app root element was not found.");
}

hydrateOAuthSessionBeforeRender().finally(() => {
  createRoot(rootElement).render(<App />);
});

// Auto-reload when a new service worker takes control so the installed
// PWA never gets stuck on a stale build. Skipped on native (Capacitor)
// because WKWebView's SW behaviour caused an infinite reload loop on
// iOS during testing — native shells get their JS bundle from the
// app package, not from a service worker.
if ("serviceWorker" in navigator && !Capacitor.isNativePlatform()) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}
