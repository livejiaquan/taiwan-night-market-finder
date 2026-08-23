import type { OpeningDay } from "./marketData";

export const dayLabels: Record<"zh" | "en", Record<OpeningDay, string>> = {
  zh: {
    Mon: "週一",
    Tue: "週二",
    Wed: "週三",
    Thu: "週四",
    Fri: "週五",
    Sat: "週六",
    Sun: "週日",
  },
  en: {
    Mon: "Mon",
    Tue: "Tue",
    Wed: "Wed",
    Thu: "Thu",
    Fri: "Fri",
    Sat: "Sat",
    Sun: "Sun",
  },
};

export function scheduleText(days: OpeningDay[], locale: "zh" | "en") {
  return days.map((day) => dayLabels[locale][day]).join(locale === "zh" ? "、" : ", ");
}
