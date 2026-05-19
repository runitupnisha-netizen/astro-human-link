import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Crown } from "lucide-react";
import { usePremium } from "@/hooks/usePremium";

interface Props {
  title: string;
  teaser: string;
  children?: ReactNode;
  /** Optional seed prompt — Free users see "Ask Lyra" CTA instead of just paywall */
  lyraSeed?: string;
}

/**
 * Premium-gated section wrapper. If the user is subscribed, renders
 * `children`. Otherwise renders a 2-3 line teaser + Unlock CTA, plus
 * an optional "Ask Lyra" fallback so the section never feels dead.
 */
const PremiumLock = ({ title, teaser, children, lyraSeed }: Props) => {
  const navigate = useNavigate();
  const { subscribed } = usePremium();

  if (subscribed) return <>{children}</>;

  return (
    <div className="relative rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/5 via-card/60 to-transparent backdrop-blur-md p-6 overflow-hidden">
      <div className="absolute top-4 right-4">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-400/15">
          <Lock className="w-4 h-4 text-amber-400" />
        </div>
      </div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400/80 font-semibold mb-2">Premium</p>
      <h3 className="font-display text-lg font-semibold text-foreground mb-3 pr-10">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed blur-[0.4px] opacity-90 line-clamp-3">
        {teaser}
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigate("/premium")}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-background bg-gradient-golden shadow-golden hover:opacity-90 transition-opacity"
        >
          <Crown className="w-3.5 h-3.5" />
          Unlock with Premium
        </button>
        {lyraSeed && (
          <button
            type="button"
            onClick={() => navigate(`/lyra?seed=${encodeURIComponent(lyraSeed)}`)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/60 px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            Ask Lyra for a preview
          </button>
        )}
      </div>
    </div>
  );
};

export default PremiumLock;