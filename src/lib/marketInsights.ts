import type { Locale, NightMarket } from "../types";
import { labelDay, labelPhrase, labelTag } from "./i18n";

export interface MarketInsight {
  planLabel: string;
  plan: string;
  foodMissionTitle: string;
  foodMission: string;
  timingTitle: string;
  timing: string;
  bestForTitle: string;
  bestFor: string;
  localTipTitle: string;
  localTip: string;
}

const joinList = (items: string[], locale: Locale) => {
  if (items.length <= 1) {
    return items[0] ?? "";
  }

  if (locale === "zh") {
    return items.join("、");
  }

  return items.length === 2
    ? items.join(" and ")
    : `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

const labelFood = (value: string, locale: Locale) => {
  const phrase = labelPhrase(value, locale);
  return phrase === value ? labelTag(value, locale) : phrase;
};

export function getMarketInsight(market: NightMarket, locale: Locale): MarketInsight {
  const foods = market.recommendedFoods.slice(0, 3).map((food) => labelFood(food, locale));
  const tags = [...market.moods.slice(0, 2), ...market.foodTypes.slice(0, 1)].map((tag) =>
    labelTag(tag, locale),
  );
  const days = market.openingDays.map((day) => labelDay(day, locale));
  const highlight = labelPhrase(market.highlights[0] ?? market.address, locale);
  const practicalTip = labelPhrase(market.practicalInfo[0] ?? market.address, locale);

  if (locale === "zh") {
    return {
      planLabel: "今晚玩法",
      plan: `先鎖定${foods[0] ?? "招牌小吃"}，第二站接${foods[1] ?? "在地小吃"}，再用「${highlight}」當集合點慢慢往主攤位吃。`,
      foodMissionTitle: "美食任務",
      foodMission: `${joinList(foods, locale)} 排成一條路線，比只看評分更容易逛出節奏。`,
      timingTitle: "抵達節奏",
      timing: `營業日 ${joinList(days, locale)}；從 ${market.nearestStation} 步行 ${market.walkingMinutes} 分鐘，建議抓 90 分鐘慢慢逛。`,
      bestForTitle: "適合情境",
      bestFor: joinList(tags, locale),
      localTipTitle: "在地提醒",
      localTip: practicalTip,
    };
  }

  return {
    planLabel: "Tonight strategy",
    plan: `Start with ${foods[0] ?? "the signature snack"}, keep ${foods[1] ?? "a local classic"} for the second stop, then use "${highlight}" as the anchor while you branch into the main lanes.`,
    foodMissionTitle: "Food mission",
    foodMission: `Try ${joinList(foods, locale)} before switching lanes so the visit feels like a route, not a random snack list.`,
    timingTitle: "Visit timing",
    timing: `Open ${joinList(days, locale)}; ${market.walkingMinutes} min from ${market.nearestStation}. Plan about 90 minutes for a relaxed food crawl.`,
    bestForTitle: "Best for",
    bestFor: joinList(tags, locale),
    localTipTitle: "Local tip",
    localTip: practicalTip,
  };
}
