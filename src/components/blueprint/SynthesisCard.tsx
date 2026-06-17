import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { Sparkles, Crown, RefreshCw, Bookmark, Wand2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import { toast } from "@/hooks/use-toast";

/**
 * Cross-science Synthesis card. Sits at the top of the Blueprint hub.
 * Free tier:  1-2 sentence deterministic teaser from local profile data + Unlock CTA.
 * Premium:    Full 3-4 paragraph reading from `blueprint-synthesis` edge function,
 *             cached in `blueprint_ai_cache`. Refresh on demand.
 */
const SYNTHESIS_SEED_FALLBACK =
  "Read me my full Synthesis — weave my astrology, Human Design, and numerology into one coherent reading.";

type Profile = {
  display_name?: string | null;
  sun_sign?: string | null;
  moon_sign?: string | null;
  rising_sign?: string | null;
  human_design_type?: string | null;
  life_path_number?: number | null;
};

const teaserFor = (p: Profile): string => {
  const sun = p.sun_sign ?? "—";
  const hd = p.human_design_type ?? "—";
  const lp = p.life_path_number ?? "—";
  const themes: Record<string, string> = {
    Aries: "decisive momentum",
    Taurus: "grounded persistence",
    Gemini: "agile curiosity",
    Cancer: "emotional intelligence",
    Leo: "radiant leadership",
    Virgo: "precise craftsmanship",
    Libra: "graceful balance",
    Scorpio: "depth and transformation",
    Sagittarius: "expansive vision",
    Capricorn: "long-arc mastery",
    Aquarius: "future-facing originality",
    Pisces: "intuitive empathy",
  };
  const theme = themes[sun] ?? "self-knowledge";
  return `Your ${sun} Sun, ${hd} design, and Life Path ${lp} suggest a powerful theme of ${theme}. Unlock the full reading to go deeper.`;
};

const SynthesisCard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscribed } = usePremium();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [content, setContent] = useState<string>("");
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const COLLAPSE_THRESHOLD = 600;
  const isLong = content.length > COLLAPSE_THRESHOLD;
  const visibleContent = useMemo(() => {
    if (!isLong || expanded) return content;
    // Truncate at a paragraph boundary if possible.
    const slice = content.slice(0, COLLAPSE_THRESHOLD);
    const lastBreak = slice.lastIndexOf("\n\n");
    return (lastBreak > 200 ? slice.slice(0, lastBreak) : slice) + "…";
  }, [content, expanded, isLong]);

  // Load profile + (if premium) cached synthesis
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("display_name, sun_sign, moon_sign, rising_sign, human_design_type, life_path_number")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setProfile(p as Profile);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const generate = useCallback(
    async (forceRefresh = false) => {
      if (!user || !subscribed) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("blueprint-synthesis", {
          body: { section: "synthesis", force_refresh: forceRefresh, tier: "premium" },
        });
        if (error) throw error;
        if (data?.content) {
          setContent(data.content);
          setGeneratedAt(data.generated_at ?? null);
          setSaved(false);
        }
      } catch (e) {
        toast({
          title: "Couldn't generate synthesis",
          description: e instanceof Error ? e.message : "Try again shortly.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [user, subscribed],
  );

  // Auto-fetch cached reading on mount for premium users
  useEffect(() => {
    if (!user || !subscribed) return;
    void generate(false);
  }, [user, subscribed, generate]);

  const saveToInsights = async () => {
    if (!user || !content) return;
    const { error } = await supabase.from("saved_insights").insert({
      user_id: user.id,
      source: "blueprint_synthesis",
      title: `Synthesis · ${new Date().toLocaleDateString()}`,
      content,
    });
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    setSaved(true);
    toast({ title: "Saved to Growth", description: "Find it in your Saved Insights." });
  };

  const askLyra = () => {
    const seed = content
      ? `Here's my full Synthesis reading — go deeper on it with me:\n\n${content.slice(0, 1200)}`
      : SYNTHESIS_SEED_FALLBACK;
    navigate(`/lyra?seed=${encodeURIComponent(seed)}`);
  };

  // ---------- FREE TIER ----------
  if (!subscribed) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/10 via-card/70 to-primary/5 backdrop-blur-md p-6 mb-5"
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-400/90 font-semibold">
            Synthesis · Premium
          </p>
        </div>
        <h2 className="font-display text-xl font-semibold text-foreground mb-3">
          Your Three Sciences, woven into one reading
        </h2>
        <p className="text-sm leading-relaxed text-foreground/90 font-serif italic">
          {profile ? teaserFor(profile) : "Loading your blueprint…"}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate("/premium")}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-background bg-gradient-golden shadow-golden hover:opacity-90 transition-opacity"
          >
            <Crown className="w-3.5 h-3.5" />
            Unlock Full Synthesis
          </button>
          <button
            type="button"
            onClick={askLyra}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/60 px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <Wand2 className="w-3 h-3" />
            Ask Lyra for a preview
          </button>
        </div>
      </motion.section>
    );
  }

  // ---------- PREMIUM TIER ----------
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/70 to-accent/5 backdrop-blur-md p-6 mb-5"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-accent" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-accent/90 font-semibold">
              Synthesis
            </p>
          </div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Your full cross-science reading
          </h2>
        </div>
        <button
          type="button"
          onClick={() => generate(true)}
          disabled={loading}
          className="shrink-0 p-2 rounded-full border border-border/40 bg-card/60 text-muted-foreground hover:text-foreground hover:border-border transition-colors disabled:opacity-50"
          aria-label="Refresh synthesis"
          title="Regenerate"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && !content ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="w-4 h-4 animate-spin" />
          Lyra is reading your full chart…
        </div>
      ) : content ? (
        <>
          <div className="prose prose-sm prose-invert max-w-none font-serif leading-relaxed text-foreground/90 [&_strong]:text-foreground [&_p]:mb-3">
            <ReactMarkdown>{visibleContent}</ReactMarkdown>
          </div>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent/80 transition-colors"
            >
              {expanded ? (
                <>
                  Show less <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  Read more <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          )}
        </>
      ) : (
        <p className="text-sm text-muted-foreground py-4">No reading yet. Tap refresh.</p>
      )}

      {content && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={saveToInsights}
            disabled={saved}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/60 px-3 py-2 text-[11px] text-muted-foreground hover:text-foreground hover:border-border transition-colors disabled:opacity-60"
          >
            <Bookmark className={`w-3 h-3 ${saved ? "fill-current" : ""}`} />
            {saved ? "Saved to Growth" : "Save to Insights"}
          </button>
          <button
            type="button"
            onClick={askLyra}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-2 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
          >
            <Wand2 className="w-3 h-3" />
            Ask Lyra about this
          </button>
          {generatedAt && (
            <span className="text-[10px] text-muted-foreground/70 ml-auto">
              Generated {new Date(generatedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
    </motion.section>
  );
};

export default SynthesisCard;