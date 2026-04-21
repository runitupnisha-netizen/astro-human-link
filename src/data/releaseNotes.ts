export interface ReleaseNoteEntry {
  version: string;
  date: string; // ISO date
  title: string;
  changes: { type: "fixed" | "added" | "improved"; text: string }[];
}

// Newest first. Keep this list curated and concise.
export const RELEASE_NOTES: ReleaseNoteEntry[] = [
  {
    version: "1.4.0",
    date: "2026-04-21",
    title: "Profile cards & release transparency",
    changes: [
      { type: "fixed", text: "Profile card bios are visible by default again with their own tap-to-expand toggle." },
      { type: "improved", text: "'More details' now controls only secondary content (about me, shared aspects, compatibility) — fully decoupled from the bio expander." },
      { type: "added", text: "Release Notes panel so you can always see what shipped and when." },
      { type: "added", text: "Automated smoke tests guarding the bio/expander behavior on every deploy." },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-04-18",
    title: "Password reset reliability",
    changes: [
      { type: "added", text: "Manual password reset fallback — paste your reset link if the redirect ever fails." },
      { type: "improved", text: "Recovery flow now persists across reloads with a 30-minute window." },
    ],
  },
];