# Static Deployment Runbook

## Prerequisites

- Node 22（或 `package.json` engines 範圍內版本）與 lockfile-aware `npm ci`；
- 已決定的 HTTPS production domain；
- 能設定 SPA rewrites、cache headers、DNS 與 TLS 的 static host；
- 不需要 API key、database 或 server runtime。

## Build and verify

```bash
npm ci
npm run verify
npm run deploy:metadata -- --site-url https://your-real-domain.example
```

`deploy:metadata` 必須在 `build` 後執行，會：

- 將 `dist/index.html` 的 canonical 與 `og:url` 改為實際 HTTPS origin；
- 依 generated artifact 產生 root＋每筆 market deep link 的 `dist/sitemap.xml`；
- 為每筆 market 產生 crawler 可直接讀取的 title、description、canonical 與 OG/Twitter HTML shell；
- 產生 market route 優先、最後才回 root SPA 的 `dist/_redirects`；
- 為 `/lab` 與 `/style/*` 產生 crawler 可直接讀取的 `noindex,nofollow` shell；
- 產生含 absolute sitemap URL 的 `dist/robots.txt`。

它不改 source tree，也拒絕沒有 `--site-url` 或非 HTTPS URL。

## Host contract

- document root：`dist/`；
- `/market/:id` 先 rewrite 到對應 `/market/:id/index.html`，其他不存在的檔案路徑才 rewrite 到 `/index.html`，HTTP 200；
- `/assets/*`：可用 content hash 長期 cache；
- `/index.html`、`/robots.txt`、`/sitemap.xml`：短 cache 或 revalidate；
- 強制 HTTPS，TLS 自動續期；
- `www` 與 apex 只保留一個 canonical，其餘 301；
- 不在 host 注入 sample data、環境 secret 或第三方 tracking。

## GitHub Pages

此 repository 使用 GitHub Pages project site，Vite base 固定為 `/taiwan-night-market-finder/`。`deploy-pages.yml` 僅在 `main` push 或手動觸發時部署，使用 GitHub 的短期 `GITHUB_TOKEN` 權限，不讀取或儲存任何 secret。

- public routes 與 hashed assets 會加上 project-site base；不可改成 root-relative asset URL；
- `public/404.html` 會將 GitHub Pages 無法 rewrite 的深連結安全還原成 app route，例如 `/taiwan-night-market-finder/market/:id`；
- GitHub Pages 不支援此 repo 的 `_redirects` 規則；部署後仍需直接開啟 root 與一個 `/market/:id` deep link 驗證。

`public/_redirects` 已涵蓋支援 Netlify-style redirect file 的 host。若 host 不支援，需用該平台等價的 SPA rewrite；未驗證前不可只因 root 回 200 就宣稱 deep link 可用。

Vite 的本機 `preview` 不會模擬 host 的 `_redirects` 規則：它可驗證 SPA 與 `/market/:id/` 目錄內的 crawler shell，但不能證明 production 的無尾斜線 rewrite。正式上線後必須直接請求實際網域的 `/market/:id`，確認回傳 HTML 在 JavaScript 執行前已包含該市場的 title、canonical 與 `og:url`。

## Pre-release browser checks

至少在 production output／preview 驗證：

1. `/` 預設為臺北今天，已知未排班夜市不出現在 confirmed；
2. Friday 的花園夜市顯示 conflict，Sunday 為 confirmed；
3. `/market/tainan-licensed-5?date=2026-08-14` 可直接載入且不被改成別筆；
4. 無效 market ID 顯示 not-found，不 silent fallback；
5. mobile 390×844、tablet、desktop 的日期、搜尋、卡片、evidence 與 CTA；
6. keyboard skip link、日期按鈕、搜尋、詳情、Maps、share 的 focus path；
7. loading、empty、fatal error、share error 與 stale／conflict degraded states；
8. console、network 與 server log 沒有阻斷錯誤；
9. `title`、description、canonical、Open Graph、JSON-LD、robots 與 sitemap 指向實際 domain；
10. 官方來源與 license link 可開啟，Maps CTA 明示 name-based search。

## Rollback and stale data

- Deploy 使用 committed last-known-good snapshot；上游暫時斷線不會讓 build 換成 mock。
- 若新 data sync 或 UI release 出現 P0 誤導，回滾上一個已通過 gate 的 deployment artifact。
- Snapshot `verifiedAt > 90 days` 時 UI 必須自動降級，不可因回滾而恢復 confirmed 綠色。
- 回滾不刪除 raw snapshots；以 Git history、SHA-256 與 parser version追溯。

## Domain and credential boundary

Repository 不保存 DNS token、host token 或 private key。沒有使用者選定的 host/domain 與 credential 時，可以完成 production build、preview 與 metadata script dry run，但不能建立 DNS、TLS 或宣稱 custom domain 已上線。
