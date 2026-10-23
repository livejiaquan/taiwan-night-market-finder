# Design notes

## Goal
Answer one question first — how many night markets are on the regular schedule for the chosen date — and keep every claim traceable to its source. The interface is organised around that number, a seven-day date strip, and a list beside a district overview.

## Layout
- Sticky header: brand mark, a search capsule (query + district), theme and language toggles.
- A row of pill buttons selects one of seven dates, each with that day's scheduled count.
- Desktop: results on the left, a sticky district tile map on the right (roughly 49 : 51, 48 px gutter). Phone: the district overview on top and the results in a rounded sheet beneath it.
- Cards drop the frame: a 4:3 schedule tile (the week drawn as seven day cells), then name, permitted area, source and verification date, and an underlined link to the evidence.
- The layout proportions follow the card-list-plus-map pattern used by common place-search products.

## District map
The official register has no coordinates, so the map is a schematic tile grid of Tainan's 37 official districts, positioned by hand (`src/product/districtTiles.ts`, covered by a test that every district appears exactly once). Tile colour shows how many markets are scheduled on the selected date; selecting a tile applies the official district filter. It is labelled as not a scaled map and not a location.

## Type, spacing, colour
- Fixed type scale: 12 / 14 / 16 / 18 / 22 / 28 / 36 / 48 / 64 / 96 px. Nothing under 12 px; body text 16 px; the headline count is 64 px (48 px on phones).
- 8-point spacing steps; one 1440 px container with 16/24/48 px gutters.
- Neutral grey ramp (#222 / #6a6a6a / #ddd) with a single red accent; green, amber and grey are reserved for decision status. Light by default, dark available and remembered.
- System CJK fonts only, so there is no render-blocking font request.

## Brand mark and icons
The mark is a white Lucide `store` icon (58% of the square, stroke 2) on a red `#C4302B` square with 22% corner radius. The same SVG (`public/brand/mark.svg`) drives the header, `favicon.svg` and a 180 px `apple-touch-icon.png`.

All UI icons come from `lucide-react`, drawn at stroke 1.75 and only at 16, 20 or 24 px. The one inline `<svg>` outside the brand mark is the Taiwan map data graphic in the `/lab` prototype, which is not an icon.

## Deliberately not done
- No "open now" / "closed" labels or hours: the register has no such fields.
- No nearby ranking or distance: no coordinates, and no location permission is requested.
- No ratings, photos or popularity ordering: nothing traceable to support them.

## Checks
Run against the production build: axe reports no moderate-or-worse issues in light and dark at 390 and 1440 px; every visible interactive element is at least 44 × 44 px; Lighthouse mobile 99 / desktop 100 for performance, with 100 for accessibility, best practices and SEO; layout shift 0.
