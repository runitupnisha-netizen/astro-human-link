---
name: app-opening-flow
description: After auth/onboarding/verification, the root route `/` is the personal Profile (not Discover). Discover lives at `/discover`.
type: feature
---
The post-auth landing page is the user's own Profile (`/`). Discover (swipe deck) is at `/discover`. Navigation tabs reflect this on both desktop and mobile bottom-bar.

A `OnboardingTour` overlay (src/components/OnboardingTour.tsx) auto-launches on first Profile visit, walking through Profile, Discover, Lyra, Connections, Messages, Inner World, Premium. Dismissed via localStorage key `stellara:full-tour:v1:dismissed`.

A "Preview as a new user" button on the Profile page clears that flag plus `stellara:swipe-tutorial:v1:dismissed` and the verification-skip flag, then re-opens the tour — letting QA replay the full first-time UX. To re-trigger the verification gate after clicking it, navigate to `/verify`.
