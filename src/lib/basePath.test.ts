import { describe, expect, it } from "vitest";
import { getAppLocation } from "./basePath";

describe("GitHub Pages base-path restoration", () => {
  it("removes the project-site base while retaining route and query", () => {
    const location = new URL(
      "https://livejiaquan.github.io/taiwan-night-market-finder/market/tainan-licensed-5?date=2026-08-14&q=%E6%AD%A6%E8%81%96",
    );

    expect(getAppLocation(location, "/taiwan-night-market-finder")).toEqual({
      pathname: "/market/tainan-licensed-5",
      search: "?date=2026-08-14&q=%E6%AD%A6%E8%81%96",
    });
  });

  it("restores a GitHub Pages 404 handoff without treating p as product state", () => {
    const location = new URL(
      "https://livejiaquan.github.io/taiwan-night-market-finder/?p=%2Fmarket%2Ftainan-licensed-5%3Fdate%3D2026-08-14",
    );

    expect(getAppLocation(location, "/taiwan-night-market-finder")).toEqual({
      pathname: "/market/tainan-licensed-5",
      search: "?date=2026-08-14",
    });
  });
});
