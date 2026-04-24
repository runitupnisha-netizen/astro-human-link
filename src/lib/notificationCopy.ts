/**
 * Centralized notification copy for Stellara push notifications.
 * Edge functions and the in-app notification system reference these
 * to keep tone consistent.
 *
 * Tone: warm, brief, mystical, never clinical.
 */

export const NOTIFICATION_COPY = {
  dailyRitual: {
    title: "Your daily ritual is ready ✦",
    body: "Good morning. Lyra has today's planetary insight waiting for you.",
  },
  newMatch: (name: string, score: number) => ({
    title: "A cosmic connection found you ✦",
    body: `${name} and you are ${score}% cosmically compatible. Say hello.`,
  }),
  newMessage: (name: string, preview: string) => ({
    title: `${name} sent you a message`,
    body: preview.slice(0, 40) + (preview.length > 40 ? "..." : ""),
  }),
  newMoon: {
    title: "New moon tonight ✦",
    body: "Set your love life intention before midnight. Lyra is holding space.",
  },
  fullMoon: {
    title: "Full moon rising ✦",
    body: "What are you ready to release under tonight's moon? Your journal is open.",
  },
  mercuryRetrograde: {
    title: "Mercury retrograde begins today",
    body: "Check your compatibility before communicating something important.",
  },
  reEngagement: {
    title: "Lyra has been thinking about you ✦",
    body: "There's something in your chart this week worth knowing about.",
  },
  weeklyReport: {
    title: "Your weekly cosmic report is ready ✦",
    body: "See what the planets have planned for your love life this week.",
  },
} as const;

/**
 * In-app permission primer shown BEFORE the OS push permission dialog.
 * Only triggered after first Daily Ritual completion.
 */
export const PUSH_PERMISSION_PRIMER = {
  headline: "Never miss a cosmic moment",
  body: "Lyra will let you know when the stars have something for you.",
  acceptLabel: "Yes, notify me ✦",
  declineLabel: "Maybe later",
};

/**
 * localStorage key tracking whether the user has been shown the primer.
 * Used by the Daily Ritual completion handler to avoid re-prompting.
 */
export const PUSH_PRIMER_SHOWN_KEY = "stellara_push_primer_shown";