# Stellara Repositioning: Self-Discovery Platform

Reframes the app for App Store resubmission. Connections becomes a sub-feature unlocked only after the user completes a Self-Knowledge Foundation. No file rebuilds — copy, gating, and one onboarding tweak.

## 6a. Gate the Connections tab

Add a Foundation gate hook `useFoundationStatus` returning the four checks + `complete` boolean. Source data:

- Birth chart: `profiles.birth_date && birth_time && birth_location` (already collected in onboarding).
- Profile Score ≥ 80%: reuse existing `ProfileCompletionScore` calculation (extract its scoring into a shared util if not already).
- Insights read: track via `localStorage` key `stellara:insights-read` incremented on Weekly Insights view; threshold ≥ 3 OR `daily_briefings` row exists.
- Lyra intro acknowledged: `localStorage` key `stellara:lyra-intro-ack`. Set when user dismisses the existing Lyra intro / first chat in `CosmicGuide`.

In `Connections.tsx`, when `!foundation.complete` render a locked screen:

- Headline: "Complete your Self-Knowledge Foundation to unlock Cosmic Connections"
- Progress bar (X of 4 steps).
- Four interactive rows; tap → deep-link (`/onboarding`, `/profile`, `/insights`, `/lyra`).

Navigation tabs and `ProtectedRoute` stay unchanged — the gate lives inside the page.

## 6b. Onboarding reframe

- Replace "find your match" / "your matches will be filtered" copy in `Onboarding.tsx` with "begin your self-discovery journey" and "your blueprint will be shaped accordingly".
- Hide the Connections nav tab in both `Navigation.tsx` (desktop + mobile bar) when `!foundation.complete` — instead show a "Blueprint" tab linking to `/blueprint` (see 6d).

## 6c. Rename language

Replace across `useTranslation.tsx` (all 6 locales), `Premium.tsx`, `PremiumUpsellModal.tsx`, `WhoLikedMe.tsx`, `DiscoverySection.tsx`, `HeroSection.tsx`, empty states:

| From | To |
|---|---|
| Matches | Connections |
| See Who Likes You | See Who Resonates |
| cosmic matches | cosmic connections |
| Find your match | Discover aligned souls |
| Your matches | Your connections |

Leave intra-Connections page strings (after unlock) untouched per spec.

## 6d. Blueprint section

Create `src/pages/Blueprint.tsx` consolidating:

- Astrology: Sun / Moon / Rising (from `profiles.cosmic_profile`).
- Human Design type + authority.
- Numerology life path.

Pull from existing `useCosmicProfile`/`profiles` queries. Route `/blueprint`. Add a top-of-Profile "Your Blueprint" card linking to it, and a nav entry (replacing Connections slot pre-unlock).

## 6e. Daily Cosmic Nudge

In `Discover.tsx`, hoist `<CosmicNudge />` to render above the swipe deck so it's the first content rendered after the safe-area header. Add `mt-0 mb-4` and ensure it always mounts (currently conditional on premium? verify).

## Technical notes

- New file: `src/hooks/useFoundationStatus.tsx`
- New file: `src/pages/Blueprint.tsx`
- New component: `src/components/ConnectionsLocked.tsx`
- Touch: `Navigation.tsx`, `Connections.tsx`, `Onboarding.tsx`, `Discover.tsx`, `Profile.tsx`, `App.tsx` (route), `useTranslation.tsx`, `Premium.tsx`, `PremiumUpsellModal.tsx`, `WhoLikedMe.tsx`, `DiscoverySection.tsx`, `HeroSection.tsx`.
- No DB migrations needed — Foundation flags derived from existing data + localStorage.
- ~12 files, no rebuilds.
