import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BackButtonProps {
  /** Optional fallback route if there's no history to go back to. */
  fallback?: string;
  /** Optional label override. Defaults to "Back". */
  label?: string;
  className?: string;
  /** Color of icon + label. */
  color?: string;
}

/**
 * Reusable back button — chevron-left + "Back" label, top-left.
 * Uses navigate(-1) to preserve the navigation stack (so scroll position
 * is restored on the parent screen), falling back to `fallback` when
 * history is empty (e.g. deep link).
 */
const BackButton = ({
  fallback = "/",
  label = "Back",
  className = "",
  color = "#f5f0ff",
}: BackButtonProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    // window.history.length === 1 means this is the first entry
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Go back"
      className={`inline-flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-3 py-2 rounded-full text-sm font-medium transition-all bg-background/70 backdrop-blur-md border border-border/60 shadow-sm hover:bg-background/90 active:scale-[0.97] touch-manipulation ${className}`}
      style={{ color, fontFamily: "Poppins, sans-serif" }}
    >
      <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
      <span>{label}</span>
    </button>
  );
};

export default BackButton;