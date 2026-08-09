import { describe, expect, it } from "vitest";
import {
  addIsoDays,
  formatCompactDate,
  getDateChoices,
  getScheduleDay,
  getTaipeiToday,
  isIsoDate,
} from "./date";

describe("Taipei decision dates", () => {
  it("uses Asia/Taipei rather than the browser machine date", () => {
    expect(getTaipeiToday(new Date("2026-08-09T15:59:59Z"))).toBe("2026-08-09");
    expect(getTaipeiToday(new Date("2026-08-09T16:00:00Z"))).toBe("2026-08-10");
  });

  it("maps stable date-only values to schedule weekdays", () => {
    expect(getScheduleDay("2026-08-09")).toBe("Sun");
    expect(getScheduleDay("2026-08-10")).toBe("Mon");
    expect(formatCompactDate("2026-08-09", "zh")).toBe("8/9");
    expect(formatCompactDate("2026-08-09", "en")).toBe("8/9");
  });

  it("builds a seven-day choice without daylight-saving drift", () => {
    expect(getDateChoices("2026-12-29")).toEqual([
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
      "2027-01-04",
    ]);
    expect(addIsoDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("rejects impossible or ambiguous dates", () => {
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("08/09/2026")).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });
});
