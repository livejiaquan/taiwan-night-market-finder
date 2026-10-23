# 品牌標記與 icon 清單

## 品牌標記
- `mark.svg`：64×64，圓角 22%（rx 14.08），實心 `#C4302B`（HSL 2°, 64%, 47%），中間是白色 Lucide `store`，佔 58%，stroke 2。
- `favicon.svg`：與 `mark.svg` 同一份內容（`public/favicon.svg`）。
- `apple-touch-icon.png`：180×180，由同一個 SVG 以 Playwright 輸出，方角滿版（iOS 會自行裁圓角）。
- 頁首：32px 標記，右邊 10px 是站名（16px／600，字距 −0.01em）與副標（12px／500，次文字色）。取代原本的「市」字方塊。深色模式下標記顏色不變。

## Icon 規則
全站 UI icon 只用 Lucide（`lucide-react`，ISC），`stroke-width` 由 `src/index.css` 的 `.lucide { stroke-width: 1.75 }` 統一；尺寸只用 16／20／24。

| 用途 | Lucide 名稱 | 尺寸 |
|---|---|---|
| 搜尋膠囊 | `search` | 20 |
| 清除搜尋 | `x` | 20 |
| 語言切換 | `languages` | 16 |
| 深色／淺色切換 | `moon`／`sun` | 20 |
| 日期 legend（詳情） | `calendar-days` | 16 |
| 判斷徽章：依週期有營業／需再確認／過期或無法判斷 | `check-circle-2`／`triangle-alert`／`clock-3` | 16 |
| 名冊比對新鮮度 | `shield-check` | 16；詳情頁證據標題 24 |
| 資料範圍與新鮮度、證據來源 | `database` | 20 |
| 行政區、許可路段 | `map-pin` | 16 |
| 提示框（無效行政區、例外說明） | `info` | 20 |
| 過期／衝突警示 | `triangle-alert` | 20 |
| 空結果、找不到夜市 | `circle-alert` | 24 |
| 外部連結 | `external-link` | 16 |
| 查看依據、回到清單 | `chevron-right`／`arrow-left` | 16／20 |
| Google Maps 導航 | `navigation`、`arrow-up-right` | 20、16 |
| 分享 | `share-2` | 20 |
| 頁尾「隱私、可近用性與已知限制」展開 | `chevron-down` | 20 |

所有尺寸都由原本的 13–38px 收斂到 16／20／24（≤17→16、18–21→20、≥22→24）。

## 被替換或移除的手繪圖形
- 頁首「市」字方塊（CSS `.lantern-mark`）→ 品牌標記 `mark.svg`，CSS 已刪除。
- 舊 favicon（手繪夜市攤位圖形，5 種顏色）→ 品牌標記。
- `src/App.tsx` 的 `<svg>` 是 `/lab` 舊原型的臺灣地圖資料圖（依座標畫點與區塊），不是 icon，所以保留；`/lab` 為 noindex 頁，不在公共首頁出現。

## GitHub 露出
- 移除頁尾「回報資料或產品問題（需要 GitHub 登入）」（issues/new）。
- 原本連到 repo 內 `docs/PUBLIC_OPERABILITY.md` 的「隱私、可近用性與已知限制」，內容改寫成頁尾可展開區塊（中英文），並拿掉 GitHub 相關句子；資料更正改為請洽原始提供機關。
- 頁尾加「© 2026 Lim Jia Quan」，不加連結。
