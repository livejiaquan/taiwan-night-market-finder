# Iteration 2 — 行政區相關性可逆實驗

狀態：`2026-08-11 / implemented candidate / Mission post-gate: AMBER pending outcome evidence`

## Research Question

在不取得定位、座標或距離資料的前提下，加入可追溯的行政區名稱與選填行政區控制，是否能讓「已知道想去臺南哪一區」的手機使用者更快縮小正常週期候選，而不讓人誤認為附近、距離排序、推薦或即時營業？

## Scope and Context

- Pilot 仍固定為臺南市政府許可名冊 32 筆，不新增夜市、不擴縣市。
- 現有每星期候選為 5–9 筆，跨 4–8 個行政區；目前順序只是官方 source sequence，不是相關性排序。
- 夜市名冊提供八碼 `adminCode`，但部分許可路段沒有行政區文字，因此不能從地址猜區名。
- 臺南市政府「臺南市各區代碼」API 目前提供 37 個 `AreaCode → AreaName` 對照，完整涵蓋 pilot 使用的 19 個代碼。
- 競品已提供縣市、定位或地圖；本實驗不是差異化主張，只測試在既有可信窄切片中減少掃描成本。

官方行政區來源：

- Catalog: https://data.tainan.gov.tw/DataSet/Detail/70d961d2-9f38-4112-847d-907b436820ab
- API: https://soa.tainan.gov.tw/Api/Service/Get/5b389f60-dee6-425a-8a40-f5cb2f949cf1
- Publisher: 臺南市政府研究發展考核委員會
- License: 政府資料開放授權條款第 1 版

## Key Findings

1. 行政區是目前唯一能用官方資料可靠提供的空間相關性；沒有證據支持距離、附近或旅遊推薦。
2. 現有搜尋聲稱可搜「安南區」，但只搜尋名稱與許可區域；未明列行政區的紀錄會產生不一致結果。
3. 單純在 UI 硬編區名會重新引入無 lineage 的 decision-critical 欄位；必須保存官方 raw snapshot、checksum、retrievedAt 與 runtime validation。
4. Native select 比 19 個 chips 更適合 390px 手機寬度，也能保留鍵盤與 screen reader 語意。
5. 這個控制只對「已知目標行政區」persona 有幫助；不熟臺南的旅客仍需真實 task test，不能從實作完成推論 outcome。

## Comparative Analysis

| Approach | User value | Trust boundary | Cost / risk | Decision |
| --- | --- | --- | --- | --- |
| 只在卡片顯示行政區 | 降低地址辨識成本，但不能縮小集合 | 可由官方 code table 支持 | 低；仍需掃描 5–9 張卡 | 保留作 baseline improvement |
| 行政區 native select + 卡片標示 | 已知區域時可直接縮小候選 | 只做 exact code match，不推論距離 | 中；需 URL、empty、deep-link、evidence | **本輪 hypothesis** |
| 取得定位後算附近 | 對陌生人可能更直接 | 現有資料沒有可信座標 | 高；permission、座標與距離誤差 | 不做 |
| 手動熱門區／推薦排序 | 容易看似有用 | 沒有可稽核需求或品質證據 | 高誤導風險 | 不做 |

## Trade-offs

- 多一個控制會增加首屏高度與認知負擔；必須讓它選填、預設全部，並以 browser/mobile 驗收確認第一個結果仍容易到達。
- URL 保存 `district` 能分享／返回相同集合，但也增加 state 組合；invalid code 必須安全回到全部，不能套錯區。
- 只列 pilot 實際出現的 19 區可減少無結果選項，但必須清楚寫「本資料收錄的行政區」，不能暗示臺南只有 19 區。
- 選區後若所選日期沒有候選，應顯示 empty recovery；不能自行改日期或偷偷清除選區。

## Recommended Approach

1. 建立獨立的官方行政區 reference pipeline，保存 37-row raw snapshot、SHA-256、source metadata 與 generated artifact。
2. Runtime fail closed：37 codes 唯一、名稱唯一、每個 market `adminCode` 必須能 join；缺 mapping 時整個 public product 進 fatal state，不顯示猜測名稱。
3. 每張候選卡與詳情顯示短區名；詳情 evidence 顯示完整官方區名、code、來源與核對日。
4. 新增選填 native select，只列 pilot 實際使用的 19 區，選值為官方 code；搜尋也匹配官方區名。
5. `district`、`date`、`q` 同為 URL state；日期、搜尋、詳情、返回與分享不得遺失既有 filter context。
6. Filter 只在 `getMarketDecision` 之外縮小集合，永不改寫 confirmed/conflict/stale/unknown。

## Alternative Approaches

- 若實際測試顯示 select 沒有加速但行政區標籤有幫助，移除控制、保留官方區名顯示與搜尋。
- 若不熟臺南者仍無法選擇，先把產品使命收斂為「已知夜市／已知行政區的週期查證」，不要直接跳到 geolocation。
- 只有取得合法、可維護且精度足夠的官方座標來源後，才另立距離 hypothesis。

## Implementation Considerations

- 行政區 reference freshness 與夜市 schedule freshness 分開；code table 不套用 90-day schedule hard-stale 規則。
- Reference source 的 catalog update date 若不在 API payload，保持 `sourceUpdatedAt: null`；不從網頁文字人工寫入 artifact。
- API envelope 隨機 `id` 會改變 raw SHA；保留 raw integrity hash，後續 maintenance proof 再補 semantic hash。
- 不新增帳號、定位 permission、Maps SDK、座標、analytics 或 runtime network dependency。

## UX Brief

- Persona：已知道住宿地、行程地或想去的臺南行政區，但不知道該區所選日期有哪些列冊夜市的一般手機使用者。
- Job：選定日期與行政區後，在 30 秒內選到正確 normal-schedule candidate 並啟動 Maps；同時理解結果不是附近或即時保證。
- Screens：首頁 control strip、candidate card、empty recovery、detail evidence；不改 legacy lab。
- Observable success：URL 保存行政區；只顯示 exact-code matches；卡片可辨識區名；invalid code 不套錯 filter；Garden conflict 與 stale 語意完全不變。
- Outcome experiment：5 位目標使用者做 paired baseline／district flow。至少 4/5 在 30 秒內選到指定區正確候選並啟動 Maps、0/5 誤認為即時或附近保證，且中位完成時間改善至少 25%。否則移除 control。
- Constraints：Vite + React + TypeScript + 現有 Tailwind；靜態 build；無 credential、runtime fetch、定位或座標。
- Risks：19-option select 對不熟區名者無效；新增控制把結果推到首屏以下；URL state 遺失；source join drift；中英文區名呈現。

## UX States Matrix

| State | Trigger | UI Response | Recovery/Next Action |
| --- | --- | --- | --- |
| Loading | public chunk 或兩個 generated artifacts 尚未完成載入 | 延續既有 skeleton；不先顯示無 district evidence 的卡片 | 自動完成 |
| Empty | 日期＋行政區＋搜尋沒有安全候選 | 說明是條件無結果，列出 active district；不說該區沒有夜市 | 清除行政區／搜尋或改日期 |
| Error (Recoverable) | URL `district` 不在官方 reference | 顯示全部區域並忽略 invalid value；不套用錯誤 code | 使用 select 重新選擇 |
| Error (Fatal) | reference artifact invalid、join 缺漏或 checksum check 失敗 | 由既有 ErrorBoundary 顯示資料不可用；不 fallback 猜區名 | 重載或開官方來源 |
| Success | official code exact match | 卡片與 detail 顯示區名；filter 只縮小結果 | 看依據、導航或分享 |
| Disabled/Pending | 無非同步行政區 action | Native select 維持可用；不創造假 pending | 不適用 |
| Partial/Degraded | schedule stale/conflict/unknown | 保留原 decision state；district evidence 不把它升級成 confirmed | 查 schedule 原始來源 |

## Visual Direction

- 沿用暖米色、slate、orange action accent；行政區是 neutral location metadata，不使用 success green。
- Control strip 在 mobile 依序為日期、行政區、搜尋；desktop 日期較寬，行政區與搜尋並列。
- Native select 高度至少 48px、slate border、orange focus ring；說明文字用 12–14px slate，明寫「不是附近排序」。
- Card 在許可區域前以 compact neutral text 顯示區名，不新增裝飾 badge 海。
- Detail 在 location definition list 顯示 district；evidence panel新增一張官方行政區來源卡。
- Motion 僅沿用既有 150–200ms focus/hover；選區後不自動捲動、不改日期。

## Component Contracts

### `districtData`

- 匯入 generated reference artifact並 runtime validate；export `districtDataset`、`pilotDistricts`、`getDistrict(code)`。
- 37-row exact baseline、unique code/name、`6700` code format、source identity與 future timestamp fail closed。
- 啟動時 assert 每個 `marketDataset.markets[].adminCode` 都能 join。

### `LocationState` / `writeLocation`

- 增加 `districtCode: string`；只接受 known official code，invalid value讀成空字串。
- 所有首頁 state transition、detail/back/share link 都保留 `date`、`q`、`district`。
- 空值不寫入 URL；既有 query link保持相容。

### `DistrictControl`

- Props：locale、date、query、districtCode。
- Native labelled select；options 為 pilot 使用的 19 區，按官方 code sequence；value 為 code。
- Help text明示 exact administrative area filter，不代表附近、距離或推薦。

### `MarketCard` / `DetailView`

- 必須取得 validated district record，不接受 optional/unknown label。
- 顯示 short name；detail evidence 顯示完整 official name、code、publisher、source URL、retrievedAt。
- `MarketDecision` 仍只由 schedule data計算。

### Empty recovery

- 清除 action 同時清空 `q` 與 `district`，保留 date。
- Copy 依 active filters說明，不自動顯示其他區候選。

## File Plan

Create：

- `scripts/sync-tainan-districts.mjs` 與 focused tests。
- `data/sources/tainan-districts/*.json` immutable official raw snapshot。
- `src/data/generated/tainan-districts.json` production reference artifact。
- `src/product/districtData.ts` 與 focused tests。

Edit：

- `package.json`：將 district reference check 納入 `data:check`，新增 explicit sync command。
- `src/product/TrustedApp.tsx`：URL state、select、filter、district card/detail/evidence。
- `src/product/TrustedApp.test.tsx`：filter、URL preservation、invalid/empty/conflict/stale invariants。
- `docs/DATA_TRUST_CONTRACT.md`、`docs/PRODUCT_MISSION.md`、`docs/ROADMAP.md`、`README.md`：source boundary、hypothesis與 kill criteria。

Explicitly not touched：

- `src/App.tsx`、legacy dataset、lab routes、hero asset。
- Night-market schedule source values與 conflict curation。
- Maps query、座標、定位、距離、推薦、帳號或 analytics。

## Implementation

已完成一個可逆、非定位的 exact-code control：

- 已擷取並提交臺南市政府研究發展考核委員會官方 37-row 區碼 snapshot，以及由它生成的 public district artifact；同步器會驗證 endpoint identity、完整序列、unique code、schema、timestamp 與 checksum。
- 夜市 artifact 升級為 parser v2，將原始夜市名冊的 `adminCode` 作為獨立 field evidence；runtime 同時驗證「夜市 record → admin code」和「admin code → 官方區名」兩段 lineage，32/32 市場均 join 到 19 個 pilot districts，否則 fail closed。
- 首頁加入可選 native select、URL `district` context、invalid-link notice 與 recoverable empty state；它只在已算出的 schedule decision 上做 exact code filtering，沒有加入定位、座標、距離、排序或即時營業主張。
- 市場卡與 detail 顯示官方區名；detail 分別展示行政區代碼與行政區名稱的 evidence，並保留返回列表時的 filter context。

## Verification

本次已完成：

- 官方 district API live response 為 37 unique rows，涵蓋 19/19 pilot codes；已提交 snapshot checksum 與 generated artifact，`npm run data:check` 可離線重建驗證。
- future timestamp、source identity、missing/duplicate code、schema drift、無法 join 的 district reference 皆有 focused test 並 fail closed。
- 11 test files／71 tests、`data:check`、typecheck、lint、production build、metadata generation、`git diff --check` 均通過。
- 隔離的 production preview 實測 390×844 與 1440px：Friday baseline 為 8 confirmed／1 needs-check；東區只留大東與大東東；北區只留花園週五 conflict；invalid district URL 顯示 notice 並移除參數；detail 顯示兩段行政區 evidence，back 保留 filter；所測流程 console error 為 0。

仍須在正式 beta 前證明：

- 官方 district API live response 為 37 unique rows，涵蓋 19/19 pilot codes；snapshot checksum與 artifact可重建。
- Unknown/missing/duplicate district code、schema drift與 future timestamp fail closed。
- Monday–Sunday confirmed/conflict/stale counts在「全部區域」時與 baseline一致。
- 選東區 Friday只留下大東／大東東；選北區 Friday只留下 Garden conflict；選無候選區顯示可恢復 empty。
- 日期、搜尋、district、detail、back/forward與分享 URL context不遺失。
- Keyboard、screen reader label、768px、long text、zh/en實際瀏覽器可用。
- Loading、empty、fatal、stale、conflict仍可重現；clean normal flow console無 error/warning。
- Focused/full tests、data checks、typecheck、lint、isolated production build、metadata generation通過。
- Existing Testing/Independent Review無 P0/P1；Mission post-gate不得僅因功能完成升級。

## PR Summary

### What

- 加入官方區碼 reference、行政區標示與可逆的選填 filter。

### Why

- 讓已知目標區域的使用者減少掃描候選，同時維持 exact-source、non-live、non-nearby boundary。

### UX States Covered

- Loading：沿用 public lazy skeleton。
- Empty：active district/search recovery。
- Error：invalid URL recoverable；reference/join failure fatal。
- Success：exact district match + unchanged schedule decision。

### Accessibility

- Native select、explicit label/help、48px target、logical mobile order、no color-only meaning。

### Verification

```bash
npm run data:check
npm test -- --run
npm run typecheck
npm run lint
npm run build
```

### Risks / Follow-Ups

- 真實 paired 5-user test仍是 outcome gate；未完成前不可宣稱行政區 control有效或能讓陌生人選到目的地。
- 本機 Node 為 v26，超出 package 宣告的 `<25` range；本次 checks 已通過，但仍須用 supported Node 20/22 在 CI 或 deploy environment 重跑。
