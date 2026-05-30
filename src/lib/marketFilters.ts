import type { FilterOptions, NightMarket, NightMarketFilters, OpeningDay } from "../types";

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
    market.district,
    market.address,
    market.nearestStation,
    ...market.moods,
    ...market.foodTypes,
    ...market.transport,
    ...market.highlights,
    ...market.recommendedFoods,
    ...market.practicalInfo,
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
