# Tainan Night-market Production Pilot — Release Specification

Status: **implementation gate**. This is a public, static Tainan pilot; it is not a public beta, a nationwide directory, or a live-opening service.

## Baseline and decision

- Starting commit: `562816523d0cd4fcd7ee01e129646b74ffafb3ff` on `codex/unified-visual-refresh`.
- Starting worktree: clean before this specification.
- Current automated baseline: all 75 unit/data tests pass on Node 22.22.3. The release gate also runs the repository-owned Chromium smoke suite against the production build and project-site base path.
- This document refines, and does not override, [PRODUCT_MISSION.md](./PRODUCT_MISSION.md), [DATA_TRUST_CONTRACT.md](./DATA_TRUST_CONTRACT.md), [ROADMAP.md](./ROADMAP.md), and [README.md](../README.md).

## Persona, job, and journeys

**Persona:** a person in or travelling to Tainan, usually on a mobile phone that afternoon/evening, who needs a credible candidate without manually reconciling government sources.

**Job:** within 30 seconds, select a Taipei-time date; optionally apply an official administrative-district exact filter or search; choose a safely represented market; inspect the evidence; then open a name-and-permitted-area Maps search or share the reproducible link.

1. **Find a candidate:** open `/`, understand that the answer is a normal weekly schedule, select one of seven dates, optionally filter/search, and select a confirmed candidate or a clearly degraded candidate for further confirmation.
2. **Verify and leave:** open `/market/:id`, see the date-specific decision, official permitted area and schedule, field-level publisher/source/timestamps, then use Maps or share.
3. **Recover:** clear no-result filters, use browser history, retry a share failure manually, reload a fatal data error, and use original-source links when conflict, stale data, or unknown fields prevent a safe positive conclusion.
4. **Deep link:** directly open a market URL on a GitHub Pages project site; the base path and 404 recovery restore the same route and parameters without silently substituting another market.

## Claim boundary and source inventory

The only affirmative answer is: **whether an official Tainan licensed-market register schedules a market on the selected date's normal weekly cycle.** It is never a claim that the market or a stall is open now.

Never invent or infer hours, coordinates, distance, nearby ranking, food/popularity ranking, weather, temporary closure, festivals, stalls, location, or live state. Missing, stale, unknown, and relevant conflict data remain visible and non-confirmed.

| Source | Supported fields | Policy |
| --- | --- | --- |
| Tainan licensed-market register | record ID, name, permitted area, schedule days, admin code | immutable raw snapshot, schema/profile validation, field evidence, 90-day schedule freshness |
| Tainan district-code register | official admin-code to district-name mapping | exact join only, independently fail-closed after 365 days |
| Curated official conflict record | documented alternate official schedule value | only affects the relevant selected date; no latest-wins merge |
| Maps query | derived name + permitted area search string | disclosed as derived; not an official coordinate |

## Architecture and data flow

```text
official endpoints → immutable snapshots + raw checksums → strict parser/validation
  → conflict curation + normalized semantic diff → generated field-evidence artifacts
  → browser runtime validation + date-specific decision policy → static React UI
  → GitHub Pages artifact (project-site base + 404 route restoration)
```

The browser performs no official-source fetch, uses no runtime credentials, tracking, account, location permission, server, or Maps SDK. `/lab` and `/style/*` are retained non-public prototypes and must not provide public-product claims or production data.

## Required state matrix

| State | Required UI and recovery |
| --- | --- |
| Loading | labelled skeleton; no fake progress or candidates |
| Confirmed | teal, text/icon status, decision only when date-specific evidence is current/aging and non-conflicting |
| Conflict / stale / unknown | non-confirmed style; explain impact and show source/evidence path |
| Empty | state that no safe same-day candidate is shown; clear filters/date recovery |
| Recoverable error | share/clipboard error with manual URL-copy recovery |
| Fatal | no candidate fallback; reload and official-source action |
| Pending / disabled | share action disabled with polite status |
| Invalid route/filter | no silent substitution; return/clear recovery |

## Non-functional requirements

- **Privacy/security:** static only, no account, tracking, location collection, secrets, Google Places scraping, or analytics. GitHub workflows use only least-privilege `GITHUB_TOKEN` permissions.
- **Accessibility:** semantic landmarks, keyboard-operable controls, visible focus, skip link, screen-reader labels/live status, WCAG AA contrast, and `prefers-reduced-motion`.
- **Responsive:** tested at 390×844, 768px, and 1440px.
- **Performance:** static, hashed assets, lazy product/lab chunks; record production bundle sizes and console/network errors in release evidence.
- **SEO:** truthful title/description/JSON-LD; canonical/OG/robots/sitemap must use the project-site base and market URLs must have crawler-safe static shells where supported by the host.
- **Operations:** retain last-known-good artifact on sync failure; weekly check is review-only; validation, source outage, schema drift, dead-link failure, and semantic changes must be visible.

## Measurable acceptance criteria

1. On Node 22: `data:check`, all tests, typecheck, lint, build, deployment metadata, diff-check, `npm audit --audit-level=high`, and the Chromium release smoke pass.
2. A trusted dataset has non-zero approved rows, unique IDs, complete critical field evidence, valid raw checksums, and exact district joins; stale/unknown/relevant conflict never appear confirmed.
3. Root, direct market URL, query restoration, back/forward, date/search/district, detail, Maps disclosure, share recovery, zh-Hant/en, focus and reduced-motion behaviours have focused tests and browser evidence.
4. GitHub Pages artifact contains only project-base asset paths; root, direct market route and 404 recovery work without root-relative leakage.
5. Scheduled data checking never publishes or auto-merges changes. Semantic changes open or update a review PR; failure is actionable and preserves the current production artifact.
6. UI visibly provides correction/support, privacy, accessibility, attribution, limitations, source channels, and a machine-checkable release-health marker without fake SLA claims.

## Executable release gate

Use the committed lockfile and Node 22.22.3 (for example `source "$HOME/.nvm/nvm.sh" && nvm use 22.22.3`). The exact local gate is:

```bash
npm ci
npm run verify
npm run deploy:metadata -- --site-url https://livejiaquan.github.io --base-path /taiwan-night-market-finder
git diff --check
npm audit --audit-level=high
npm run test:e2e:chromium
npm run test:e2e
```

`test:e2e` rebuilds the checked data, writes Pages-base deployment metadata, starts `vite preview` only on `127.0.0.1:4321` with `--strictPort`, and runs three Chromium cases. They cover root and direct/404-restored market routes, the essential date/search/exact-district/detail/Maps/share-recovery/zh-Hant–English journey, keyboard skip navigation with visible focus and main-content focus, reduced-motion computed transition/scroll behavior, 390px and 1440px overflow, page errors, failed same-origin requests, the release-health marker, and serious/critical axe violations on root and detail. This is a focused release smoke suite; it does not replace manual assistive-technology testing or post-deployment GitHub Pages verification.

## Release, rollback, and limitations

Release needs independent product/technical review and explicit lead approval. Integrate from the current `origin/main` common ancestor with normal non-force Git operations only. Monitor the exact commit's Actions/Pages result and then request public root/deep-link HTML/assets/marker and browser evidence.

Rollback deploys an earlier validated static artifact/commit; it does not delete immutable source snapshots or alter evidence history. A hard-stale artifact remains degraded after rollback.

Known limitations: Tainan only; normal schedules only; upstream timestamps may be unavailable; Maps is a derived search; GitHub issue correction intake requires sign-in; no real-user study gate has been completed, so no public-beta claim is permitted.
