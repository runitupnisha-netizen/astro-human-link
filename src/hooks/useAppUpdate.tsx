import { useEffect, useState } from "react";

/**
 * Detects when a new app bundle has been deployed by polling the
 * server's index.html and comparing the hashed entry script tag
 * against the one that loaded the current session.
 *
 * Vite emits filenames like `/assets/index-AbCdEf12.js`, so a
 * deploy produces a different script src and we can prompt the
 * user to reload.
 */

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const extractEntryScripts = (html: string): string[] => {
  const matches = Array.from(
    html.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi),
  );
  return matches
    .map((m) => m[1])
    .filter((src) => /\/assets\/.+\.js$/i.test(src))
    .sort();
};

const getCurrentEntryScripts = (): string[] => {
  if (typeof document === "undefined") return [];
  return Array.from(document.querySelectorAll<HTMLScriptElement>("script[src]"))
    .map((s) => {
      try {
        return new URL(s.src, window.location.origin).pathname;
      } catch {
        return s.src;
      }
    })
    .filter((src) => /\/assets\/.+\.js$/i.test(src))
    .sort();
};

export const useAppUpdate = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Dev / preview iframe — skip; only run in production-like contexts.
    if (import.meta.env.DEV) return;

    let cancelled = false;
    const baseline = getCurrentEntryScripts();
    if (baseline.length === 0) return; // nothing to compare against

    const check = async () => {
      if (cancelled || updateAvailable) return;
      if (document.visibilityState === "hidden") return;
      try {
        const res = await fetch(`/index.html?_=${Date.now()}`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const html = await res.text();
        const latest = extractEntryScripts(html);
        if (latest.length === 0) return;
        const changed =
          latest.length !== baseline.length ||
          latest.some((src, i) => src !== baseline[i]);
        if (changed && !cancelled) setUpdateAvailable(true);
      } catch {
        // network hiccup — ignore, try again next tick
      }
    };

    // First check shortly after mount, then on an interval and when the
    // tab returns to the foreground.
    const initial = window.setTimeout(check, 15_000);
    const interval = window.setInterval(check, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearTimeout(initial);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [updateAvailable]);

  return { updateAvailable };
};
