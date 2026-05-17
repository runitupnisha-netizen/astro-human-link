import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "@/integrations/supabase/client";

const hydrateOAuthSessionBeforeRender = async () => {
  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get("code");
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  const isPasswordRecovery = window.location.pathname === "/reset-password" || hashParams.get("type") === "recovery";

  if (isPasswordRecovery) return;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.session) {
      const cleanPath = window.location.pathname === "/auth/callback" ? "/" : window.location.pathname;
      window.history.replaceState(null, document.title, cleanPath);
    }
    return;
  }

  if (!accessToken || !refreshToken) return;

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (!error && data.session) {
    window.history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`);
  }
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
