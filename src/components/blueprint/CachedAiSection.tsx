import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { RefreshCw, Bookmark, Wand2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

/**
 * Renders a premium-only AI-generated Blueprint section.
 * - Loads cached content from `blueprint_ai_cache` via the
 *   `blueprint-synthesis` edge function (which serves cache when fresh).
 * - Refresh button regenerates and re-caches.
 * - "Save to Insights" persists to `saved_insights` (Growth tab).
 * - "Ask Lyra about this" deep-links into the chat with the reading as seed.
 */
interface Props {
  /** Section key recognized by the edge function (e.g. "planets", "houses"). */
  section: string;
  /** Title used for the Save-to-Insights record. */
  title: string;
  /** Lyra seed prefix; the reading itself will be appended. */
  lyraSeedFallback?: string;
}

const CachedAiSection = ({ section, title, lyraSeedFallback }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const generate = useCallback(
    async (force = false) => {
      if (!user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("blueprint-synthesis", {
          body: { section, force_refresh: force, tier: "premium" },
        });
        if (error) throw error;
        if (data?.content) {
          setContent(data.content);
          setGeneratedAt(data.generated_at ?? null);
          setSaved(false);
        }
      } catch (e) {
        toast({
          title: "Lyra couldn't read that section",
          description: e instanceof Error ? e.message : "Try again shortly.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [user, section],
  );

  useEffect(() => {
    void generate(false);
  }, [generate]);

  const save = async () => {
    if (!user || !content) return;
    const { error } = await supabase.from("saved_insights").insert({
      user_id: user.id,
      source: `blueprint_${section}`,
      title,
      content,
    });
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    setSaved(true);
    toast({ title: "Saved to Growth" });
  };

  const askLyra = () => {
    const seed = content
      ? `Let's go deeper on my ${title} reading:\n\n${content.slice(0, 1200)}`
      : (lyraSeedFallback ?? `Tell me more about my ${title}.`);
    navigate(`/lyra?seed=${encodeURIComponent(seed)}`);
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-md p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        <button
          type="button"
          onClick={() => generate(true)}
          disabled={loading}
          className="p-1.5 rounded-full border border-border/40 text-muted-foreground hover:text-foreground hover:border-border transition-colors disabled:opacity-50"
          aria-label="Regenerate reading"
          title="Regenerate"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && !content ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Lyra is reading…
        </div>
      ) : content ? (
        <div className="prose prose-sm prose-invert max-w-none font-serif leading-relaxed text-foreground/90 [&_strong]:text-foreground [&_p]:mb-2">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground py-2">Tap refresh to generate.</p>
      )}

      {content && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saved}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/60 px-2.5 py-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:border-border transition-colors disabled:opacity-60"
          >
            <Bookmark className={`w-3 h-3 ${saved ? "fill-current" : ""}`} />
            {saved ? "Saved" : "Save to Insights"}
          </button>
          <button
            type="button"
            onClick={askLyra}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-[10px] font-medium text-primary hover:bg-primary/20 transition-colors"
          >
            <Wand2 className="w-3 h-3" />
            Ask Lyra about this
          </button>
          {generatedAt && (
            <span className="text-[10px] text-muted-foreground/60 ml-auto">
              {new Date(generatedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default CachedAiSection;