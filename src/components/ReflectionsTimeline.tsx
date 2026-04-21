import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Calendar, Trash2, Loader2, Lock, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TimelineEntry {
  id: string;
  reflection: string;
  created_at: string;
  briefing_id: string;
  briefing_date: string | null;
  energy_theme: string | null;
}

interface Props {
  /** When this changes, refetch (e.g., after a new save). */
  refreshKey?: number;
  /** If true, hide entries behind an upgrade CTA. */
  locked?: boolean;
}

const PAGE_SIZE = 5;

const formatDate = (iso: string | null) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const ReflectionsTimeline = ({ refreshKey = 0, locked = false }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPage = async (pageNum: number, replace: boolean) => {
    if (!user) return;
    setLoading(true);
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE; // fetch one extra to detect "more"
    const { data, error } = await supabase
      .from("briefing_reflections")
      .select("id, reflection, created_at, briefing_id, daily_briefings!inner(briefing_date, energy_theme)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    setLoading(false);
    if (error) {
      console.error("[ReflectionsTimeline]", error);
      toast({ title: "Couldn't load reflections", variant: "destructive" });
      return;
    }

    const rows = (data ?? []).map((r: any): TimelineEntry => ({
      id: r.id,
      reflection: r.reflection,
      created_at: r.created_at,
      briefing_id: r.briefing_id,
      briefing_date: r.daily_briefings?.briefing_date ?? null,
      energy_theme: r.daily_briefings?.energy_theme ?? null,
    }));

    setHasMore(rows.length > PAGE_SIZE);
    const trimmed = rows.slice(0, PAGE_SIZE);
    setEntries((prev) => (replace ? trimmed : [...prev, ...trimmed]));
  };

  useEffect(() => {
    if (locked) {
      setLoading(false);
      return;
    }
    setPage(0);
    fetchPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, refreshKey, locked]);

  const loadMore = async () => {
    const next = page + 1;
    setPage(next);
    await fetchPage(next, false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this private reflection? This cannot be undone.")) return;
    setDeletingId(id);
    const { error } = await supabase.from("briefing_reflections").delete().eq("id", id);
    setDeletingId(null);
    if (error) {
      toast({ title: "Couldn't delete", variant: "destructive" });
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
    toast({ title: "Reflection removed" });
  };

  return (
    <Card className="border-border/50 bg-card/80 mb-4">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-primary">
            <BookOpen className="w-4 h-4" />
            <span className="text-xs uppercase tracking-wider font-body">My Reflections</span>
          </div>
          {!locked && entries.length > 0 && (
            <span className="text-xs text-muted-foreground font-body">
              {entries.length}{hasMore ? "+" : ""} entr{entries.length === 1 ? "y" : "ies"}
            </span>
          )}
        </div>

        {locked ? (
          <div className="text-center py-8">
            <Lock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-foreground font-body mb-1">
              Your private journal is a Stellara members feature.
            </p>
            <p className="text-xs text-muted-foreground font-body mb-4">
              Subscribe to save reflections and revisit them anytime.
            </p>
            <Button asChild size="sm" variant="outline" className="border-amber-400/40 text-amber-400 hover:bg-amber-400/10">
              <Link to="/premium">View plans</Link>
            </Button>
          </div>
        ) : loading && entries.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground font-body">
              No reflections yet. Your first private entry will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {entries.map((entry, idx) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: idx * 0.03 }}
                    className="relative pl-5 border-l-2 border-accent/30"
                  >
                    <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-accent shadow-[0_0_8px_hsl(var(--accent))]" />
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
                        <Calendar className="w-3 h-3 shrink-0" />
                        <span>{formatDate(entry.briefing_date ?? entry.created_at)}</span>
                      </div>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        aria-label="Delete reflection"
                        className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50 p-1 -m-1"
                      >
                        {deletingId === entry.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    {entry.energy_theme && (
                      <p className="text-xs text-accent font-body italic mb-2 line-clamp-1">
                        on “{entry.energy_theme}”
                      </p>
                    )}
                    <p className="text-sm text-foreground font-body leading-relaxed whitespace-pre-wrap">
                      {entry.reflection}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {hasMore && (
              <div className="mt-4 text-center">
                <Button
                  onClick={loadMore}
                  disabled={loading}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…</>
                  ) : (
                    <><ChevronDown className="w-4 h-4 mr-2" /> Load older</>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ReflectionsTimeline;