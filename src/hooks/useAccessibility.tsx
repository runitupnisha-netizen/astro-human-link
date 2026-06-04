import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import type { ReactNode } from "react";

const STORAGE_KEY = "stellara:a11y:v1";

export type TextSize = "sm" | "md" | "lg" | "xl";

/** Maps the user-facing text size to a root font-size in px.
 *  Tailwind's `rem` units all scale off of this. */
const TEXT_SIZE_PX: Record<TextSize, number> = {
  sm: 14, // Small
  md: 16, // Medium (default browser size)
  lg: 19, // Large
  xl: 22, // Extra Large
};

export interface AccessibilityPrefs {
  /** Disable all non-essential animations (expand/collapse, hover scale, page transitions). */
  reducedMotion: boolean;
  /** Boost contrast: opaque surfaces, stronger borders, removes glassy translucency. */
  highContrast: boolean;
  /** Base text size — scales every rem-based size in the app. */
  textSize: TextSize;
  /** Respect the device's system text size (iOS Dynamic Type / Android font scale). */
  followSystemTextSize: boolean;
}

const DEFAULTS: AccessibilityPrefs = {
  reducedMotion: false,
  highContrast: false,
  textSize: "md",
  followSystemTextSize: true,
};

type Ctx = AccessibilityPrefs & {
  /** True if the OS reports prefers-reduced-motion (independent of the user toggle). */
  systemReducedMotion: boolean;
  /** Effective reduced-motion: `reducedMotion || systemReducedMotion`. */
  prefersReducedMotion: boolean;
  /** System font-scale multiplier reported by the device (1 = default). */
  systemFontScale: number;
  /** Final px value applied to <html>'s font-size. */
  effectiveBaseFontPx: number;
  setReducedMotion: (v: boolean) => void;
  setHighContrast: (v: boolean) => void;
  setTextSize: (v: TextSize) => void;
  setFollowSystemTextSize: (v: boolean) => void;
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
      textSize: (["sm", "md", "lg", "xl"] as TextSize[]).includes(parsed.textSize)
        ? parsed.textSize
        : DEFAULTS.textSize,
      followSystemTextSize:
        typeof parsed.followSystemTextSize === "boolean"
          ? parsed.followSystemTextSize
          : DEFAULTS.followSystemTextSize,
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

  // Best-effort detection of iOS Dynamic Type / Android font scale.
  // We compare the real rendered font-size of a 1rem probe vs. the browser
  // default (16px). If the OS bumped the system text size, the ratio is > 1.
  const [systemFontScale, setSystemFontScale] = useState<number>(1);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const measure = () => {
      try {
        const probe = document.createElement("div");
        probe.style.cssText =
          "position:absolute;left:-9999px;top:-9999px;font-size:1rem;visibility:hidden;";
        document.body.appendChild(probe);
        const px = parseFloat(getComputedStyle(probe).fontSize);
        document.body.removeChild(probe);
        if (px && !Number.isNaN(px)) {
          setSystemFontScale(px / 16);
        }
      } catch {
        /* ignore */
      }
    };
    // Defer until after first paint so our own root font-size override
    // doesn't pollute the measurement.
    const t = window.setTimeout(measure, 0);
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, []);

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

  // Effective root font-size: user choice, optionally multiplied by the
  // device system scale so iOS Dynamic Type / Android font scale is honored.
  const effectiveBaseFontPx = useMemo(() => {
    const base = TEXT_SIZE_PX[prefs.textSize] ?? TEXT_SIZE_PX.md;
    const scale = prefs.followSystemTextSize ? systemFontScale : 1;
    // Clamp so a wildly large system scale can't break layouts.
    const px = Math.max(12, Math.min(28, base * scale));
    return Math.round(px * 10) / 10;
  }, [prefs.textSize, prefs.followSystemTextSize, systemFontScale]);

  // Apply classes to <html> so CSS in index.css can react globally.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const motionOn = prefs.reducedMotion || systemReducedMotion;
    root.classList.toggle("reduce-motion", motionOn);
    root.classList.toggle("high-contrast", prefs.highContrast);
    root.style.fontSize = `${effectiveBaseFontPx}px`;
    root.dataset.textSize = prefs.textSize;
  }, [prefs.reducedMotion, prefs.highContrast, systemReducedMotion, effectiveBaseFontPx, prefs.textSize]);

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
    systemFontScale,
    effectiveBaseFontPx,
    setReducedMotion: (v) => update({ reducedMotion: v }),
    setHighContrast: (v) => update({ highContrast: v }),
    setTextSize: (v) => update({ textSize: v }),
    setFollowSystemTextSize: (v) => update({ followSystemTextSize: v }),
    reset: () => {
      persist(DEFAULTS);
      setPrefs(DEFAULTS);
    },
  }), [prefs, systemReducedMotion, systemFontScale, effectiveBaseFontPx, update]);

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
      systemFontScale: 1,
      effectiveBaseFontPx: TEXT_SIZE_PX.md,
      setReducedMotion: () => {},
      setHighContrast: () => {},
      setTextSize: () => {},
      setFollowSystemTextSize: () => {},
      reset: () => {},
    };
  }
  return ctx;
};
