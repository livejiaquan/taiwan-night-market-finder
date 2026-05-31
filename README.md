# Taiwan Night Market Finder

A polished frontend/product-design prototype for discovering Taiwan night markets by city, market name, mood, food type, transportation, and opening day.

The app currently keeps two polished visual directions that share one data model and one filter/search core:

- `/` - side-by-side comparison screen
- `/style/neon` - Version 1 / Neon Night Market / 版本 1：霓虹夜市版
- `/style/travel` - Version 2 / Modern Travel Guide / 版本 2：現代旅遊指南版

The UI includes a Chinese / English language switcher. Chinese is the default for the Taiwan-focused product, and English remains available from every style route.

## Product Scope

- Search across English names, Chinese names, city/county, district, food, mood, transit, highlights, and practical notes.
- Filter by city/county, opening day, mood, food type, and transportation.
- Browse responsive night-market cards, detail panels, practical visiting info, recommended foods, source confidence, and a schematic Taiwan map.
- Support mobile, tablet, and desktop layouts as first-class surfaces.
- Render loading, empty, recoverable error, and fallback-data states.
- Compare the two retained frontend versions clearly before choosing one direction for refinement.

## Data Source Strategy

Official night-market data in Taiwan is fragmented. Some public datasets include operating cycles but not coordinates, food tags, transit, or visitor-friendly detail. This prototype therefore uses a curated static fallback dataset in `src/data/nightMarkets.ts`.

Each record includes a `source.confidence` field:

- `official` - official/public dataset directly covers the market or operating-cycle context.
- `curated` - public-data and tourism references were used, but app-specific fields such as food tags or transit notes were curated.
- `fallback` - local fallback fixture or incomplete public coverage.

Public references used:

- [Tainan City licensed night-market open data](https://data.gov.tw/en/datasets/53634)
- [Taoyuan City's tourist night market open data](https://data.gov.tw/en/datasets/25965)
- [Taoyuan City open-data page for tourist night markets](https://opendata.tycg.gov.tw/datalist/0bd2cf36-7540-416b-911c-1ee3216fd79a)
- [Taiwan Tourism Administration](https://eng.taiwan.net.tw/)
- [Government Data Open Platform](https://data.gov.tw/)

The map is a lightweight inline SVG outline of Taiwan that plots each market by its bundled latitude/longitude. It is a schematic locator, not a turn-by-turn navigation map, and it intentionally avoids third-party map-tile dependencies so the build stays fully static and works offline. The neon direction renders it dark with a scanline glow; the travel direction renders it light.

## Visual Directions

### Neon Night Market

Dark mode, generated night-market atmosphere imagery, cyan/fuchsia/amber accents, glowing cards, and a lively food-street hierarchy. Best for a highly branded consumer discovery product.

### Modern Travel Guide

Clean editorial spacing, premium cards, calmer color, strong visual rhythm, and trip-planning detail. Best for a travel-guide product that should feel trustworthy and polished.

## Screenshots

Generate or refresh screenshots after running the local app:

| View | Screenshot |
| --- | --- |
| Comparison | `output/playwright/screenshots/comparison-desktop.png` |
| Neon desktop | `output/playwright/screenshots/neon-desktop.png` |
| Neon mobile detail flow | `output/playwright/screenshots/neon-mobile-detail.png` |
| Travel tablet | `output/playwright/screenshots/travel-tablet.png` |

## Setup

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite. The default dev host is `127.0.0.1`.

## Quality Checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Deployment

This is a static Vite app. Build output is written to `dist/`.

```bash
npm run build
```

Deploy the `dist/` directory to a static host such as Netlify, Vercel static output, Cloudflare Pages, or GitHub Pages.

For hosts that do not automatically route all paths to `index.html`, configure a single-page-app fallback so `/style/neon`, `/style/travel`, and detail routes load correctly.

## Generated Asset

The night-market hero image was generated for this project and copied into:

```text
public/assets/night-market-hero.png
```

Prompt intent: editorial Taiwan night-market atmosphere at blue-hour night, lively stalls, neon, steam, and no readable text or logos.
