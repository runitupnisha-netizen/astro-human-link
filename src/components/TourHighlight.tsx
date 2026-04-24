import { ReactNode, useEffect, useRef } from "react";
import { useTourHighlight } from "@/hooks/useTourHighlight";

interface Props {
  /** Must match the `highlight` value emitted by OnboardingTour. */
  targetId: string;
  children: ReactNode;
  className?: string;
  /**
   * Optional human-readable label describing what is being highlighted —
   * used in the screen-reader announcement (e.g. "Daily Cosmic Briefing").
   * Falls back to a generic "highlighted feature" message.
   */
  label?: string;
}

/**
 * Wraps a screen region and pulses a soft accent outline around it for a few
 * seconds when the user lands here from a tour CTA.
 *
 * Layout notes:
 * - The wrapper always renders the supplied `className` so callers can keep
 *   their grid / flex / spacing rules intact (e.g. `lg:col-span-1`,
 *   `space-y-4`, `h-full`).
 * - The highlight uses `outline` (which doesn't occupy layout space) instead
 *   of `ring + shadow`, so it never shifts neighboring elements.
 * - We intentionally do NOT use `animate-pulse` on the wrapper because that
 *   utility animates the opacity of *all* descendants, which dimmed the cards
 *   inside Messages / Premium / Connections during the highlight window.
 *
 * Accessibility:
 * - When the highlight activates, we scroll the region into view, move
 *   keyboard focus to it (via a tabindex=-1 wrapper) so screen-reader users
 *   land on the right context, and emit a polite aria-live announcement so
 *   non-sighted users hear what was highlighted.
 * - We respect `prefers-reduced-motion`: scrolling uses `auto` instead of
 *   `smooth`, and the pulsing animation is disabled via CSS.
 */
const TourHighlight = ({ targetId, children, className = "", label }: Props) => {
  const active = useTourHighlight(targetId);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!active || !wrapperRef.current) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Scroll the highlighted region into view so the user can actually see
    // the pulse. Use a short timeout so any route transition settles first.
    //
    // Mobile (≤768px): the app uses a fixed top nav (pt-20 ≈ 80px) and a
    //   fixed bottom tab bar (pb-20 ≈ 80px). `scrollIntoView({block:"center"})`
    //   often parks the region behind the top nav on long pages, so we
    //   compute a manual offset (header height + small breathing room) and
    //   smooth-scroll the window directly.
    // Desktop (>768px): center the region in the viewport — there's plenty
    //   of vertical room and the nav is more compact.
    const scrollTimer = window.setTimeout(() => {
      const el = wrapperRef.current;
      if (!el) return;

      const isSmallScreen =
        typeof window !== "undefined" && window.innerWidth <= 768;
      const behavior: ScrollBehavior = reduceMotion ? "auto" : "smooth";

      if (isSmallScreen) {
        // Account for the fixed top navigation (~80px) plus 16px of
        // breathing room so the pulse outline isn't clipped by the header.
        const HEADER_OFFSET = 96;
        const top =
          el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
        window.scrollTo({ top: Math.max(0, top), behavior });
      } else {
        el.scrollIntoView({ behavior, block: "center" });
      }

      // Move focus without triggering another scroll jump.
      el.focus({ preventScroll: true });
    }, 150);

    return () => window.clearTimeout(scrollTimer);
  }, [active]);

  const announcement = active
    ? `Now showing: ${label ?? "highlighted feature"}. Press Tab to interact.`
    : "";

  return (
    <>
      <div
        ref={wrapperRef}
        data-tour-highlight={targetId}
        // tabIndex=-1 lets us programmatically focus the region without
        // adding it to the natural Tab order. role="region" + aria-label
        // give screen readers a meaningful landmark to announce.
        tabIndex={active ? -1 : undefined}
        role={active ? "region" : undefined}
        aria-label={active ? label ?? "Highlighted feature" : undefined}
        style={
          active
            ? {
                outline: "2px solid hsl(var(--accent) / 0.7)",
                outlineOffset: "6px",
                borderRadius: "1rem",
                animation: "tourPulse 1.6s ease-in-out infinite",
                transition: "outline-color 300ms ease",
              }
            : undefined
        }
        className={className}
      >
        {children}
      </div>
      {/* Polite live region — announces only while a highlight is active.
          Visually hidden but exposed to assistive tech. */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>
    </>
  );
};

export default TourHighlight;