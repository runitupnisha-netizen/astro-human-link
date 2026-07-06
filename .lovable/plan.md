
# Reposition Stellara around Human Design

Strategic repositioning: Human Design becomes the lead everywhere; astrology stays fully functional but visually and architecturally secondary. Not a rebuild — targeted edits across the surfaces below.

## 1. Onboarding "wow moment"

- After birth info step, the reveal screen leads with the **Human Design bodygraph** (using existing `BodyGraph` component) instead of the natal wheel.
- Headline: "Your Human Design Type: {Generator | Projector | Manifestor | Reflector | Manifesting Generator}"
- Prominent trio of stat cards: Energy Type · Strategy · Authority
- Natal wheel demoted to a smaller "Also in your blueprint" section below.

## 2. Home / Today screen

- New top hero card: Human Design daily insight (type + one-line strategy nudge for today).
- HD type badge always visible in the header row (next to greeting/avatar).
- Existing astrology-first cards (moon phase, transit, daily briefing) reflow into a "Cosmic weather" section below the HD block.

## 3. Blueprint / Profile screen

- Section order becomes: **Human Design → Gene Keys → Numerology → Astrology** (currently reversed).
- `BodyGraph` renders first, full-width, with type/strategy/authority summary at top.
- Astrology natal wheel remains but at the bottom of the Blueprint page and the sub-nav.

## 4. Lyra AI (cosmic-guide)

- Update system prompt in `supabase/functions/cosmic-guide/index.ts`:
  - Grounding paragraph leads with `Human Design {type} · {authority} · Profile {profile}` before astrology placements.
  - Opening template becomes: "As a {Type} with {Authority} authority, your strategy is to {strategy}…" then astrology context.
- Astrology placements remain in the prompt but move after HD context.

## 5. Navigation + labels

- Rename any "Birth Chart" / "Astrology"-led labels to "Your Blueprint" (nav items, page titles, breadcrumbs, MyChart route heading).
- No screen title starts with "Astrology". Blueprint sub-route `/blueprint/human-design` becomes the default landing when someone taps the Blueprint tab.

## 6. App metadata + copy

- `index.html` `<title>` and meta description lead with Human Design & self-discovery, not astrology.
- Marketing/hero copy (`HeroSection`, onboarding intro, empty states, Premium page pitch, Footer tagline) replaces "astrology app" / "cosmic astrology" with "Human Design & self-discovery".
- Keep secondary mentions of astrology/numerology/Gene Keys as supporting pillars.

## 7. Demo account

- Ensure `demo@stellara.app` has a fully generated Human Design profile (Generator preferred — richest bodygraph) with type, authority, profile, defined centers, channels, and gates populated.
- Runs via existing `seed-demo-account` edge function; add/adjust birth data to guarantee a Generator or Projector result and re-seed.
- Verify bodygraph renders without gaps on the Today, Blueprint, and Profile screens for the demo user.

## Technical notes

- Files likely touched: `src/pages/Onboarding.tsx`, `src/pages/SacredReveal.tsx`, `src/pages/Today.tsx`, `src/pages/Blueprint.tsx`, `src/pages/blueprint/HumanDesign.tsx`, `src/pages/blueprint/Astrology.tsx`, `src/pages/Profile.tsx`, `src/pages/MyChart.tsx`, `src/components/Navigation.tsx`, `src/components/HeroSection.tsx`, `src/components/SoulBlueprintCard.tsx`, `src/components/blueprint/BodyGraph.tsx` (reuse only), `supabase/functions/cosmic-guide/index.ts`, `supabase/functions/seed-demo-account/index.ts`, `index.html`.
- No schema changes. No feature removal. Astrology components, routes, and data pipelines remain in place.
- Memory updates: refresh `mem://brand/positioning-strategy` and add a Core rule so future sessions default to Human Design-first framing.
- Verification: after each surface, screenshot via Playwright at mobile viewport (Onboarding reveal, Today, Blueprint, Lyra first message with demo login) to confirm HD leads visually.

## Rollout order

1. Prompt + metadata (fast wins, no UI risk): Lyra system prompt, `index.html`, hero copy.
2. Blueprint reorder (single page).
3. Onboarding reveal swap.
4. Today screen HD hero.
5. Navigation label pass.
6. Demo account reseed + screenshot verification.
