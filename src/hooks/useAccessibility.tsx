import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import type { ReactNode } from "react";

const STORAGE_KEY = "stellara:a11y:v1";

export interface AccessibilityPrefs {
  /** Disable all non-essential animations (expand/collapse, hover scale, page transitions). */
  reducedMotion: boolean;
  /** Boost contrast: opaque surfaces, stronger borders, removes glassy translucency. */
  highContrast: boolean;
}

const DEFAULTS: AccessibilityPrefs = {
  reducedMotion: false,
  highContrast: false,
};

type Ctx = AccessibilityPrefs & {
  /** True if the OS reports prefers-reduced-motion (independent of the user toggle). */
  systemReducedMotion: boolean;
  /** Effective reduced-motion: `reducedMotion || systemReducedMotion`. */
  prefersReducedMotion: boolean;
  setReducedMotion: (v: boolean) => void;
  setHighContrast: (v: boolean) => void;
  reset: () => void;
};

const AccessibilityContext = createContext<Ctx | null>(null);

const readStored = (): AccessibilityPrefs => {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      reducedMotion: !!parsed.reducedMotion,
      highContrast: !!parsed.highContrast,
    };
  } catch {
    return DEFAULTS;
  }
};

const persist = (prefs: AccessibilityPrefs) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore (private mode etc.) */
  }
};

export const AccessibilityProvider = ({ children }: { children: ReactNode }) => {
  const [prefs, setPrefs] = useState<AccessibilityPrefs>(() => readStored());
  const [systemReducedMotion, setSystemReducedMotion] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  // Listen for OS-level changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setSystemReducedMotion(e.matches);
    if (mql.addEventListener) mql.addEventListener("change", onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener("change", onChange);
      else mql.removeListener(onChange);
    };
  }, []);

  // Apply classes to <html> so CSS in index.css can react globally.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const motionOn = prefs.reducedMotion || systemReducedMotion;
    root.classList.toggle("reduce-motion", motionOn);
    root.classList.toggle("high-contrast", prefs.highContrast);
  }, [prefs.reducedMotion, prefs.highContrast, systemReducedMotion]);

  const update = useCallback((patch: Partial<AccessibilityPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  }, []);

  const value = useMemo<Ctx>(() => ({
    ...prefs,
    systemReducedMotion,
    prefersReducedMotion: prefs.reducedMotion || systemReducedMotion,
    setReducedMotion: (v) => update({ reducedMotion: v }),
    setHighContrast: (v) => update({ highContrast: v }),
    reset: () => {
      persist(DEFAULTS);
      setPrefs(DEFAULTS);
    },
  }), [prefs, systemReducedMotion, update]);

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = (): Ctx => {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    // Safe fallback — lets components used outside the provider (e.g. in tests) keep rendering.
    return {
      ...DEFAULTS,
      systemReducedMotion: false,
      prefersReducedMotion: false,
      setReducedMotion: () => {},
      setHighContrast: () => {},
      reset: () => {},
    };
  }
  return ctx;
};
