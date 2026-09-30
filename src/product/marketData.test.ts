import { describe, expect, it } from "vitest";
import {
  getFreshness,
  getMarketDecision,
  marketDataset,
  validateMarketDataset,
} from "./marketData";

function marketNamed(name: string) {
  const market = marketDataset.markets.find((candidate) => candidate.name === name);
  if (!market) {
    throw new Error(`Missing test market: ${name}`);
  }
  return market;
}

describe("trusted Tainan market dataset", () => {
  it("loads 32 unique, fully evidenced official records", () => {
    expect(marketDataset.profile).toMatchObject({
      rowCount: 32,
      uniqueRecordIds: true,
      uniqueNames: true,
    });
    expect(marketDataset.source.sourceUpdatedAt).toBeNull();
    expect(new Set(marketDataset.markets.map((market) => market.recordId)).size).toBe(32);

    for (const market of marketDataset.markets) {
      expect(market.evidence.adminCode).toMatchObject({
        value: market.adminCode,
        field: "adminCode",
        sourceId: marketDataset.source.sourceId,
        recordId: market.recordId,
      });
      expect(market.evidence.name.value).toBe(market.name);
      expect(market.evidence.permittedArea.value).toBe(market.permittedArea);
      expect(market.evidence.scheduleDays.length).toBeGreaterThan(0);
      expect(market.evidence.navigationQuery).toMatchObject({
        value: market.navigationQuery,
        method: "derived",
        sourceUpdatedAt: null,
      });
      expect(market.evidence.navigationQuery.derivation).toContain("不是官方座標");
    }
  });

  it("keeps the Garden Night Market conflict specific to Friday", () => {
    const garden = marketNamed("花園夜市");
    const current = "2026-08-10T00:00:00+08:00";

    expect(getMarketDecision(garden, "Thu", current).status).toBe("confirmed");
    expect(getMarketDecision(garden, "Fri", current)).toMatchObject({
      status: "conflict",
      scheduledByPrimarySource: false,
      isPositive: false,
      conflict: {
        days: ["Fri"],
      },
    });
    expect(getMarketDecision(garden, "Sat", current).status).toBe("confirmed");
    expect(getMarketDecision(garden, "Sun", current).status).toBe("confirmed");
    expect(garden.evidence.scheduleDays.map((evidence) => evidence.value)).toEqual([
      ["Thu", "Sat", "Sun"],
      ["Thu", "Fri", "Sat", "Sun"],
    ]);
  });

  it("does not treat a non-scheduled Sunday market as a tonight candidate", () => {
    const wusheng = marketNamed("武聖夜市");
    expect(getMarketDecision(wusheng, "Sun", "2026-08-09T23:50:00+08:00")).toMatchObject({
      status: "not-scheduled",
      scheduledByPrimarySource: false,
      isPositive: false,
    });
    expect(wusheng.scheduleDays).toEqual(["Wed", "Fri", "Sat"]);
  });

  it("downgrades scheduled results after the hard-stale threshold", () => {
    const wusheng = marketNamed("武聖夜市");
    const verifiedTime = Date.parse(wusheng.verifiedAt);
    const day91 = new Date(verifiedTime + 91 * 24 * 60 * 60 * 1000);

    expect(getFreshness(wusheng.verifiedAt, day91)).toMatchObject({
      status: "hard-stale",
      ageDays: 91,
    });
    expect(getMarketDecision(wusheng, "Fri", day91)).toMatchObject({
      status: "stale",
      isPositive: false,
      reason: "verification-hard-stale",
    });
    expect(getMarketDecision(wusheng, "Sun", day91)).toMatchObject({
      status: "stale",
      scheduledByPrimarySource: false,
      isPositive: false,
      reason: "verification-hard-stale",
    });
  });

  it("keeps the day-90 boundary usable and rejects future verification", () => {
    const wusheng = marketNamed("武聖夜市");
    const verifiedTime = Date.parse(wusheng.verifiedAt);
    const day90 = new Date(verifiedTime + 90 * 24 * 60 * 60 * 1000);

    expect(getFreshness(wusheng.verifiedAt, day90)).toMatchObject({
      status: "aging",
      ageDays: 90,
    });
    expect(getMarketDecision(wusheng, "Fri", day90).status).toBe("confirmed");
    expect(() =>
      getFreshness("2099-01-01T00:00:00Z", "2026-08-10T00:00:00Z"),
    ).toThrow(/must not be in the future/);
  });

  it("fails runtime validation when a production record loses uniqueness or evidence", () => {
    const duplicate = JSON.parse(JSON.stringify(marketDataset)) as unknown as {
      markets: Array<Record<string, unknown>>;
    };
    duplicate.markets[1] = JSON.parse(JSON.stringify(duplicate.markets[0])) as Record<
      string,
      unknown
    >;
    duplicate.markets[1].id = "duplicate-record-with-unique-route-id";
    expect(() => validateMarketDataset(duplicate)).toThrow(/record IDs must be unique/);

    const missingEvidence = JSON.parse(JSON.stringify(marketDataset)) as unknown as {
      markets: Array<{ evidence: { scheduleDays: unknown[] } }>;
    };
    missingEvidence.markets[0].evidence.scheduleDays = [];
    expect(() => validateMarketDataset(missingEvidence)).toThrow(/scheduleDays must not be empty/);
  });

  it("fails runtime validation for future dataset, market, or evidence timestamps", () => {
    const future = "2099-01-01T00:00:00Z";
    const mutations: Array<(dataset: Record<string, unknown>) => void> = [
      (dataset) => {
        dataset.generatedAt = future;
      },
      (dataset) => {
        (dataset.source as Record<string, unknown>).retrievedAt = future;
      },
      (dataset) => {
        const markets = dataset.markets as Array<Record<string, unknown>>;
        markets[0].verifiedAt = future;
      },
      (dataset) => {
        const markets = dataset.markets as Array<Record<string, unknown>>;
        const evidence = markets[0].evidence as Record<string, Record<string, unknown>>;
        evidence.name.retrievedAt = future;
      },
      (dataset) => {
        const markets = dataset.markets as Array<Record<string, unknown>>;
        const evidence = markets[0].evidence as Record<string, Record<string, unknown>>;
        evidence.name.sourceUpdatedAt = future;
      },
      (dataset) => {
        const markets = dataset.markets as Array<Record<string, unknown>>;
        const evidence = markets[0].evidence as Record<string, Record<string, unknown>>;
        evidence.name.verifiedAt = future;
      },
    ];

    for (const mutate of mutations) {
      const invalid = JSON.parse(JSON.stringify(marketDataset)) as Record<string, unknown>;
      mutate(invalid);
      expect(() => validateMarketDataset(invalid)).toThrow(/must not be in the future/);
    }
  });

  it("fails runtime validation for ambiguous or impossible provenance dates", () => {
    for (const invalidDate of [
      "08/09/2026",
      "2026-02-30",
      "2026-08-09T15:34:35",
    ]) {
      const invalid = JSON.parse(JSON.stringify(marketDataset)) as Record<string, unknown>;
      invalid.generatedAt = invalidDate;
      expect(() => validateMarketDataset(invalid)).toThrow(/ISO|calendar date/);
    }
  });
  it("does not let a fresh record timestamp hide older schedule evidence", () => {
    const market = structuredClone(marketNamed("武聖夜市"));
    market.verifiedAt = "2026-11-10T00:00:00Z";
    expect(getMarketDecision(market, "Fri", "2026-11-10T00:00:00Z")).toMatchObject({
      status: "stale", isPositive: false,
      freshness: { status: "hard-stale", verifiedAt: market.evidence.scheduleDays[0].verifiedAt },
    });
  });

  it("retains stale conflicting-source age even when the primary register is refreshed", () => {
    const market = structuredClone(marketNamed("花園夜市"));
    market.verifiedAt = "2026-11-10T00:00:00Z";
    market.evidence.scheduleDays[0].verifiedAt = market.verifiedAt;
    expect(getMarketDecision(market, "Fri", market.verifiedAt)).toMatchObject({
      status: "conflict", isPositive: false, freshness: { status: "hard-stale" },
    });
    expect(getMarketDecision(market, "Sun", market.verifiedAt)).toMatchObject({
      status: "stale", isPositive: false,
    });
  });

  it("fails closed when schedule verification time is missing", () => {
    const invalid = structuredClone(marketDataset);
    invalid.markets[0].evidence.scheduleDays[0].verifiedAt = "";
    expect(() => validateMarketDataset(invalid)).toThrow(/verifiedAt must be a non-empty string/);
  });

});
