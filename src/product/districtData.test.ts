import { describe, expect, it } from "vitest";
import { marketDataset } from "./marketData";
import {
  DISTRICT_REFERENCE_MAX_AGE_DAYS,
  districtDataset,
  getDistrict,
  getDistrictReferenceAgeDays,
  pilotDistricts,
  validateDistrictDataset,
} from "./districtData";

describe("official Tainan district reference", () => {
  it("loads the reviewed 37-code reference and covers every pilot market", () => {
    expect(districtDataset.profile).toEqual({
      rowCount: 37,
      uniqueCodes: true,
      uniqueNames: true,
    });
    expect(pilotDistricts).toHaveLength(19);
    for (const market of marketDataset.markets) {
      const district = getDistrict(market.adminCode);
      expect(district.evidence).toMatchObject({
        field: "districtName",
        value: district.fullName,
        recordId: market.adminCode,
        sourceId: "tainan-district-codes",
        method: "official_dataset",
      });
    }
  });

  it("keeps official code-to-name mappings exact", () => {
    expect(getDistrict("67000320")).toMatchObject({
      fullName: "臺南市東區",
      shortName: "東區",
    });
    expect(getDistrict("67000350")).toMatchObject({
      fullName: "臺南市安南區",
      shortName: "安南區",
    });
    expect(() => getDistrict("67000999")).toThrow(/Unknown official Tainan district code/);
  });

  it("fails closed for source, code, lineage, and review-window drift", () => {
    const duplicateCode = JSON.parse(JSON.stringify(districtDataset)) as {
      districts: Array<Record<string, unknown>>;
    };
    duplicateCode.districts[1].code = duplicateCode.districts[0].code;
    expect(() => validateDistrictDataset(duplicateCode)).toThrow(/reviewed code sequence/);

    const missingLineage = JSON.parse(JSON.stringify(districtDataset)) as {
      districts: Array<{ evidence: Record<string, unknown> }>;
    };
    missingLineage.districts[0].evidence.recordId = "67000999";
    expect(() => validateDistrictDataset(missingLineage)).toThrow(/official lineage/);

    const relabeledSource = JSON.parse(JSON.stringify(districtDataset)) as {
      source: Record<string, unknown>;
    };
    relabeledSource.source.publisher = "not the official publisher";
    expect(() => validateDistrictDataset(relabeledSource)).toThrow(/source identity/);

    const afterWindow = new Date(
      Date.parse(districtDataset.source.retrievedAt) +
        (DISTRICT_REFERENCE_MAX_AGE_DAYS + 1) * 24 * 60 * 60 * 1000,
    );
    expect(() => validateDistrictDataset(districtDataset, afterWindow)).toThrow(/review window/);
  });

  it("keeps future provenance and age calculations fail-closed", () => {
    expect(getDistrictReferenceAgeDays(districtDataset.source.retrievedAt, districtDataset.source.retrievedAt)).toBe(0);
    expect(() =>
      getDistrictReferenceAgeDays("2099-01-01T00:00:00Z", "2026-08-11T00:00:00Z"),
    ).toThrow(/must not be in the future/);
  });
});
