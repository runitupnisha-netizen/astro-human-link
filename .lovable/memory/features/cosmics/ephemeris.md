---
name: Real ephemeris (astronomy-engine)
description: Sun/Moon/Venus/Rising calculated via NASA-grade astronomy-engine in generate-cosmic-profile edge function and src/lib/ephemeris.ts; AI is forced to use these values
type: feature
---
Stellara uses the `astronomy-engine` npm package (v2.1.19) for real ephemeris math — no AI guessing for chart placements.

- **Frontend lib**: `src/lib/ephemeris.ts` exports `calcChartPlacements({ birthDate, birthTime, latitude, longitude })` returning `{ sun_sign, moon_sign, venus_sign, rising_sign }`.
- **Edge function**: `supabase/functions/generate-cosmic-profile/index.ts` imports from `npm:astronomy-engine@2.1.19`, computes Sun/Moon/Venus geocentric tropical longitudes, and computes Ascendant from local sidereal time + lat/lng.
- **Local→UTC**: approximated by longitude/15 (no tz database). Acceptable for sign accuracy on Sun/Venus; Moon may shift sign in edge windows; Rising requires both birth time + coords.
- **AI override**: the edge function passes the calculated Sun/Moon/Venus/Rising as facts to Gemini and force-overrides the returned values before saving — AI cannot deviate.
- **Schema**: `profiles.venus_sign` text column added. `cosmic-guide` (Lyra) system prompt includes Venus alongside Sun/Moon/Rising.
