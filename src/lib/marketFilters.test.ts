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
    nearestStation: "Songshan Station",
    walkingMinutes: 2,
    highlights: ["Temple gate", "Pepper buns"],
    recommendedFoods: ["Pepper buns", "Herbal ribs"],
    practicalInfo: ["Go before 19:00 for shorter lines"],
    source: {
      label: "Fallback fixture",
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
    nearestStation: "Feng Chia University stop",
    walkingMinutes: 4,
    highlights: ["Large student crowd", "Snack alleys"],
    recommendedFoods: ["Fried chicken", "Bubble tea"],
    practicalInfo: ["Use buses or taxi from high-speed rail"],
    source: {
      label: "Fallback fixture",
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
