import { describe, expect, it } from "vitest";
import {
  formatMarketTitle,
  getStyleCopy,
  labelCity,
  labelConfidence,
  labelDay,
  labelTag,
  uiCopy,
} from "./i18n";
import type { NightMarket } from "../types";

const market = {
  name: "Raohe Street Night Market",
  localName: "饒河街觀光夜市",
  city: "Taipei",
  district: "Songshan",
  source: {
    confidence: "curated",
  },
} as NightMarket;

describe("i18n display helpers", () => {
  it("provides explicit version labels for the retained visual directions", () => {
    expect(getStyleCopy("neon", "zh")).toMatchObject({
      version: "版本 1",
      name: "霓虹夜市版",
    });
    expect(getStyleCopy("travel", "zh")).toMatchObject({
      version: "版本 2",
      name: "現代旅遊指南版",
    });
  });

  it("switches market title priority by locale", () => {
    expect(formatMarketTitle(market, "en")).toEqual({
      primary: "Raohe Street Night Market",
      secondary: "饒河街觀光夜市",
      location: "Taipei / Songshan",
    });

    expect(formatMarketTitle(market, "zh")).toEqual({
      primary: "饒河街觀光夜市",
      secondary: "Raohe Street Night Market",
      location: "台北 / 松山",
    });
  });

  it("translates repeated filter and metadata labels in Chinese mode", () => {
    expect(uiCopy.zh.searchPlaceholder).toBe("搜尋城市、夜市、美食、捷運...");
    expect(uiCopy.zh.comparisonCta).toBe("比較 2 個版本");
    expect(uiCopy.zh.viewingDetails).toBe("正在查看");
    expect(labelCity("Kaohsiung", "zh")).toBe("高雄");
    expect(labelTag("pepper buns", "zh")).toBe("胡椒餅");
    expect(labelTag("late-night", "zh")).toBe("深夜場");
    expect(labelConfidence("official", "zh")).toBe("官方資料");
    expect(labelDay("Sat", "zh")).toBe("六");
  });
});
