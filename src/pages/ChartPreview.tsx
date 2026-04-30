import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Share2, Sparkles, Eye, ArrowLeft, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SynastryChart from "@/components/SynastryChart";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Signs = { sun: string | null; moon: string | null; rising: string | null };

const SAMPLE_PARTNER: Signs = { sun: "Leo", moon: "Pisces", rising: "Libra" };
const SAMPLE_PARTNER_NAME = "Sample Partner";

const FALLBACK_SELF: Signs = { sun: "Gemini", moon: "Scorpio", rising: "Aquarius" };

const ChartPreview = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mySigns, setMySigns] = useState<Signs>(FALLBACK_SELF);
  const [displayName, setDisplayName] = useState<string>("You");
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) {
        setUsingFallback(true);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("display_name, sun_sign, moon_sign, rising_sign")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (data && (data.sun_sign || data.moon_sign || data.rising_sign)) {
        setMySigns({
          sun: data.sun_sign ?? null,
          moon: data.moon_sign ?? null,
          rising: data.rising_sign ?? null,
        });
        setDisplayName(data.display_name || "You");
      } else {
        setUsingFallback(true);
      }
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [user]);

  const handleShare = async () => {
    const shareText = `My Stellara birth chart ✦\n☉ ${mySigns.sun ?? "?"} · ☽ ${mySigns.moon ?? "?"} · ↗ ${mySigns.rising ?? "?"}\n\nSee yours at`;
    const shareUrl = `${window.location.origin}/chart-preview`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "My Stellara Chart", text: shareText, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        toast.success("Link copied to clipboard");
      }
    } catch (err) {
      // user-cancelled share is not an error
      if ((err as Error)?.name !== "AbortError") {
        toast.error("Couldn't share — try copying instead");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-24 px-4 md:pt-28">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/profile">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Link>
          </Button>
          <Button
            size="sm"
            onClick={handleShare}
            className="bg-amber-400/20 border border-amber-400/40 text-amber-300 hover:bg-amber-400/30"
          >
            <Share2 className="w-4 h-4 mr-2" /> Share
          </Button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-400/10 border border-amber-400/30 mb-3">
            <Sparkles className="w-6 h-6 text-amber-400" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Your Chart Preview</h1>
          <p className="text-sm text-muted-foreground">
            A quick look at your placements and a sample synastry overlay.
          </p>
        </motion.div>

        {/* Solo chart card */}
        <Card className="p-6 mb-5 border-border/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">{displayName}'s Birth Chart</h2>
            {usingFallback && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                Sample
              </span>
            )}
          </div>
          {loading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : (
            <>
              <div className="flex justify-center py-2">
                <SynastryChart
                  mySigns={mySigns}
                  theirSigns={{ sun: null, moon: null, rising: null }}
                  score={100}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center text-sm">
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <div className="text-xs text-muted-foreground">Sun ☉</div>
                  <div className="font-medium text-foreground">{mySigns.sun ?? "—"}</div>
                </div>
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <div className="text-xs text-muted-foreground">Moon ☽</div>
                  <div className="font-medium text-foreground">{mySigns.moon ?? "—"}</div>
                </div>
                <div className="rounded-lg bg-muted/40 px-3 py-2">
                  <div className="text-xs text-muted-foreground">Rising ↗</div>
                  <div className="font-medium text-foreground">{mySigns.rising ?? "—"}</div>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Synastry sample card */}
        <Card className="p-6 mb-5 border-amber-400/20">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Synastry · {displayName} × {SAMPLE_PARTNER_NAME}</h2>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/30">
              Demo overlay
            </span>
          </div>
          {loading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : (
            <>
              <div className="flex justify-center py-2">
                <SynastryChart mySigns={mySigns} theirSigns={SAMPLE_PARTNER} score={82} />
              </div>
              <div className="text-center text-xs text-muted-foreground space-y-1 mt-3">
                <p>
                  <span className="text-accent">You:</span> ☉ {mySigns.sun ?? "?"} · ☽ {mySigns.moon ?? "?"} · ↗ {mySigns.rising ?? "?"}
                </p>
                <p>
                  <span className="text-primary">Them:</span> ☉ {SAMPLE_PARTNER.sun} · ☽ {SAMPLE_PARTNER.moon} · ↗ {SAMPLE_PARTNER.rising}
                </p>
              </div>
            </>
          )}
        </Card>

        {/* Render-validation checklist */}
        <Card className="p-5 border-border/50 bg-muted/20">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-sm text-foreground">Render checklist</h3>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              Zodiac wheel shows all 12 signs around the circumference
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              Your three placements (Sun, Moon, Rising) are plotted as accent dots
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              Synastry overlay shows the partner's points in a second color
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              Compatibility score badge renders inside the wheel center
            </li>
          </ul>
        </Card>

        {usingFallback && (
          <p className="text-center text-xs text-muted-foreground/70 mt-6">
            You're viewing sample placements. Complete onboarding to see your real chart.
          </p>
        )}
      </div>
    </div>
  );
};

export default ChartPreview;