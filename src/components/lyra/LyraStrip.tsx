import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface LyraStripProps {
  /** Surface this insight is for — e.g. "discover_card", "compatibility", "my_cosmos", "moon_cycle", "match_profile", "ritual_planet" */
  context: string;
  /** Stable key for the entity this insight is about (e.g. match user_id, your own user_id). Re-fetches when this changes. */
  contextKey?: string;
  /** Optional structured payload sent to the AI for richer prompting */
  payload?: Record<string, unknown>;
  /** Static fallback shown immediately while AI loads (and if the call fails it stays). */
  fallback?: string;
  /** Visual size — `sm` is single-line cosmic guidance, `md` is the morning greeting style. */
  size?: "sm" | "md";
  className?: string;
}

/**
 * LyraStrip — one-line AI insight that fades in once ready.
 * - Per spec: one AI call per mount, no caching, never blocks the screen.
 * - If the call fails, only the fallback renders (or nothing).
 * - Always one sentence. Truncates at the first period if the model overshoots.
 */
const LyraStrip = ({ context, contextKey, payload, fallback, size = "sm", className = "" }: LyraStripProps) => {
  const [text, setText] = useState<string | null>(fallback ?? null);
  const [loaded, setLoaded] = useState(!!fallback);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("lyra-insight", {
          body: { context, payload: payload ?? null },
        });
        if (cancelled) return;
        if (error || !data?.insight) {
          // Silent failure — keep fallback if any, otherwise hide
          return;
        }
        // Truncate at first period for safety
        const raw = String(data.insight).trim();
        const cleaned = raw.split(/(?<=[.!?])\s/)[0] || raw;
        setText(cleaned);
        setLoaded(true);
      } catch {
        // Network/edge errors — silent
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, contextKey]);

  if (!text) return null;

  const isLong = text.length > 200;

  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: loaded ? 1 : 0.6 }}
      transition={{ duration: 0.6 }}
      className={`flex items-start gap-1.5 leading-snug ${size === "md" ? "text-sm" : "text-[12px]"} ${className}`}
      style={{ color: "#d0b4f7", fontFamily: "Poppins, sans-serif", fontWeight: 300 }}
    >
      <Sparkles className="w-3 h-3 shrink-0 mt-[2px] opacity-80" />
      <span>
        <span className="opacity-80">Lyra: </span>
        {isLong ? <LyraInline text={text} /> : text}
      </span>
    </motion.p>
  );
};

/** Inline expand/collapse for long Lyra messages so they don't truncate mid-sentence. */
const LyraInline = ({ text }: { text: string }) => {
  const [expanded, setExpanded] = useState(false);
  const cut = text.lastIndexOf(" ", 180);
  const preview = expanded ? text : `${text.slice(0, cut > 0 ? cut : 180).trimEnd()}…`;
  return (
    <>
      {preview}{" "}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="underline underline-offset-2 opacity-90 hover:opacity-100"
        aria-expanded={expanded}
      >
        {expanded ? "Show less" : "Read more"}
      </button>
    </>
  );
};

export default LyraStrip;