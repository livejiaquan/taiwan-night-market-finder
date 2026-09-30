# Date → candidates → evidence → navigation

2026-09-30 · bounded improvement, based on deployed `main` (`5c1a25a`).

## Evidence and judgment

- [TainanOutlook's night-market list](https://cp.tainanoutlook.com/night-markets?day=all) already supplies weekday selection, addresses and navigation. More of those features alone is not a defensible reason to use this product.
- Public [weather-related wasted-trip discussion](https://www.ptt.cc/bbs/TaichungBun/M.1652439706.A.ADF.html) and [stalls-not-present discussion](https://www.ptt.cc/bbs/TaichungBun/M.1643886181.A.59B.html) suggest that scheduled-market opening and the actual visit are different questions. These are anecdotal problem examples, not representative user validation or Tainan opening evidence.
- The [government register](https://data.gov.tw/dataset/53634), read 2026-09-30, describes names, administrative codes, permitted areas and operating schedules. Its metadata update time is not a per-market confirmation that the market opens on a particular date.
- The [official Garden tourism page](https://www.twtainan.net/zh-tw/attractions/detail/5572/), read 2026-09-30, still lists Friday in its weekly hours. It does not resolve the stored register's Friday disagreement and is not a date-specific opening announcement. No dataset timestamps were refreshed by this UI change. A direct read of the register JSON through the web tool was unavailable; this batch retains the checksum-validated committed snapshot and does not claim the live register was rechecked.

Decision: retain the small, traceable Tainan pilot. Make the two questions visible beside each candidate: normal weekly schedule versus actual opening on the selected date. Do not fabricate an announcement feed, infer a weather closure, import precise hours, or broaden to nationwide listings. A general opening-hours parser is unnecessary for this reviewed weekday-only dataset.

## Changes

1. Split normal-weekly candidates and records needing further checks into named groups. A weekly calendar icon and “正常週期有排班” replace the checked/open-looking label.
2. Every candidate and detail states “所選日期現場營業：尚未確認”. The product has no date-specific announcements; it does not say announcements do not exist elsewhere.
3. Candidate cards show each schedule source, its check date and schedule-evidence age. Full source-update dates or explicit absence remain in the detail and overall source panels; the compact card avoids repeating those lines. Friday Garden displays both opposite weekday claims.
4. Add a native exact-date input, a return-to-today action that retains district/search and removes the fixed date parameter, and a visible invalid-date recovery. Taipei dates, weekdays and share URLs remain the decision key.
5. Refresh the current clock every minute and on return to the tab. An implicit today follows Taipei midnight; an explicit selected/shared date stays fixed. Selecting Today, returning to Today or following the brand link resumes implicit today. Subsequent date-specific links retain the date they refer to. This is not clock-hour or overnight-opening support. Date controls explicitly explain that limitation.
6. Assess schedule freshness using the oldest record/schedule-source check. A newly checked parent record cannot freshen an old source. Detail evidence retains per-field age, and the district reference keeps its independent policy. Background refresh does not steal keyboard focus.
7. Before Maps, ask the user to check the operator's date-specific announcement or recent on-site information and then confirm location. Navigation remains a derived name-and-permitted-area Maps search, not official coordinates.

## Verification

The regression suite covers all 32 reviewed market records, North District Friday's 0 regular / 1 conflicted candidate, stale evidence, missing verification dates, oldest-source freshness, Taipei midnight, explicit-date preservation, date recovery, filter preservation, English status labels and evidence-before-navigation DOM ordering. Existing field-level source and deep-link checks remain in place.

`npm run verify` passed data reproducibility checks, 95 unit/DOM tests, type checking, lint and production build. `npm audit --omit=dev --audit-level=high` passed with zero findings. The full dependency audit failed on the unchanged development-tool graph: 21 findings (17 high, 1 moderate, 3 low), including brace-expansion and js-yaml. The audit reports no fix available; this remains a release-gate blocker, not a reason to bypass or relax the audit. Dependency manifests/lockfiles are unchanged. The Playwright release smoke test also has actual-opening and pre-navigation assertions ready for the normal release gate.

Cloud browser preview is blocked in the available environment (previous loopback policy denial and terminal.local 502). No local-browser or proxy workaround was used. This change has not had rendered browser, mobile-layout, keyboard-browser or visual QA; DOM assertions are not a substitute. No claim of user validation, a production release or improved conversion is made.
