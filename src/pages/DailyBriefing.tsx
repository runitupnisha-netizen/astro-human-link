import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Sun, Compass, Clock, Sparkles, BookOpen, CloudMoon, Loader2, RefreshCw, Save, Check, Share2, Download, Crown, Lock, WifiOff, CloudOff, CloudUpload } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useDailyBriefing } from "@/hooks/useDailyBriefing";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toPng } from "html-to-image";
import { ReflectionsTimeline } from "@/components/ReflectionsTimeline";
import { useOfflineReflections } from "@/hooks/useOfflineReflections";

// Decode a `data:` URL to a Blob without going through `fetch()`. Works
// fully offline and avoids any service-worker interception path.
const dataUrlToBlob = (dataUrl: string): Blob => {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = /data:([^;]+);base64/.exec(header);
  const mime = mimeMatch?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};

// Reflections-per-day limit by tier
const TIER_ACCESS = {
  free:    { label: "Free",     reflectionsPerDay: 0,        accessLabel: "Read-only briefing" },
  weekly:  { label: "Weekly",   reflectionsPerDay: 1,        accessLabel: "1 reflection / day" },
  monthly: { label: "Monthly",  reflectionsPerDay: 3,        accessLabel: "3 reflections / day" },
  vip:     { label: "VIP",      reflectionsPerDay: Infinity, accessLabel: "Unlimited reflections" },
  yearly:  { label: "Yearly",   reflectionsPerDay: Infinity, accessLabel: "Unlimited reflections" },
} as const;

const DailyBriefing = () => {
  const { briefing, loading, error, refresh, isOffline, cachedAt, refreshQueued } = useDailyBriefing();
  const { user } = useAuth();
  const { subscribed, currentTier } = usePremium();
  const { toast } = useToast();
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [reflectionsToday, setReflectionsToday] = useState(0);
  const [timelineRefresh, setTimelineRefresh] = useState(0);
  const shareCardRef = useRef<HTMLDivElement>(null);

  // Toast on connection transitions during this page's session.
  // We listen to the browser's own online/offline events so the toast
  // fires for the actual transition (not just because the page mounted
  // while already offline).
  useEffect(() => {
    const handleOnline = () => {
      toast({
        title: "Back online ✨",
        description: "Refreshing your cosmic briefing…",
      });
    };
    const handleOffline = () => {
      toast({
        title: "You're offline",
        description: "We'll keep showing your saved briefing and sync when you reconnect.",
        variant: "destructive",
      });
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [toast]);

  const handleQueueSynced = () => {
    // Refresh count + timeline once any pending offline reflections sync.
    setSaved(true);
    setTimelineRefresh((n) => n + 1);
    setTimeout(() => setSaved(false), 2500);
  };
  const { queue: offlineQueue, syncing: queueSyncing, progress: queueProgress, enqueue, flush } =
    useOfflineReflections(handleQueueSynced);

  const tierKey: keyof typeof TIER_ACCESS = subscribed && currentTier ? currentTier : "free";
  const tierAccess = TIER_ACCESS[tierKey];
  const limit = tierAccess.reflectionsPerDay;
  const limitReached = reflectionsToday >= limit;
  const limitDisplay = limit === Infinity ? "∞" : limit;

  // Count today's reflections to show usage
  useEffect(() => {
    if (!user || !briefing) return;
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("briefing_reflections")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("briefing_id", briefing.id);
      if (!cancelled) setReflectionsToday(count ?? 0);
    })();
    return () => { cancelled = true; };
  }, [user, briefing, saved]);

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const handleShare = async () => {
    if (!shareCardRef.current || !briefing) return;
    setSharing(true);
    try {
      // Offline-safe rendering:
      // - `cacheBust: true` would force `cache: 'no-cache'` fetches for any
      //   referenced sub-resources, which fails when offline. Leave it off so
      //   the browser/service worker cache can satisfy requests.
      // - We decode the data URL to a Blob synchronously instead of going
      //   through `fetch(dataUrl)`, which avoids any SW interception path.
      const dataUrl = await toPng(shareCardRef.current, {
        pixelRatio: 2,
        backgroundColor: "#0b0a1a",
      });
      const blob = dataUrlToBlob(dataUrl);
      const file = new File([blob], `stellara-briefing-${briefing.briefing_date}.png`, {
        type: "image/png",
      });

      const navAny = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (navAny.canShare && navAny.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "My Cosmic Briefing — Stellara",
          text: `Today's energy: ${briefing.energy_theme} ✨`,
        });
      } else {
        const link = document.createElement("a");
        link.download = `stellara-briefing-${briefing.briefing_date}.png`;
        link.href = dataUrl;
        link.click();
        toast({
          title: "Card downloaded ✨",
          description: isOffline
            ? "Saved offline — share it anywhere from your camera roll."
            : "Share it anywhere from your camera roll.",
        });
      }
    } catch (err) {
      console.error("[share]", err);
      toast({
        title: "Could not generate card",
        description: isOffline
          ? "Some images couldn't load offline. Try again once you're back online."
          : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSharing(false);
    }
  };

  const saveReflection = async () => {
    if (!briefing || !user || !reflection.trim()) return;
    if (limitReached) {
      toast({
        title: "Daily reflection limit reached",
        description: limit === 0
          ? "Subscribe to save private reflections."
          : `Your ${tierAccess.label} plan includes ${limit} reflection${limit === 1 ? "" : "s"} per day. Upgrade for unlimited.`,
        variant: "destructive",
      });
      return;
    }
    const text = reflection.trim();
    // Stable idempotency key for this attempt — reused if we fall back to
    // the offline queue so retries collapse onto the same server row.
    const clientKey =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Offline path: queue locally, surface confirmation, exit early.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      enqueue({
        briefing_id: briefing.id,
        briefing_date: briefing.briefing_date,
        reflection: text,
        client_key: clientKey,
      });
      setReflection("");
      setSaved(true);
      toast({
        title: "Saved offline ✨",
        description: "We'll sync this to your journal when you're back online.",
      });
      setTimeout(() => setSaved(false), 2500);
      return;
    }

    setSaving(true);
    try {
      const { error: insErr } = await supabase
        .from("briefing_reflections")
        .insert({
          user_id: user.id,
          briefing_id: briefing.id,
          reflection: text,
          client_key: clientKey,
        });
      // Treat unique-violation as success — the row is already saved
      // (e.g. request succeeded server-side before the network dropped
      // and was retried).
      if (insErr && (insErr as { code?: string }).code !== "23505") throw insErr;
      setSaved(true);
      setReflection("");
      setTimelineRefresh((n) => n + 1);
      toast({ title: "Saved ✨", description: "Your reflection is in your private journal." });
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      // Network or server failure → queue and tell the user we'll retry.
      enqueue({
        briefing_id: briefing.id,
        briefing_date: briefing.briefing_date,
        reflection: text,
        client_key: clientKey,
      });
      setReflection("");
      setSaved(true);
      toast({
        title: "Saved offline ✨",
        description: "Connection hiccup — we'll sync this once you're back online.",
      });
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 md:pt-24 pb-24 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.header
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center gap-2 mb-2 text-accent">
            <Sun className="w-5 h-5" />
            <span className="text-xs uppercase tracking-widest font-body">Daily Cosmic Briefing</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">{today}</h1>
          <p className="text-muted-foreground text-sm mt-1 font-body">
            Your personalised energy reading, tuned to your chart.
          </p>
        </motion.header>

        {/* Offline indicator */}
        {isOffline && briefing && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <Card className="border-amber-400/30 bg-amber-400/5">
              <CardContent className="p-3 flex items-center gap-2 text-xs font-body">
                <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-foreground">
                  You're offline — showing your saved briefing
                  {cachedAt && (
                    <> from{" "}
                      {new Date(cachedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </>
                  )}
                  .
                  {refreshQueued && (
                    <> We'll refresh it automatically once you're back online.</>
                  )}
                </span>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Pending offline reflections */}
        {offlineQueue.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-3 flex flex-col gap-2 text-xs font-body">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {queueSyncing ? (
                      <Loader2 className="w-4 h-4 text-primary shrink-0 animate-spin" />
                    ) : (
                      <CloudOff className="w-4 h-4 text-primary shrink-0" />
                    )}
                    <span className="text-foreground truncate">
                      {queueSyncing
                        ? `Syncing ${offlineQueue.length} reflection${offlineQueue.length === 1 ? "" : "s"}…`
                        : `${offlineQueue.length} reflection${offlineQueue.length === 1 ? "" : "s"} waiting to sync`}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-primary hover:bg-primary/10"
                    disabled={queueSyncing || isOffline}
                    onClick={() => flush()}
                  >
                    <CloudUpload className="w-3.5 h-3.5 mr-1" /> Sync now
                  </Button>
                </div>
                {/* Progress indicator during sync */}
                {queueSyncing && queueProgress && (
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={(queueProgress.current / queueProgress.total) * 100} 
                      className="h-1.5 flex-1"
                    />
                    <span className="text-muted-foreground shrink-0">
                      {queueProgress.current}/{queueProgress.total}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tier access banner */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <Card className={`border ${tierKey === "free" ? "border-border/60 bg-card/60" : "border-amber-400/30 bg-gradient-to-r from-amber-500/5 via-card to-accent/5"}`}>
            <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${tierKey === "free" ? "bg-muted" : "bg-amber-400/15"}`}>
                  {tierKey === "free" ? (
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Crown className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-body">
                    Your access
                  </p>
                  <p className="text-sm text-foreground font-body truncate">
                    <span className={tierKey === "free" ? "" : "text-amber-400 font-semibold"}>
                      {tierAccess.label}
                    </span>
                    <span className="text-muted-foreground"> · {tierAccess.accessLabel}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {limit !== 0 && (
                  <span className="text-xs text-muted-foreground font-body whitespace-nowrap">
                    Today: <span className="text-foreground font-semibold">{reflectionsToday}</span>/{limitDisplay}
                  </span>
                )}
                {tierKey !== "vip" && tierKey !== "yearly" && (
                  <Button asChild size="sm" variant="outline" className="border-amber-400/40 text-amber-400 hover:bg-amber-400/10">
                    <Link to="/premium">{tierKey === "free" ? "Upgrade" : "Upgrade"}</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {loading && (
          <div className="flex flex-col items-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-muted-foreground text-sm font-body">Reading the stars for you…</p>
          </div>
        )}

        {error && !loading && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-6 text-center">
              <p className="text-foreground text-sm mb-3">{error}</p>
              <Button onClick={refresh} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" /> Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {briefing && !loading && (
          <>
            {/* Hero theme */}
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="overflow-hidden border-accent/30 bg-gradient-to-br from-card via-card to-accent/10 mb-4">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-accent mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider font-body">Today's Theme</span>
                  </div>
                  <h2 className="font-display text-2xl text-foreground mb-3">
                    {briefing.energy_theme}
                  </h2>
                  {briefing.cosmic_weather && (
                    <p className="text-muted-foreground text-sm font-body leading-relaxed flex gap-2">
                      <CloudMoon className="w-4 h-4 mt-0.5 shrink-0 text-accent" />
                      <span>{briefing.cosmic_weather}</span>
                    </p>
                  )}
                  <div className="flex gap-2 mt-5">
                    <Button
                      onClick={handleShare}
                      disabled={sharing}
                      size="sm"
                      variant="outline"
                      className="border-accent/40 text-accent hover:bg-accent/10"
                    >
                      {sharing ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating card…</>
                      ) : (
                        <><Share2 className="w-4 h-4 mr-2" /> Share today</>
                      )}
                    </Button>
                    <Button
                      onClick={refresh}
                      size="sm"
                      variant="ghost"
                      className="text-muted-foreground"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Mood + Focus grid */}
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
                <Card className="h-full border-border/50 bg-card/80">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <Sun className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wider font-body">Mood</span>
                    </div>
                    <p className="text-foreground text-sm font-body leading-relaxed">{briefing.mood}</p>
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                <Card className="h-full border-border/50 bg-card/80">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <Compass className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wider font-body">Focus</span>
                    </div>
                    <p className="text-foreground text-sm font-body leading-relaxed">{briefing.focus}</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Lucky window + Affirmation */}
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              {briefing.lucky_window && (
                <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
                  <Card className="h-full border-accent/30 bg-accent/5">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 text-accent mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wider font-body">Lucky Window</span>
                      </div>
                      <p className="text-foreground font-display text-lg">{briefing.lucky_window}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
              {briefing.affirmation && (
                <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                  <Card className="h-full border-primary/30 bg-primary/5">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 text-primary mb-2">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs uppercase tracking-wider font-body">Affirmation</span>
                      </div>
                      <p className="text-foreground text-sm font-body italic leading-relaxed">
                        "{briefing.affirmation}"
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Journal prompt */}
            <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
              <Card className="border-border/50 bg-card/80 mb-4">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-primary mb-3">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider font-body">Reflection Prompt</span>
                  </div>
                  <p className="text-foreground font-body leading-relaxed mb-4">
                    {briefing.journal_prompt}
                  </p>
                  <Textarea
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="Write what comes up… (private, only you can see it)"
                    className="min-h-[120px] bg-background/60"
                    maxLength={2000}
                  />
                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs text-muted-foreground font-body">
                      {reflection.length}/2000
                      {limit !== Infinity && limit > 0 && (
                        <> · {reflectionsToday}/{limitDisplay} today</>
                      )}
                    </span>
                    <Button
                      onClick={saveReflection}
                      disabled={!reflection.trim() || saving || limitReached}
                      size="sm"
                      className="min-h-[40px]"
                    >
                      {saving ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving</>
                      ) : saved ? (
                        <><Check className="w-4 h-4 mr-2" /> Saved</>
                      ) : limitReached ? (
                        <><Lock className="w-4 h-4 mr-2" /> Limit reached</>
                      ) : (
                        <><Save className="w-4 h-4 mr-2" /> Save reflection</>
                      )}
                    </Button>
                  </div>
                  {limitReached && (
                    <p className="text-xs text-amber-400 mt-2 font-body">
                      {limit === 0
                        ? "Subscribe to save private reflections to your journal."
                        : `You've used today's ${limit} reflection${limit === 1 ? "" : "s"}. Upgrade for unlimited.`}
                      {" "}
                      <Link to="/premium" className="underline">View plans</Link>
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Private reflections timeline */}
            <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
              <ReflectionsTimeline refreshKey={timelineRefresh} locked={tierKey === "free"} />
            </motion.div>

            <p className="text-center text-xs text-muted-foreground font-body mt-6">
              ✨ A new briefing arrives each morning. Available on every Stellara plan.
            </p>

            {/* Off-screen share card (rendered at fixed dimensions for clean export) */}
            <div
              aria-hidden="true"
              style={{
                position: "fixed",
                top: 0,
                left: -10000,
                pointerEvents: "none",
              }}
            >
              <div
                ref={shareCardRef}
                style={{
                  width: 1080,
                  height: 1350,
                  background:
                    "radial-gradient(at 20% 10%, #1e1b4b 0%, transparent 60%), radial-gradient(at 80% 90%, #4c1d95 0%, transparent 55%), linear-gradient(160deg, #0b0a1a 0%, #1a0f2e 100%)",
                  color: "#f5f0ff",
                  padding: 80,
                  display: "flex",
                  flexDirection: "column",
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Decorative stars */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage:
                      "radial-gradient(1.5px 1.5px at 12% 18%, rgba(255,255,255,0.6), transparent), radial-gradient(1px 1px at 78% 22%, rgba(255,215,128,0.7), transparent), radial-gradient(2px 2px at 30% 78%, rgba(255,255,255,0.4), transparent), radial-gradient(1px 1px at 88% 65%, rgba(255,255,255,0.5), transparent), radial-gradient(1.5px 1.5px at 55% 40%, rgba(255,215,128,0.5), transparent)",
                  }}
                />

                <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                        boxShadow: "0 0 20px rgba(251,191,36,0.6)",
                      }}
                    />
                    <span
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 18,
                        letterSpacing: "0.4em",
                        textTransform: "uppercase",
                        color: "#fbbf24",
                        fontWeight: 500,
                      }}
                    >
                      Stellara · Daily Briefing
                    </span>
                  </div>

                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 22,
                      color: "rgba(245,240,255,0.7)",
                      marginBottom: 24,
                    }}
                  >
                    {today}
                  </div>

                  {/* Energy theme */}
                  <div style={{ marginBottom: 56 }}>
                    <div
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 16,
                        letterSpacing: "0.3em",
                        textTransform: "uppercase",
                        color: "#fbbf24",
                        marginBottom: 16,
                      }}
                    >
                      Today's Energy
                    </div>
                    <div
                      style={{
                        fontSize: 78,
                        lineHeight: 1.05,
                        fontWeight: 500,
                        color: "#f5f0ff",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {briefing.energy_theme}
                    </div>
                  </div>

                  {/* Mood + Focus */}
                  <div style={{ display: "flex", gap: 24, marginBottom: 48 }}>
                    <div
                      style={{
                        flex: 1,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(251,191,36,0.2)",
                        borderRadius: 24,
                        padding: 32,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 13,
                          letterSpacing: "0.3em",
                          textTransform: "uppercase",
                          color: "#fbbf24",
                          marginBottom: 12,
                        }}
                      >
                        Mood
                      </div>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, lineHeight: 1.4, color: "#f5f0ff" }}>
                        {briefing.mood}
                      </div>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(251,191,36,0.2)",
                        borderRadius: 24,
                        padding: 32,
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 13,
                          letterSpacing: "0.3em",
                          textTransform: "uppercase",
                          color: "#fbbf24",
                          marginBottom: 12,
                        }}
                      >
                        Focus
                      </div>
                      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, lineHeight: 1.4, color: "#f5f0ff" }}>
                        {briefing.focus}
                      </div>
                    </div>
                  </div>

                  {/* Affirmation */}
                  {briefing.affirmation && (
                    <div
                      style={{
                        fontStyle: "italic",
                        fontSize: 36,
                        lineHeight: 1.4,
                        color: "rgba(245,240,255,0.92)",
                        borderLeft: "3px solid #fbbf24",
                        paddingLeft: 28,
                      }}
                    >
                      "{briefing.affirmation}"
                    </div>
                  )}

                  <div style={{ flex: 1 }} />

                  {/* Footer */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTop: "1px solid rgba(251,191,36,0.2)",
                      paddingTop: 28,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    <div style={{ fontSize: 18, color: "rgba(245,240,255,0.6)" }}>
                      Where love aligns with the stars
                    </div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 600,
                        letterSpacing: "0.2em",
                        color: "#fbbf24",
                      }}
                    >
                      ✦ STELLARA
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DailyBriefing;