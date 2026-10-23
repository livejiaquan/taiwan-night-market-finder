# Who uses this, and what they need

These are desk-research personas derived from the product scope, the data limits, and public statistics. I did not run interviews; revisit them with real feedback.

## Personas

| Persona | Situation | Cares about | Device |
|---|---|---|---|
| Tainan resident | Deciding after work which night market to go to | Speed, district filter, today vs. tomorrow | Phone |
| Domestic visitor | Planning the next day or two from a hotel | Date switching, weekly overview, directions | Mostly phone, sometimes a laptop |
| International traveller | One or two nights in town; can't read "週三、六" | English UI, a clear "not live status" message | Phone, often outdoors on a weak connection |
| Open-data user | Wants to know where the data comes from and where sources disagree | Field-level sources, timestamps, original links | Desktop |

## Top tasks

1. Find the markets scheduled **tonight** — the count and first card are visible without scrolling on a phone.
2. Narrow to a district or a named market — one tap or one query, kept in the URL.
3. Check trust and leave — source and directions within two taps.

## Non-functional requirements

| Area | Requirement |
|---|---|
| Performance | Fast first paint on mobile; no web fonts, responsive hero image. Lighthouse performance ≥ 90 |
| Accessibility | WCAG 2.1 AA contrast, keyboard operable, touch targets ≥ 44 px |
| Trust | Never present a regular schedule as live status; show source and update time per record |
| Resilience | Explicit states for empty results, stale data, source conflicts, bad links, fatal errors |
| Languages | Chinese and English, switch remembered |
| Night use | Light and dark themes |
| Sharing | Filter state lives in the URL (`?date=&q=&district=`) |
| Privacy | No tracking, no location permission |

## Device assumption

StatCounter reports Taiwan web traffic at roughly 58% mobile, 39% desktop and 3% tablet (Sep 2025 – Sep 2026). A tonight-or-on-the-way lookup skews more mobile than that average, so I treat the phone (390 px) as the primary design target and the desktop (1440 px) as the planning and verification layout. That higher mobile share is an assumption, not a measurement.
