# Iteration 1 UX Brief

## UX Brief

- Persona：當天下午或晚上用手機決定臺南行程、沒有時間自己交叉查政府名冊的一般使用者。
- Job：在 30 秒內找到「依正常週期，所選日期有營業」的候選，理解資料不是即時保證，然後啟動導航或分享。
- Screen：public root 的日期／搜尋／候選清單，以及 `/market/:id` 的詳情與 evidence；原型留在 `/lab` 與既有 `/style/*`。
- Observable success：首頁預設臺北時區今天；已知週日不營業者不進今日候選；武聖包含週五；花園週五顯示來源衝突；每張卡可查來源、核對日與 Maps CTA。
- Constraints：Vite + React + TypeScript + 現有 Tailwind；production 使用已驗證 snapshot、runtime 不需 API key；不新增 UI framework 或地圖 SDK。
- Primary risks：官方欄位名稱含 BOM、`每周`／`每週` 與頓號格式不一致；官方頁面彼此衝突；長許可區域文字；日期時區；Web Share／clipboard 權限；SPA deep link hosting。

## UX States Matrix

| State | Trigger | UI Response | Recovery/Next Action |
|---|---|---|---|
| Loading | public product chunk 尚未下載完成 | 以 skeleton 保留主要內容與結果卡高度；`aria-busy=true` 並提供可讀狀態 | 自動完成，不顯示假進度 |
| Empty | 所選日期＋搜尋沒有 confirmed 或 conflict 候選 | 說明是條件無結果，不說「沒有夜市」 | 清除搜尋或選其他日期 |
| Error (Recoverable) | 分享 API／clipboard 失敗 | CTA 旁 `aria-live` 顯示失敗，內容與導航仍可用 | 手動複製目前網址或重試 |
| Error (Fatal) | generated artifact runtime validation 失敗或 lazy chunk 載入失敗 | 明確說資料暫不可用，不顯示 last-minute 假候選 | 重新載入；仍失敗則查官方來源 |
| Success | evidence current/aging、該日無衝突 | 顯示「依正常週期有營業」與來源核對日 | 開啟詳情、Maps 或分享 |
| Disabled/Pending | Web Share 正在處理 | 按鈕 disabled、文字「準備分享…」 | 成功後恢復；失敗顯示 recovery |
| Partial/Degraded | stale、來源更新時間未知、特定日期有衝突 | 不使用 confirmed 綠色；分組到「需再確認」並解釋影響 | 開原始來源或 Maps 再確認 |

## Visual Direction

- 延續 Travel 的暖米色底、深海軍藍文字與珊瑚橘單一 action accent；不用 neon 或大面積 hero image。
- 首屏以 `max-w-6xl`、16/24/32px spacing cadence；手機 390×844 在第一屏可看見日期控制與第一個候選。
- 卡片使用 1px slate border、8–16px radius、極輕 shadow；confirmed、conflict、stale 以文字＋icon＋邊框共同表達，不只靠顏色。
- 標題 32–48px，結果名稱 20–24px，metadata 14–16px；長許可區域可在卡片截斷，但詳情完整換行。
- motion 只用 150–200ms focus／hover；遵守 `prefers-reduced-motion`，不做自動輪播或 decorative reveal。

## Component Contracts

### `ProductRouter`

- `/`、`/market/:id`：lazy-load `TrustedApp`；`/lab`、`/style/*`：lazy-load 原 prototype。
- lazy failure 由 fatal error boundary 接住；loading fallback 必須有語意與保留版面。

### `TrustedApp`

- 輸入：已通過 runtime validation 的 generated dataset；production 不在 client fetch 官方 API。
- URL 是日期、搜尋與 selected market 的 source of truth；back/forward 必須還原。
- 每次 route 變更更新 document title、canonical path 與主內容 focus，不靜默 fallback 無效 market ID。

### `DatePicker`

- 顯示臺北時區今天起七天；每個 native button 有完整日期 accessible name 與 `aria-pressed`。
- 選取後更新 `?date=YYYY-MM-DD`，不只保存 weekday。

### `MarketDecisionCard`

- 必填：name、scheduleDays、permittedArea、decision、verifiedAt、source count。
- `confirmed`、`conflict`、`stale`、`unknown` 是互斥 variant；不得由任意色彩字串組合。
- primary action 是詳情；Maps 置於詳情，避免卡片有多個同權重 CTA。

### `EvidencePanel`

- 每個影響 schedule 判斷的值列出 publisher、source link、retrievedAt、sourceUpdatedAt 或 unknown、verifiedAt。
- conflict 先列「哪一天有分歧」，再列兩個原始值；不自行宣布勝方。

### `ShareAction`

- 優先 `navigator.share`，其次 clipboard；pending 時 disabled。
- 成功／失敗訊息透過 `aria-live=polite`；失敗不影響導航。

## File Plan

Create：

- `scripts/sync-tainan-night-markets.mjs`：fetch／file input、schema/profile、normalization、snapshot、checksum、artifact、`--check`。
- `data/sources/tainan/*.json`：immutable official raw snapshot。
- `data/curation/tainan-schedule-conflicts.json`：可稽核的官方來源衝突，不是 mock。
- `src/data/generated/tainan-night-markets.json`：production artifact。
- `src/product/marketData.ts`、`date.ts`、`TrustedApp.tsx` 與 focused tests。
- `src/ProductRouter.tsx`：public product 與 legacy lab 邊界。

Edit：

- `src/main.tsx`：使用 `ProductRouter`。
- `src/index.css`：focus、skip link、product surface 與 print/reduced-motion 細節。
- `index.html`：預設語系與 truthful metadata。
- `package.json`、`README.md`：資料檢查、產品定位與可重現指令。

Explicitly not touched：

- 不重寫或刪除 `src/App.tsx`、19 筆 prototype data、既有 screenshots 與 hero asset；它們只退到 lab route。
- 不加入 Maps SDK、Google Places、帳號、analytics、server 或 credential。
