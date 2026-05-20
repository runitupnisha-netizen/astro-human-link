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
    title: "A new Connection ✦",
    body: `${name} and you are ${score}% aligned. Say hello when you're ready.`,
  }),
  newMessage: (name: string, preview: string) => ({
    title: `${name} sent you a message`,
    body: preview.slice(0, 40) + (preview.length > 40 ? "..." : ""),
  }),
  newMoon: {
    title: "New moon tonight ✦",
    body: "Set your intention before midnight. Lyra is holding space.",
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
    body: "See what the planets have planned for you this week.",
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

/**
 * Tracks how many times the user has dismissed the primer with "Maybe later".
 * After 3 dismissals, the primer is never shown again.
 */
export const PUSH_PRIMER_DISMISS_COUNT_KEY = "stellara_push_primer_dismiss_count";

/**
 * Tracks Daily Ritual completions since the last "Maybe later" dismissal.
 * The primer re-shows once this counter reaches 3.
 */
export const PUSH_PRIMER_RITUALS_SINCE_DISMISS_KEY =
  "stellara_push_primer_rituals_since_dismiss";

/**
 * Permanent terminal state — set when the user has either granted, hard-denied,
 * or hit the 3-dismissal cap. The primer must never appear again after this.
 */
export const PUSH_PRIMER_RESOLVED_KEY = "stellara_push_primer_resolved";