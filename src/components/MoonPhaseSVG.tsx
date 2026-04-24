import { MoonPhaseKey } from "@/lib/moonPhase";

interface MoonPhaseSVGProps {
  phase: MoonPhaseKey;
  size?: number;
  glow?: boolean;
  className?: string;
}

/**
 * Geometric SVG moon phase. Lavender (#d0b4f7) on dark.
 * Uses two overlapping circles + a darker mask for crescents/gibbous.
 */
const MoonPhaseSVG = ({ phase, size = 140, glow = true, className = "" }: MoonPhaseSVGProps) => {
  const lit = "#d0b4f7";
  const dark = "#1a0d2e";
  const border = "#7F77DD";

  const renderShape = () => {
    switch (phase) {
      case "new_moon":
        return (
          <circle cx="50" cy="50" r="44" fill={dark} stroke={border} strokeWidth="1" />
        );
      case "full_moon":
        return <circle cx="50" cy="50" r="44" fill={lit} />;
      case "first_quarter":
        return (
          <>
            <circle cx="50" cy="50" r="44" fill={dark} />
            <path d="M50 6 A44 44 0 0 1 50 94 Z" fill={lit} />
          </>
        );
      case "last_quarter":
        return (
          <>
            <circle cx="50" cy="50" r="44" fill={dark} />
            <path d="M50 6 A44 44 0 0 0 50 94 Z" fill={lit} />
          </>
        );
      case "waxing_crescent":
        return (
          <>
            <circle cx="50" cy="50" r="44" fill={dark} stroke={border} strokeWidth="0.5" />
            <path d="M50 6 A44 44 0 0 1 50 94 A30 44 0 0 0 50 6 Z" fill={lit} />
          </>
        );
      case "waning_crescent":
        return (
          <>
            <circle cx="50" cy="50" r="44" fill={dark} stroke={border} strokeWidth="0.5" />
            <path d="M50 6 A44 44 0 0 0 50 94 A30 44 0 0 1 50 6 Z" fill={lit} />
          </>
        );
      case "waxing_gibbous":
        return (
          <>
            <circle cx="50" cy="50" r="44" fill={lit} />
            <path d="M50 6 A44 44 0 0 0 50 94 A20 44 0 0 1 50 6 Z" fill={dark} />
          </>
        );
      case "waning_gibbous":
        return (
          <>
            <circle cx="50" cy="50" r="44" fill={lit} />
            <path d="M50 6 A44 44 0 0 1 50 94 A20 44 0 0 0 50 6 Z" fill={dark} />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {glow && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, rgba(127,119,221,${phase === "full_moon" ? 0.5 : 0.3}) 0%, transparent 70%)`,
            transform: "scale(1.4)",
          }}
        />
      )}
      <svg viewBox="0 0 100 100" width={size} height={size} className="relative">
        {renderShape()}
      </svg>
    </div>
  );
};

export default MoonPhaseSVG;