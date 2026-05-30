import type { FilterOptions, NightMarket, NightMarketFilters, OpeningDay } from "../types";
import { labelCity, labelDistrict, labelTag, labelTransport } from "./i18n";

const openingDays: OpeningDay[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const normalize = (value: string) => value.trim().toLocaleLowerCase();

const queryAliases: Record<string, string[]> = {
  胡椒: ["pepper", "pepper buns"],
  胡椒餅: ["pepper", "pepper buns"],
  雞排: ["fried chicken", "chicken cutlet"],
  蚵仔: ["oyster", "oyster omelet"],
  海鮮: ["seafood"],
  珍奶: ["bubble tea", "tea"],
  滷味: ["braised"],
  臭豆腐: ["stinky tofu"],
  捷運: ["mrt"],
  火車: ["rail", "station"],
  公車: ["bus"],
  飲料: ["tea"],
};

const expandQuery = (query: string) => {
  if (!query) {
    return [];
  }

  const aliases = Object.entries(queryAliases)
    .filter(([key]) => query.includes(normalize(key)))
    .flatMap(([, values]) => values.map(normalize));

  return [query, ...aliases];
};

const includesNormalized = (values: string[], target?: string) => {
  if (!target) {
    return true;
  }

  const normalizedTarget = normalize(target);
  return values.some((value) => normalize(value) === normalizedTarget);
};

const marketText = (market: NightMarket) =>
  [
    market.name,
    market.localName,
    market.city,
    labelCity(market.city, "zh"),
    market.district,
    labelDistrict(market.district, "zh"),
    market.address,
    market.nearestStation.zh,
    market.nearestStation.en,
    ...market.moods,
    ...market.moods.map((mood) => labelTag(mood, "zh")),
    ...market.foodTypes,
    ...market.foodTypes.map((food) => labelTag(food, "zh")),
    ...market.transport,
    ...market.transport.map((transport) => labelTransport(transport, "zh")),
    ...market.highlights.flatMap((item) => [item.zh, item.en]),
    ...market.recommendedFoods.flatMap((item) => [item.zh, item.en]),
    ...market.practicalInfo.flatMap((item) => [item.zh, item.en]),
  ]
    .join(" ")
    .toLocaleLowerCase();

export function filterNightMarkets(
  markets: NightMarket[],
  filters: NightMarketFilters,
): NightMarket[] {
  const query = normalize(filters.query ?? "");
  const queryTerms = expandQuery(query);

  return markets.filter((market) => {
    const searchableText = marketText(market);
    const matchesQuery =
      queryTerms.length === 0 || queryTerms.some((term) => searchableText.includes(term));
    const matchesCity = !filters.city || market.city === filters.city;
    const matchesMood = includesNormalized(market.moods, filters.mood);
    const matchesFood = includesNormalized(market.foodTypes, filters.foodType);
    const matchesTransport = includesNormalized(market.transport, filters.transport);
    const matchesDay =
      !filters.openingDay || market.openingDays.includes(filters.openingDay);

    return (
      matchesQuery &&
      matchesCity &&
      matchesMood &&
      matchesFood &&
      matchesTransport &&
      matchesDay
    );
  });
}

const uniqueSorted = (values: string[]) =>
  Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "en"));

export function getFilterOptions(markets: NightMarket[]): FilterOptions {
  return {
    cities: uniqueSorted(markets.map((market) => market.city)),
    moods: uniqueSorted(markets.flatMap((market) => market.moods)),
    foodTypes: uniqueSorted(markets.flatMap((market) => market.foodTypes)),
    transport: uniqueSorted(markets.flatMap((market) => market.transport)),
    openingDays,
  };
}

export function countActiveFilters(filters: NightMarketFilters) {
  return Object.values(filters).filter(Boolean).length;
}
