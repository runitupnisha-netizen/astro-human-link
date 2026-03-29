import { useMemo } from "react";

export interface AstroEvent {
  id: string;
  title: string;
  description: string;
  icon: string;
  startDate: Date;
  endDate: Date;
  type: "retrograde" | "eclipse" | "season" | "special";
  advice: string;
  active: boolean;
}

const ASTRO_EVENTS_2026: Omit<AstroEvent, "active">[] = [
  // Mercury Retrogrades 2026
  { id: "merc-retro-1", title: "Mercury Retrograde", description: "Communication may feel foggy — double-check texts before sending!", icon: "☿️", startDate: new Date("2026-01-25"), endDate: new Date("2026-02-15"), type: "retrograde", advice: "Slow down conversations. Old connections may resurface." },
  { id: "merc-retro-2", title: "Mercury Retrograde", description: "Travel and tech disruptions. Be patient with matches.", icon: "☿️", startDate: new Date("2026-05-19"), endDate: new Date("2026-06-11"), type: "retrograde", advice: "Revisit past connections. Avoid making major relationship decisions." },
  { id: "merc-retro-3", title: "Mercury Retrograde", description: "Reflect on what you truly desire in a partner.", icon: "☿️", startDate: new Date("2026-09-12"), endDate: new Date("2026-10-04"), type: "retrograde", advice: "Great time for introspection. Journal about your ideal connection." },
  // Eclipses
  { id: "solar-eclipse-1", title: "Solar Eclipse in Pisces", description: "A powerful reset for emotional connections and intuition.", icon: "🌑", startDate: new Date("2026-02-17"), endDate: new Date("2026-02-17"), type: "eclipse", advice: "Set intentions for the kind of love you want to attract." },
  { id: "lunar-eclipse-1", title: "Lunar Eclipse in Virgo", description: "Release perfectionism in relationships. Embrace authenticity.", icon: "🌕", startDate: new Date("2026-03-03"), endDate: new Date("2026-03-03"), type: "eclipse", advice: "Let go of unrealistic expectations. Be real with your matches." },
  { id: "solar-eclipse-2", title: "Solar Eclipse in Virgo", description: "New beginnings in how you serve and show up in love.", icon: "🌑", startDate: new Date("2026-08-12"), endDate: new Date("2026-08-12"), type: "eclipse", advice: "Start fresh routines that support your love life." },
  { id: "lunar-eclipse-2", title: "Lunar Eclipse in Pisces", description: "Deep emotional revelations about your heart's desires.", icon: "🌕", startDate: new Date("2026-08-28"), endDate: new Date("2026-08-28"), type: "eclipse", advice: "Trust your intuition about connections. Dreams may be vivid." },
  // Seasons
  { id: "aries-season", title: "Aries Season", description: "Bold energy! Take the initiative and make the first move.", icon: "♈", startDate: new Date("2026-03-20"), endDate: new Date("2026-04-19"), type: "season", advice: "Be bold. Send that first message!" },
  { id: "taurus-season", title: "Taurus Season", description: "Slow and sensual energy. Focus on quality over quantity.", icon: "♉", startDate: new Date("2026-04-20"), endDate: new Date("2026-05-20"), type: "season", advice: "Take your time getting to know matches. Savor the process." },
  { id: "gemini-season", title: "Gemini Season", description: "Playful, curious energy. Great for flirty conversations.", icon: "♊", startDate: new Date("2026-05-21"), endDate: new Date("2026-06-20"), type: "season", advice: "Keep conversations light and fun. Explore diverse connections." },
  { id: "cancer-season", title: "Cancer Season", description: "Nurturing energy. Deep emotional bonds form now.", icon: "♋", startDate: new Date("2026-06-21"), endDate: new Date("2026-07-22"), type: "season", advice: "Open up emotionally. Vulnerability is your superpower." },
  { id: "leo-season", title: "Leo Season", description: "Radiant confidence! Your profile shines brightest now.", icon: "♌", startDate: new Date("2026-07-23"), endDate: new Date("2026-08-22"), type: "season", advice: "Update your photos. Show your most confident self." },
  { id: "virgo-season", title: "Virgo Season", description: "Refine your approach. Quality connections over quantity.", icon: "♍", startDate: new Date("2026-08-23"), endDate: new Date("2026-09-22"), type: "season", advice: "Review and polish your profile. Be selective." },
  { id: "libra-season", title: "Libra Season", description: "Partnership energy is at its peak. Love is in the air!", icon: "♎", startDate: new Date("2026-09-23"), endDate: new Date("2026-10-22"), type: "season", advice: "Focus on balance and harmony in your connections." },
  { id: "scorpio-season", title: "Scorpio Season", description: "Intense, transformative connections. Deep or nothing.", icon: "♏", startDate: new Date("2026-10-23"), endDate: new Date("2026-11-21"), type: "season", advice: "Seek depth. Surface-level won't satisfy now." },
  { id: "sagittarius-season", title: "Sagittarius Season", description: "Adventure calls! Expand your dating radius.", icon: "♐", startDate: new Date("2026-11-22"), endDate: new Date("2026-12-21"), type: "season", advice: "Try new types. Be open to different backgrounds." },
  { id: "capricorn-season", title: "Capricorn Season", description: "Serious relationship energy. Define what you want.", icon: "♑", startDate: new Date("2026-12-22"), endDate: new Date("2027-01-19"), type: "season", advice: "Get clear on your relationship goals." },
  { id: "aquarius-season", title: "Aquarius Season", description: "Unconventional connections. Embrace uniqueness.", icon: "♒", startDate: new Date("2026-01-20"), endDate: new Date("2026-02-18"), type: "season", advice: "Look beyond the usual. Surprise yourself." },
  { id: "pisces-season", title: "Pisces Season", description: "Dreamy, romantic energy. Follow your heart.", icon: "♓", startDate: new Date("2026-02-19"), endDate: new Date("2026-03-20"), type: "season", advice: "Trust your feelings. Romance flows naturally now." },
  // Special
  { id: "venus-star-point", title: "Venus Star Point", description: "A rare alignment amplifying love and attraction energy.", icon: "💖", startDate: new Date("2026-03-23"), endDate: new Date("2026-03-25"), type: "special", advice: "Maximum attraction energy. Put yourself out there!" },
  { id: "summer-solstice", title: "Summer Solstice", description: "Longest day — peak energy for new connections.", icon: "☀️", startDate: new Date("2026-06-21"), endDate: new Date("2026-06-21"), type: "special", advice: "Radiate your brightest energy. Summer love awaits." },
  { id: "winter-solstice", title: "Winter Solstice", description: "The darkest night invites deep soul connections.", icon: "❄️", startDate: new Date("2026-12-21"), endDate: new Date("2026-12-21"), type: "special", advice: "Seek warmth in meaningful connections." },
];

export const useAstroEvents = () => {
  const now = new Date();

  const events: AstroEvent[] = useMemo(() => {
    return ASTRO_EVENTS_2026.map(e => ({
      ...e,
      active: now >= e.startDate && now <= new Date(e.endDate.getTime() + 86400000),
    }));
  }, []);

  const activeEvents = events.filter(e => e.active);
  const upcomingEvents = events
    .filter(e => e.startDate > now)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .slice(0, 5);

  return { events, activeEvents, upcomingEvents };
};
