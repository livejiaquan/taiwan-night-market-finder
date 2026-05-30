import { describe, expect, it } from "vitest";
import { filterNightMarkets, getFilterOptions } from "./marketFilters";
import type { NightMarket, NightMarketFilters } from "../types";

const markets: NightMarket[] = [
  {
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
    nearestStation: { zh: "松山車站", en: "Songshan Station" },
    walkingMinutes: 2,
    highlights: [
      { zh: "廟口", en: "Temple gate" },
      { zh: "胡椒餅", en: "Pepper buns" },
    ],
    recommendedFoods: [
      { zh: "胡椒餅", en: "Pepper buns" },
      { zh: "藥燉排骨", en: "Herbal ribs" },
    ],
    practicalInfo: [{ zh: "19:00 前去人比較少", en: "Go before 19:00 for shorter lines" }],
    source: {
      label: { zh: "備援樣本", en: "Fallback fixture" },
      url: "https://data.gov.tw/",
      confidence: "fallback",
    },
  },
  {
    id: "fengjia",
    name: "Fengjia Night Market",
    localName: "逢甲夜市",
    city: "Taichung",
    district: "Xitun",
    address: "Wenhua Road, Xitun District",
    coordinates: { lat: 24.1794, lng: 120.6465 },
    openingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    hours: "16:00-01:00",
    moods: ["student", "late-night"],
    foodTypes: ["fried chicken", "tea"],
    transport: ["bus"],
    nearestStation: { zh: "逢甲大學站", en: "Feng Chia University stop" },
    walkingMinutes: 4,
    highlights: [
      { zh: "學生人潮多", en: "Large student crowd" },
      { zh: "小吃巷弄", en: "Snack alleys" },
    ],
    recommendedFoods: [
      { zh: "雞排", en: "Fried chicken" },
      { zh: "珍珠奶茶", en: "Bubble tea" },
    ],
    practicalInfo: [{ zh: "從高鐵搭公車或計程車", en: "Use buses or taxi from high-speed rail" }],
    source: {
      label: { zh: "備援樣本", en: "Fallback fixture" },
      url: "https://data.gov.tw/",
      confidence: "fallback",
    },
  },
];

describe("filterNightMarkets", () => {
  it("matches query text across English names, local names, city, district, and foods", () => {
    const result = filterNightMarkets(markets, { query: "胡椒" });

    expect(result.map((market) => market.id)).toEqual(["raohe"]);
  });

  it("matches English food queries against bilingual data", () => {
    const result = filterNightMarkets(markets, { query: "pepper buns" });

    expect(result.map((market) => market.id)).toEqual(["raohe"]);
  });

  it("matches Chinese enum labels for city, food, and transport", () => {
    expect(filterNightMarkets(markets, { query: "台北" }).map((market) => market.id)).toEqual([
      "raohe",
    ]);
    expect(filterNightMarkets(markets, { query: "手搖飲" }).map((market) => market.id)).toEqual([
      "fengjia",
    ]);
    expect(filterNightMarkets(markets, { query: "捷運" }).map((market) => market.id)).toEqual([
      "raohe",
    ]);
  });

  it("combines city, day, mood, food, and transport filters", () => {
    const filters: NightMarketFilters = {
      city: "Taipei",
      openingDay: "Sat",
      mood: "classic",
      foodType: "pepper buns",
      transport: "MRT",
      query: "",
    };

    const result = filterNightMarkets(markets, filters);

    expect(result.map((market) => market.id)).toEqual(["raohe"]);
  });

  it("returns all markets when every filter is unset", () => {
    expect(filterNightMarkets(markets, {}).map((market) => market.id)).toEqual([
      "raohe",
      "fengjia",
    ]);
  });
});

describe("getFilterOptions", () => {
  it("deduplicates and sorts available filters for controls", () => {
    expect(getFilterOptions(markets)).toMatchObject({
      cities: ["Taichung", "Taipei"],
      moods: ["classic", "food-first", "late-night", "student"],
      foodTypes: ["fried chicken", "pepper buns", "seafood", "tea"],
      transport: ["bus", "MRT", "rail"],
    });
  });
});
