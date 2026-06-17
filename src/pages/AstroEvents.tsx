import { motion } from "framer-motion";
import { Calendar, Sparkles, AlertTriangle, Moon, Sun } from "lucide-react";
import CosmicBackground from "@/components/CosmicBackground";
import { useAstroEvents, AstroEvent } from "@/hooks/useAstroEvents";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import BackButton from "@/components/BackButton";

const typeColors: Record<string, string> = {
  retrograde: "bg-destructive/15 border-destructive/30 text-destructive",
  eclipse: "bg-purple-500/15 border-purple-500/30 text-purple-400",
  season: "bg-primary/15 border-primary/30 text-primary",
  special: "bg-accent/15 border-accent/30 text-accent",
};

const typeLabels: Record<string, string> = {
  retrograde: "Retrograde",
  eclipse: "Eclipse",
  season: "Season",
  special: "Special",
};

const EventCard = ({ event }: { event: AstroEvent }) => {
  const formatDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const isSingleDay = event.startDate.getTime() === event.endDate.getTime();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-2xl border backdrop-blur-sm ${
        event.active
          ? "bg-primary/10 border-primary/40 shadow-lg shadow-primary/10 ring-1 ring-primary/20"
          : "bg-card/50 border-border/50"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl">{event.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm text-foreground">{event.title}</h3>
            {event.active && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0">NOW</Badge>
            )}
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeColors[event.type]}`}>
              {typeLabels[event.type]}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>
              {isSingleDay ? formatDate(event.startDate) : `${formatDate(event.startDate)} – ${formatDate(event.endDate)}`}
            </span>
          </div>
          {event.active && (
            <div className="mt-2 p-2 rounded-lg bg-accent/10 border border-accent/20">
              <p className="text-xs text-accent flex items-start gap-1.5">
                <Sparkles className="w-3 h-3 mt-0.5 shrink-0" />
                {event.advice}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const AstroEvents = () => {
  const { activeEvents, upcomingEvents, events } = useAstroEvents();
  const pastEvents = events.filter(e => !e.active && e.endDate < new Date()).sort((a, b) => b.endDate.getTime() - a.endDate.getTime()).slice(0, 3);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div data-back-button-injected className="absolute top-[calc(env(safe-area-inset-top,0px)+4rem)] left-2 z-40">
        <BackButton fallback="/" />
      </div>
      <CosmicBackground />
      <div className="relative z-10 max-w-lg mx-auto px-4 pt-8">
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/20 border border-purple-500/40 mb-3"
          >
            <Moon className="w-8 h-8 text-purple-400" />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground">Cosmic Calendar</h1>
          <p className="text-muted-foreground text-sm mt-1">Astrological events affecting your love life</p>
        </div>

        {activeEvents.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Sun className="w-4 h-4 text-accent" /> Happening Now
            </h2>
            <div className="space-y-3 mb-6">
              {activeEvents.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          </>
        )}

        {upcomingEvents.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Coming Up
            </h2>
            <div className="space-y-3 mb-6">
              {upcomingEvents.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          </>
        )}

        {pastEvents.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-foreground mb-3 text-muted-foreground">Recently Passed</h2>
            <div className="space-y-3 opacity-60">
              {pastEvents.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AstroEvents;
