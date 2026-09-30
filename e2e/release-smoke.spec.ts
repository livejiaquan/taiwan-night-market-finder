import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const basePath = "/taiwan-night-market-finder";
const marketId = "tainan-licensed-5";

test.describe("GitHub Pages production release smoke", () => {
  test("supports the essential traced-market journey without release-trust regressions", async ({ page }) => {
    const pageErrors: Error[] = [];
    const failedSameOriginRequests: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));
    page.on("requestfailed", (request) => {
      if (new URL(request.url()).origin === new URL(page.url()).origin) {
        failedSameOriginRequests.push(request.url());
      }
    });
    page.on("response", (response) => {
      if (response.status() >= 400 && new URL(response.url()).origin === new URL(page.url()).origin) {
        failedSameOriginRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: async () => Promise.reject(new Error("share unavailable in smoke test")),
      });
    });
    await page.goto(`${basePath}/?date=2026-08-14&q=%E6%AD%A6%E8%81%96`);
    await expect(page.locator('meta[name="night-market-release-health"]')).toHaveAttribute(
      "content",
      "tainan-pilot-v1; static-data-only; no-live-claim",
    );
    await expect(page.getByRole("main")).toContainText("武聖");
    await expect(page.getByText("所選日期現場營業")).toBeVisible();
    await expect(page.getByText("尚未確認", { exact: true })).toBeVisible();
    await expect.poll(() => page.locator("html").evaluate((element) => element.scrollWidth <= window.innerWidth)).toBe(true);

    await page.getByRole("link", { name: "查看依據與導航" }).first().click();
    await expect(page).toHaveURL(new RegExp(`${basePath}/market/${marketId}`));
    await expect(page.getByText("以夜市名稱搜尋，不是官方座標")).toBeVisible();
    await expect(page.getByRole("heading", { name: "出發前先確認" })).toBeVisible();
    await expect(page.getByRole("link", { name: "用 Google Maps 搜尋導航" })).toHaveAttribute(
      "href",
      /google\.com\/maps/u,
    );

    await page.getByRole("button", { name: "分享這個日期與夜市" }).click();
    await expect(page.getByText("無法自動分享，請從瀏覽器網址列複製。" )).toBeVisible();

    await page.getByRole("button", { name: /English|EN/u }).click();
    await expect(page.getByRole("main")).toContainText("Evidence behind this decision");
    await page.getByRole("link", { name: "Back to candidates" }).click();
    await page.getByLabel("District (optional)").selectOption("67000320");
    await page.getByLabel("Search a market or permitted area").fill("東區");
    await expect(page.getByRole("main")).toContainText("Candidates to confirm before leaving");

    await page.setViewportSize({ width: 1440, height: 900 });
    await expect.poll(() => page.locator("html").evaluate((element) => element.scrollWidth <= window.innerWidth)).toBe(true);
    const rootResults = await new AxeBuilder({ page }).analyze();
    expect(rootResults.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
    expect(pageErrors).toEqual([]);
    expect(failedSameOriginRequests).toEqual([]);
  });

  test("loads direct and 404-restored market URLs beneath the project base", async ({ page }) => {
    await page.goto(`${basePath}/market/${marketId}?date=2026-08-14`);
    await expect(page.getByRole("main")).toContainText("武聖");
    const directResults = await new AxeBuilder({ page }).analyze();
    expect(directResults.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);

    await page.goto(`${basePath}/?p=%2Fmarket%2F${marketId}%3Fdate%3D2026-08-14`);
    await expect(page.getByRole("main")).toContainText("這個判斷的資料依據");
  });

  test("keeps keyboard skip navigation visible and honors reduced motion", async ({ page }) => {
    await page.goto(`${basePath}/?date=2026-08-14`);
    await expect(page.getByRole("main")).toBeVisible();
    await page.bringToFront();
    await expect.poll(() => page.evaluate(() => document.hasFocus())).toBe(true);
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: "跳到主要內容" });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
    await expect.poll(() => skipLink.evaluate((element) => getComputedStyle(element).outlineStyle !== "none")).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await expect.poll(() => page.locator(".skip-link").evaluate((element) => {
      const style = getComputedStyle(element);
      return Number.parseFloat(style.transitionDuration) <= 0.01 && style.scrollBehavior === "auto";
    })).toBe(true);
  });
});
