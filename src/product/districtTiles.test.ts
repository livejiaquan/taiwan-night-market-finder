import { describe, expect, it } from "vitest";
import { districtDataset } from "./districtData";
import { DISTRICT_TILE_COLUMNS, DISTRICT_TILE_ROWS, districtTiles } from "./districtTiles";

describe("district tile cartogram", () => {
  it("places every official district exactly once and nothing else", () => {
    const official = districtDataset.districts.map((district) => district.shortName).sort();
    expect(Object.keys(districtTiles).sort()).toEqual(official);
  });

  it("never stacks two districts on the same tile", () => {
    const cells = Object.values(districtTiles).map(({ col, row }) => {
      expect(col).toBeGreaterThanOrEqual(0);
      expect(col).toBeLessThan(DISTRICT_TILE_COLUMNS);
      expect(row).toBeGreaterThanOrEqual(0);
      expect(row).toBeLessThan(DISTRICT_TILE_ROWS);
      return `${col},${row}`;
    });
    expect(new Set(cells).size).toBe(cells.length);
  });
});
