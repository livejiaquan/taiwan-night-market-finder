import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";
import {
  APPROVED_DISTRICT_COUNT,
  DISTRICT_OFFICIAL_SOURCE,
  assertDistrictOfficialSource,
  buildDistrictArtifact,
  checkCommittedDistrictArtifact,
  districtSemanticDiff,
  districtSemanticHash,
  parseDistrictArgs,
  parseDistrictPayload,
} from "./sync-tainan-districts.mjs";

const ARTIFACT_PATH = resolve(
  process.cwd(),
  "src/data/generated/tainan-districts.json",
);

async function committedPayload() {
  const artifact = JSON.parse(await readFile(ARTIFACT_PATH, "utf8"));
  const snapshot = JSON.parse(
    await readFile(resolve(process.cwd(), artifact.source.snapshotPath), "utf8"),
  );
  return JSON.parse(snapshot.rawBody);
}

describe("Tainan official district source parser", () => {
  it("profiles all 37 official codes and reviewed names", async () => {
    const payload = await committedPayload();
    const parsed = parseDistrictPayload(JSON.stringify(payload));

    expect(parsed.profile).toEqual({
      rowCount: APPROVED_DISTRICT_COUNT,
      uniqueCodes: true,
      uniqueNames: true,
    });
    expect(parsed.districts.find(({ code }) => code === "67000320")).toMatchObject({
      sequence: 32,
      fullName: "臺南市東區",
      shortName: "東區",
    });
    expect(parsed.districts.find(({ code }) => code === "67000350")).toMatchObject({
      sequence: 35,
      fullName: "臺南市安南區",
      shortName: "安南區",
    });
  });

  it("ignores random official envelope IDs but reports normalized district changes", async () => {
    const baseline = await committedPayload();
    const envelopeOnly = JSON.parse(JSON.stringify(baseline));
    envelopeOnly.id = "random-envelope-id";
    expect(districtSemanticHash(JSON.stringify(envelopeOnly))).toBe(
      districtSemanticHash(JSON.stringify(baseline)),
    );
    expect(districtSemanticDiff(JSON.stringify(baseline), JSON.stringify(envelopeOnly))).toMatchObject({
      hasMeaningfulChange: false,
      changed: [],
    });

    const changed = JSON.parse(JSON.stringify(baseline));
    changed.data[0].AreaName = "臺南市測試區";
    expect(districtSemanticDiff(JSON.stringify(baseline), JSON.stringify(changed))).toMatchObject({
      hasMeaningfulChange: true,
      changed: [{ code: "67000010", fields: ["fullName", "shortName"] }],
    });
  });

  it("fails closed on row-count, schema, sequence, code, and name drift", async () => {
    const missingRow = await committedPayload();
    missingRow.data.pop();
    expect(() => parseDistrictPayload(JSON.stringify(missingRow))).toThrow(/row-count drift/);

    const schemaDrift = await committedPayload();
    schemaDrift.data[0].unexpected = true;
    expect(() => parseDistrictPayload(JSON.stringify(schemaDrift))).toThrow(/schema drift/);

    const reordered = await committedPayload();
    reordered.data[0].Seq = 2;
    expect(() => parseDistrictPayload(JSON.stringify(reordered))).toThrow(/preserve the reviewed/);

    const changedCode = await committedPayload();
    changedCode.data[0].AreaCode = "67000999";
    expect(() => parseDistrictPayload(JSON.stringify(changedCode))).toThrow(/changed from the reviewed/);

    const invalidName = await committedPayload();
    invalidName.data[0].AreaName = "新營";
    expect(() => parseDistrictPayload(JSON.stringify(invalidName))).toThrow(/full 臺南市/);
  });

  it("rebuilds the artifact exactly from the immutable snapshot", async () => {
    const artifact = await checkCommittedDistrictArtifact();
    expect(artifact.profile.rowCount).toBe(APPROVED_DISTRICT_COUNT);
    expect(artifact.source.sourceUpdatedAt).toBeNull();
    expect(artifact.districts).toHaveLength(APPROVED_DISTRICT_COUNT);
  });

  it("rejects future, ambiguous, impossible, and timezone-less provenance", async () => {
    const payload = await committedPayload();
    const future = "2099-01-01T00:00:00Z";
    expect(() => parseDistrictArgs(["--retrieved-at", future])).toThrow(/must not be in the future/);
    expect(() =>
      buildDistrictArtifact({
        rawBody: JSON.stringify(payload),
        retrievedAt: future,
        snapshotPath: "data/sources/tainan-districts/future.json",
      }),
    ).toThrow(/must not be in the future/);

    for (const invalid of ["08/10/2026", "2026-02-30", "2026-08-10T01:00:00"]) {
      expect(() => parseDistrictArgs(["--retrieved-at", invalid])).toThrow(
        /ISO|calendar date/,
      );
    }
  });

  it("rejects a snapshot that relabels the approved district source", () => {
    expect(() =>
      assertDistrictOfficialSource({
        ...DISTRICT_OFFICIAL_SOURCE,
        endpointUrl: "https://example.test/not-the-approved-source",
      }),
    ).toThrow(/does not match the approved official source/);
  });
});
