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
    title: "A few updates to make your experience better ✦",
    changes: [
      { type: "fixed", text: "Bios are back — profile bios now show by default, with a tap to expand and read more." },
      { type: "improved", text: "“More Details” now opens just the extras — About Me, shared aspects, and compatibility." },
      { type: "added", text: "You can now see a history of updates right here, so you always know what's new." },
    ],
  },
];