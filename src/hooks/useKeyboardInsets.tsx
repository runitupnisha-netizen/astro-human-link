import { useEffect } from "react";

/**
 * Tracks the on-screen virtual keyboard height by watching `window.visualViewport`
 * and exposes it as a CSS variable `--keyboard-inset` on `<html>`.
 *
 * Components that need to stay above the keyboard can use:
 *   style={{ paddingBottom: "calc(var(--keyboard-inset, 0px) + env(safe-area-inset-bottom) + 5.5rem)" }}
 * or the `.keyboard-aware-bottom` utility.
 *
 * Also auto-scrolls the focused input into view on mobile when the keyboard opens.
 */
export function useKeyboardInsets() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const root = document.documentElement;
    let raf = 0;

    const update = () => {
      // Difference between layout viewport and visual viewport ≈ keyboard height.
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty("--keyboard-inset", `${Math.round(inset)}px`);
      root.classList.toggle("kb-open", inset > 80);
    };

    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const isField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;
      if (!isField) return;
      // Wait for the keyboard animation to finish, then scroll into view.
      window.setTimeout(() => {
        try {
          target.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch {
          /* no-op */
        }
      }, 300);
    };

    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    document.addEventListener("focusin", onFocusIn);
    update();

    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
      document.removeEventListener("focusin", onFocusIn);
      cancelAnimationFrame(raf);
      root.style.removeProperty("--keyboard-inset");
      root.classList.remove("kb-open");
    };
  }, []);
}