import { describe, expect, it } from "vitest";
import { getMarketInsight } from "./marketInsights";
import type { NightMarket } from "../types";

const market = {
  id: "raohe",
  name: "Raohe Street Night Market",
  localName: "饒河街觀光夜市",
  city: "Taipei",
  district: "Songshan",
  address: "Raohe Street, Songshan District",
  coordinates: { lat: 25.0509, lng: 121.5777 },
  openingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  hours: "17:00-00:00",
  moods: ["classic", "food-first"],
  foodTypes: ["pepper buns", "seafood"],
  transport: ["MRT", "rail"],
  nearestStation: "Songshan Station",
  walkingMinutes: 2,
  highlights: ["Ciyou Temple entrance", "Linear one-street route"],
  recommendedFoods: ["pepper buns", "herbal soup", "oyster omelet"],
  practicalInfo: ["Start from Songshan Station and walk toward Ciyou Temple."],
  source: {
    label: "Tourism reference",
    url: "https://example.com",
    confidence: "curated",
  },
} satisfies NightMarket;

describe("getMarketInsight", () => {
  it("builds localized detail sections from the shared market model", () => {
    expect(getMarketInsight(market, "zh")).toMatchObject({
      planLabel: "今晚玩法",
      timingTitle: "抵達節奏",
      localTipTitle: "在地提醒",
    });

    expect(getMarketInsight(market, "zh").plan).toContain("胡椒餅");
    expect(getMarketInsight(market, "zh").timing).toContain("2 分鐘");
    expect(getMarketInsight(market, "en").foodMission).toContain("pepper buns");
  });
});
