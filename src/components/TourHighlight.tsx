import { ReactNode } from "react";
import { useTourHighlight } from "@/hooks/useTourHighlight";

interface Props {
  /** Must match the `highlight` value emitted by OnboardingTour. */
  targetId: string;
  children: ReactNode;
  className?: string;
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
 */
const TourHighlight = ({ targetId, children, className = "" }: Props) => {
  const active = useTourHighlight(targetId);
  return (
    <div
      data-tour-highlight={targetId}
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
  );
};

export default TourHighlight;