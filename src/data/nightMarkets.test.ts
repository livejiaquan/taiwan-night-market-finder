import { describe, expect, it } from "vitest";
import { nightMarkets } from "./nightMarkets";
import { labelTag } from "../lib/i18n";

const bilingualListFields = ["highlights", "recommendedFoods", "practicalInfo"] as const;

describe("nightMarkets bilingual content", () => {
  it("provides non-empty zh and en for every highlight, recommended food, and practical-info item", () => {
    for (const market of nightMarkets) {
      for (const field of bilingualListFields) {
        for (const item of market[field]) {
          expect(item, `${market.id}.${field}`).toHaveProperty("zh");
          expect(item, `${market.id}.${field}`).toHaveProperty("en");
          expect(item.zh.trim().length, `${market.id}.${field}.zh empty`).toBeGreaterThan(0);
          expect(item.en.trim().length, `${market.id}.${field}.en empty`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("provides a bilingual nearestStation for every market", () => {
    for (const market of nightMarkets) {
      expect(market.nearestStation, market.id).toHaveProperty("zh");
      expect(market.nearestStation.zh.trim().length, `${market.id} station zh empty`).toBeGreaterThan(0);
      expect(market.nearestStation.en.trim().length, `${market.id} station en empty`).toBeGreaterThan(0);
    }
  });

  it("never leaks raw English into the Chinese field (zh differs from en)", () => {
    for (const market of nightMarkets) {
      for (const highlight of market.highlights) {
        expect(highlight.zh, `${market.id} highlight not translated: ${highlight.en}`).not.toBe(
          highlight.en,
        );
      }
      for (const food of market.recommendedFoods) {
        expect(food.zh, `${market.id} food not translated: ${food.en}`).not.toBe(food.en);
      }
      for (const info of market.practicalInfo) {
        expect(info.zh, `${market.id} practical not translated: ${info.en}`).not.toBe(info.en);
      }
      expect(
        market.nearestStation.zh,
        `${market.id} station not translated: ${market.nearestStation.en}`,
      ).not.toBe(market.nearestStation.en);
    }
  });
});

describe("nightMarkets enum tags have Chinese translations", () => {
  it("every mood and foodType resolves to a non-identical zh label", () => {
    for (const market of nightMarkets) {
      for (const tag of [...market.moods, ...market.foodTypes]) {
        expect(labelTag(tag, "zh"), `missing zh translation for tag: ${tag}`).not.toBe(tag);
      }
    }
  });
});
