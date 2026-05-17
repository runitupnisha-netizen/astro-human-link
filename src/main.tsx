import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { completeAuthRedirectFromUrl } from "@/lib/authRedirect";

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

// Auto-reload when a new service worker takes control so the
// installed PWA / Capacitor shell never gets stuck on a stale build.
if ("serviceWorker" in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}
