# 資料信任契約

本文件定義產品可以對使用者做出的資料承諾。UI、資料同步腳本與測試都必須遵守；視覺上的綠色、勾號或「已確認」不能超過下列證據。

## 1. Claim boundary

產品第一階段只回答：

> 依指定官方名冊的正常週期資料，這個夜市是否排定在所選日期營業？

它不回答「現在現場是否已開門」，也不推論天候、臨時停業、搬遷、節慶加開或個別攤商營業情況。

可顯示為「依正常週期今日有營業」的必要條件：

1. `scheduleDays` 明確包含所選星期；
2. 至少一個未過期、非 unknown 的官方營業日 evidence 直接支持所選日期；欄位整體可以保留其他日期的 conflict，但不能影響這一天；
3. 未超過 hard-stale 門檻；
4. 沒有未解決、會改變當日判斷的來源衝突。

任一條不成立，狀態只能是「需再確認」「資料衝突」或「未知」，不得用正向 confirmed 樣式。

## 2. 欄位層級 evidence

每個會影響出發決策的欄位需獨立記錄：

```ts
type EvidenceStatus = 'verified' | 'conflict' | 'stale' | 'unknown';
type EvidenceMethod = 'official_dataset' | 'official_page' | 'derived';

interface FieldEvidence {
  field: 'name' | 'scheduleDays' | 'permittedArea' | 'navigationQuery';
  value: unknown;
  status: EvidenceStatus;
  method: EvidenceMethod;
  sourceId: string;
  sourceUrl: string;
  recordId: string | null;
  retrievedAt: string;
  sourceUpdatedAt: string | null;
  verifiedAt: string;
  note?: string;
}
```

規則：

- `sourceUpdatedAt` 只有上游明確提供時才填；不得拿本次下載時間冒充。
- `verifiedAt` 是本產品完成 schema、值與衝突檢查的時間，不等於現場確認。
- `derived` 必須列出 derivation；例如 Maps 查詢字串可由名稱與許可區域組成，但不能被描述成官方座標。
- source 支持哪些欄位，就只替那些欄位背書；市場本身不設 `official: true`。
- 來源缺值必須保留 `null`／`unknown`，不能用策展文字補成看似精確的值。

## 3. Freshness policy

正常營業週期的 freshness 依 `verifiedAt` 計算：

- `0–30` 天：current；
- `31–90` 天：aging，仍可顯示但附核對日期；
- `>90` 天：hard stale，不得進入正向今日候選；
- upstream 抓取失敗不覆蓋最後有效 snapshot；失敗由執行該同步的 CI／job log 留存，不為了寫失敗狀態而改動 last-known-good artifact；
- 上游沒有 `sourceUpdatedAt` 時明示「來源未提供更新時間」，不得以 current 標籤掩蓋。

門檻是第一階段可測試的維護假設；四週 maintenance proof 後依變更率調整，不能只因維護不便而放寬。

## 4. Conflict policy

- 同一欄位有兩個官方來源且會改變出發決策時，保留兩個值與各自 evidence，狀態為 `conflict`。
- 不採「最新頁面一定勝出」：來源更新日、法規角色與發布目的可能不同。
- conflict 在 UI 中需先說明影響（例如「週五是否營業有衝突」），再提供來源連結。
- conflict 若會改變所選日期判斷，未解決前不得出現在 confirmed 集合，只能出現在「需再確認」；若兩來源對所選日期一致，可確認該日並繼續揭露其他日期的分歧。

已知例子：臺南花園夜市的許可名冊與觀光頁面對週五的描述不同，因此不能靜默合併成四天。

## 5. Snapshot 與失敗模式

正式資料路徑：

```text
official endpoint
  -> immutable raw snapshot + checksum + retrievedAt
  -> schema validation
  -> normalization with explicit parser version
  -> field-level evidence + conflict detection
  -> generated public artifact
  -> UI claim policy
```

- build 不直接依賴政府 endpoint 是否在線；部署使用已驗證且已提交的 snapshot。
- 同步失敗、零筆、欄位改名、重複 record ID 或無法解析營業日時，pipeline 必須 fail closed，不覆寫有效 artifact。
- last-known-good 可作 fallback，但 UI 仍依 age 降級；超過 hard-stale 後不再給正向今日結論。
- sample/mock fixture 只存在 test path，不能進 production artifact。

## 6. 導航、時間與位置

- 第一階段的導航使用名稱＋官方許可區域組成 Maps search query；這是 derived query，不是經官方驗證的經緯度。
- 未有支持 exact clock hours 的來源時，只顯示營業星期；不得沿用 repository 內手工填寫的精確開收攤時間。
- UI 必須提醒 Maps 或現場資訊可能比名冊更新，並讓使用者在出發前再確認。

## 7. Attribution 與授權

- 每個 source 頁顯示提供機關、資料集名稱、原始連結、擷取時間與授權。
- 政府資料依[政府資料開放授權條款第 1 版](https://data.gov.tw/license)使用；正式頁面與 README 都需保留顯著出處。
- 第三方來源需逐一確認使用條款；未確認前不納入 production artifact。

## 8. Release invariants

任何 release 必須自動或人工驗證：

- 100% critical fields 有完整 evidence；
- 解析後筆數不為零，record ID 唯一，所有星期值合法；
- selected date 與顯示集合一致；
- stale／unknown，或會改變所選日期判斷的 conflict，不會取得 confirmed 視覺；
- raw checksum、parser version、artifact generation time 可追溯；
- source links 可開啟，attribution 不藏在只對開發者可見的位置。
