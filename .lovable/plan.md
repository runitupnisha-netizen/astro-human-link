

## Add Map Preview to ViewProfile Page

**What**: Show an embedded OpenStreetMap preview on the ViewProfile page when the viewed user has a current location set, matching the existing map on the Profile page.

### Changes (single file: `src/pages/ViewProfile.tsx`)

1. **Extend ProfileData interface** — add `current_city`, `current_latitude`, `current_longitude` fields.

2. **Update the Supabase query** — include these three columns in the `.select()` call.

3. **Replace the birth_place location display** (line ~165-169) — show `current_city` instead (or keep birth_place as secondary info). Display the current city under the user's name.

4. **Add map preview section** — after the header and before the photo gallery, render a themed OpenStreetMap iframe (same approach as Profile page) when `current_latitude` and `current_longitude` are set. Include the city name with a MapPin icon below the map.

### Technical Details

- Map uses the same OpenStreetMap embed URL pattern with a bounding box calculated from the coordinates (±0.05 degrees).
- Same CSS filter applied for dark celestial theme consistency: `hue-rotate(220deg) saturate(0.6) brightness(0.85) contrast(1.1)`.
- Wrapped in a `motion.div` with fade-in animation to match the page's staggered animation pattern.
- Map height: ~160px, rounded corners, border styling consistent with other cards.

