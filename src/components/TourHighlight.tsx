import { ReactNode } from "react";
import { useTourHighlight } from "@/hooks/useTourHighlight";

interface Props {
  /** Must match the `highlight` value emitted by OnboardingTour. */
  targetId: string;
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a screen region and pulses a soft accent ring around it for a few
 * seconds when the user lands here from a tour CTA.
 */
const TourHighlight = ({ targetId, children, className = "" }: Props) => {
  const active = useTourHighlight(targetId);
  return (
    <div
      data-tour-highlight={targetId}
      className={`relative transition-shadow duration-500 rounded-2xl ${
        active
          ? "ring-2 ring-accent/70 shadow-[0_0_0_6px_hsl(var(--accent)/0.15)] animate-pulse"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default TourHighlight;