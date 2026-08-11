# Trust-first Roadmap

本 roadmap 以 outcome gate 控制擴張，不以完成頁面或增加筆數當成功。

## Phase 0 — 證據與邊界（本 iteration）

目標：停止目前會造成白跑的 public claim，建立可被測試的信任契約。

交付：

- 固定產品使命、beachhead、anti-goals 與 kill criteria；
- 建立 field-level provenance、freshness、conflict 與 fallback 契約；
- 保存 baseline browser evidence 與已知資料衝突；
- 在獨立 branch 進行 data-first pivot。

Gate：Mission/Outcome Guardian 只允許進入臺南窄切片，不允許把現有首頁部署成公共產品。

## Phase 1 — 臺南「依正常週期今晚有營業」垂直切片

目標：陌生手機使用者可在 30 秒內做出正確、可追溯並可導航的選擇。

資料：

- 對接[臺南市已取得設置許可夜市名冊](https://data.gov.tw/dataset/53634)；
- 保存 raw snapshot、checksum、擷取時間與 parser version；
- 驗證 record ID、名稱、許可區域與正常營業日；
- critical fields 產生 field-level evidence；
- 對已知官方來源衝突顯示 conflict，不合併成假精確值；
- 同步失敗時保留 last-known-good，但依 age 自動降級。

產品：

- public root 直接進入單一 Travel 產品，不再先看版本比較；
- 預設選取臺北時區的今天，標題使用「依正常週期」；
- 首屏顯示日期、資料邊界、今日候選與需再確認數量；
- 卡片顯示正常營業日、許可區域、欄位來源狀態與核對日期；
- 以官方 district-code reference 顯示行政區，並提供 optional exact-code filter；這只能縮小集合，不能當附近／距離／推薦或改寫 schedule decision；
- 詳情提供一鍵 Maps 搜尋導航與可重現 share URL；
- 保留中／英文、search、day filter、deep link；
- 原本比較頁與 alternate visual 留在明確標記的非公共 lab route。

品質：

- mobile first，鍵盤、focus、screen reader 與 reduced motion 可用；
- loading、empty、invalid route、data error、stale、conflict 狀態可重現並有測試；
- title、description、canonical、Open Graph、Twitter、robots、sitemap 與 custom-domain 設定可重現；
- production build 不需要 credential，SPA route 有部署 fallback；
- 真實瀏覽器走完今日選擇、日期切換、搜尋、詳情、來源與 Maps CTA，console 無阻斷錯誤。
- market `adminCode` 與 37-row official district reference 必須 100% exact join；district reference 超過 365 天 fail closed，與 schedule freshness 分開。

Release gate：

- 所有 [DATA_TRUST_CONTRACT.md](./DATA_TRUST_CONTRACT.md) invariants 通過；
- focused tests、typecheck、lint、production build、mobile browser 與 accessibility audit 通過；
- 獨立 code/data review 無 P0/P1；
- Mission Guardian post-review 從 RED 升至至少 AMBER，且沒有已知錯誤被標成 confirmed。

## Phase 2 — 四週 maintenance proof 與真實使用者驗證

目標：證明產品不只在交付日正確，而且能被一位維護者長期維持。

- 每週執行 source diff、freshness 與 dead-link check；
- 在完整 raw SHA-256 之外產生 normalized data semantic hash／diff，避免官方 API 每次隨機 envelope ID 被誤判為資料內容異動；
- 記錄同步失敗、上游 schema drift、衝突與人工處理時間；
- 建立不需帳號即可提出更正的管道，72 小時內分流、7 日內關閉或標記未決；
- 做至少兩輪、每輪 5 位目標使用者的 mobile task test；
- 第一輪採 paired baseline／行政區 control 測試；若不達 4/5 於 30 秒內完成、0 誤解 nearby/live、且時間改善至少 25%，移除行政區 control而不以其他策展排序補洞；
- 測量 30 秒任務成功率、信任狀態理解率、導航／分享轉換；
- pilot coverage 固定為目前官方名冊 32 筆，不在此階段加入第二資料源；若列冊項目不符合一般認知，保留資料但不強迫全部進主結果。

Gate：維護成本 ≤ 2 小時／週、任務成功率 ≥ 80%、狀態理解率 ≥ 90%、無 P0 資料誤導，才可進入第二縣市。

## Phase 3 — 只依證據擴張

若 Phase 2 通過，依以下順序評估：

1. 加入有結構化正常營業日與可追溯 record 的縣市；
2. 共用 schema adapters，但每個 source 有獨立 parser、fixture 與 freshness policy；
3. 只有在官方資料支持時加入 exact hours、座標或例外事件；
4. 先驗證導航／分享與回訪，再考慮個人化、收藏或通知。

不以「全臺」作時間承諾。每新增一個縣市都要重新過 data trust、maintenance cost 與 user outcome gate。

## Stop / pivot criteria

- 已知錯誤仍以 confirmed 出現：停止 release；
- 無法在一位維護者、每週 2 小時內維持 freshness：縮小 coverage；
- 500 次合格使用後導航／分享 < 20% 且 28 日回訪 < 10%：停止 standalone 擴張，評估提供可信資料元件／API；
- 使用者測試顯示 provenance 不影響決策且造成明顯負擔：保留可查證層，簡化首頁呈現；
- 官方 source 不能合法再利用、關鍵欄位技術上無法取得，或需 credential 才能維持：依既定 escalation 格式請求決策，不以 mock 填補。
