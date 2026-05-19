import { useNavigate } from "react-router-dom";
import { Wand2 } from "lucide-react";

/**
 * Inline "Ask Lyra about this" button. Deep-links to /lyra with a `seed`
 * query param that the CosmicGuide page reads to pre-fill the composer.
 */
const AskLyraButton = ({ seed, label = "Ask Lyra about this" }: { seed: string; label?: string }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/lyra?seed=${encodeURIComponent(seed)}`)}
      className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
    >
      <Wand2 className="w-3 h-3" />
      {label}
    </button>
  );
};

export default AskLyraButton;