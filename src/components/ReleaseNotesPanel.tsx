import { useEffect, useState } from "react";
import { Sparkles, Wrench, Plus, Zap, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RELEASE_NOTES, type ReleaseNoteEntry } from "@/data/releaseNotes";

const STORAGE_KEY = "stellara:last-seen-release";

const typeStyles: Record<ReleaseNoteEntry["changes"][number]["type"], { label: string; icon: typeof Wrench; className: string }> = {
  fixed:    { label: "Fixed",    icon: Wrench, className: "bg-primary/10 text-primary border-primary/30" },
  added:    { label: "Added",    icon: Plus,   className: "bg-accent/10 text-accent border-accent/30" },
  improved: { label: "Improved", icon: Zap,    className: "bg-secondary/40 text-foreground border-border" },
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
};

const formatBuildTime = () => {
  try {
    const d = new Date(__BUILD_TIME__);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "—";
  }
};

const ReleaseNotesPanel = () => {
  const [open, setOpen] = useState(false);
  const [hasUnseen, setHasUnseen] = useState(false);
  const latest = RELEASE_NOTES[0];

  useEffect(() => {
    if (!latest) return;
    try {
      const lastSeen = localStorage.getItem(STORAGE_KEY);
      setHasUnseen(lastSeen !== latest.version);
    } catch {
      setHasUnseen(true);
    }
  }, [latest]);

  const markSeen = () => {
    if (!latest) return;
    try {
      localStorage.setItem(STORAGE_KEY, latest.version);
    } catch {/* ignore */}
    setHasUnseen(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) markSeen();
  };

  if (!latest) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Open release notes"
        onClick={() => handleOpenChange(true)}
        className="fixed bottom-24 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-lg backdrop-blur-md transition-all hover:scale-105 hover:border-primary/40 hover:shadow-xl md:bottom-6"
      >
        <Sparkles className="h-5 w-5 text-primary" />
        {hasUnseen && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-accent border border-card" />
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="flex items-center gap-2 font-display text-xl">
              <Sparkles className="h-5 w-5 text-primary" />
              What's New
            </DialogTitle>
            <DialogDescription>
              Latest build deployed{" "}
              <span className="font-semibold text-foreground">{formatBuildTime()}</span>
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] px-6 pb-6">
            <div className="space-y-6 pt-2">
              {RELEASE_NOTES.map((release, idx) => (
                <section key={release.version} className="relative">
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <h3 className="font-display text-base font-semibold">
                        {release.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        v{release.version} · {formatDate(release.date)}
                      </p>
                    </div>
                    {idx === 0 && (
                      <Badge variant="outline" className="border-accent/40 text-accent text-[10px] uppercase tracking-wider">
                        Latest
                      </Badge>
                    )}
                  </div>

                  <ul className="mt-3 space-y-2">
                    {release.changes.map((change, i) => {
                      const meta = typeStyles[change.type];
                      const Icon = meta.icon;
                      return (
                        <li key={i} className="flex items-start gap-2.5 text-sm">
                          <span className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.className}`}>
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </span>
                          <span className="text-foreground/90 leading-relaxed">{change.text}</span>
                        </li>
                      );
                    })}
                  </ul>

                  {idx < RELEASE_NOTES.length - 1 && (
                    <div className="mt-6 border-t border-border/60" />
                  )}
                </section>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ReleaseNotesPanel;