import { readFile } from "node:fs/promises";
import process from "node:process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  APPROVED_ROW_COUNT,
  OFFICIAL_SOURCE,
  assertOfficialSource,
  buildArtifact,
  checkCommittedArtifact,
  parseArgs,
  parseOfficialPayload,
  parseSchedule,
  semanticDiff,
  semanticHash,
} from "./sync-tainan-night-markets.mjs";

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  "data/sources/tainan/2026-08-09T15-34-35-999Z-0791a872c818.json",
);

async function officialPayload() {
  const snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8"));
  return JSON.parse(snapshot.rawBody);
}

async function curation() {
  return JSON.parse(
    await readFile(resolve(process.cwd(), "data/curation/tainan-schedule-conflicts.json"), "utf8"),
  );
}

describe("Tainan official source parser", () => {
  it("normalizes 每週, 每周, compact, and delimiter forms", () => {
    expect(parseSchedule("每週三五六")).toEqual(["Wed", "Fri", "Sat"]);
    expect(parseSchedule("每周四六日")).toEqual(["Thu", "Sat", "Sun"]);
    expect(parseSchedule("每週二、六")).toEqual(["Tue", "Sat"]);
    expect(parseSchedule("每周 一，五 ")).toEqual(["Mon", "Fri"]);
  });

  it("fails closed on unknown, empty, or duplicate schedules", () => {
    expect(() => parseSchedule("週三、六")).toThrow(/Unsupported schedule format/);
    expect(() => parseSchedule("每週")).toThrow(/Unsupported schedule format/);
    expect(() => parseSchedule("每週三三")).toThrow(/Duplicate weekday/);
    expect(() => parseSchedule("每週三和六")).toThrow(/Unsupported weekday token/);
  });

  it("profiles the reviewed live snapshot", async () => {
    const payload = await officialPayload();
    const parsed = parseOfficialPayload(JSON.stringify(payload));
    expect(parsed.profile).toMatchObject({
      rowCount: APPROVED_ROW_COUNT,
      uniqueRecordIds: true,
      uniqueNames: true,
    });
    expect(parsed.rows.find((row) => row.name === "武聖夜市")?.scheduleDays).toEqual([
      "Wed",
      "Fri",
      "Sat",
    ]);
  });

  it("ignores random official envelope IDs but reports normalized record changes", async () => {
    const baseline = await officialPayload();
    const envelopeOnly = JSON.parse(JSON.stringify(baseline));
    envelopeOnly.id = "random-envelope-id";
    expect(semanticHash(JSON.stringify(envelopeOnly))).toBe(semanticHash(JSON.stringify(baseline)));
    expect(semanticDiff(JSON.stringify(baseline), JSON.stringify(envelopeOnly))).toMatchObject({
      hasMeaningfulChange: false,
      changed: [],
    });

    const changed = JSON.parse(JSON.stringify(baseline));
    changed.data[0]["營業時間"] = "每週一二";
    expect(semanticDiff(JSON.stringify(baseline), JSON.stringify(changed))).toMatchObject({
      hasMeaningfulChange: true,
      changed: [{ recordId: "1", fields: ["scheduleDays"] }],
    });
  });

  it("rejects zero rows and reviewed volume drift", async () => {
    const empty = await officialPayload();
    empty.data = [];
    expect(() => parseOfficialPayload(JSON.stringify(empty))).toThrow(/zero rows/);

    const missing = await officialPayload();
    missing.data.pop();
    expect(() => parseOfficialPayload(JSON.stringify(missing))).toThrow(/row-count drift/);
  });

  it("rejects schema drift, duplicate IDs, bad admin codes, and bad schedules", async () => {
    const schemaDrift = await officialPayload();
    delete schemaDrift.data[0]["營業時間"];
    expect(() => parseOfficialPayload(JSON.stringify(schemaDrift))).toThrow(/schema drift/);

    const duplicate = await officialPayload();
    duplicate.data[1].Seq = duplicate.data[0].Seq;
    expect(() => parseOfficialPayload(JSON.stringify(duplicate))).toThrow(/Duplicate official record ID/);

    const badAdminCode = await officialPayload();
    badAdminCode.data[0]["﻿地址-行政區域代碼"] = "63000000";
    expect(() => parseOfficialPayload(JSON.stringify(badAdminCode))).toThrow(/Tainan code/);

    const badSchedule = await officialPayload();
    badSchedule.data[0]["營業時間"] = "不定期";
    expect(() => parseOfficialPayload(JSON.stringify(badSchedule))).toThrow(
      /Unsupported schedule format/,
    );
  });

  it("rebuilds the artifact exactly from the immutable snapshot and curation", async () => {
    const artifact = await checkCommittedArtifact();
    expect(artifact.profile.rowCount).toBe(APPROVED_ROW_COUNT);
    expect(artifact.source.sourceUpdatedAt).toBeNull();
  });

  it("rejects future retrieval timestamps instead of extending freshness", async () => {
    const future = "2099-01-01T00:00:00Z";
    expect(() => parseArgs(["--retrieved-at", future])).toThrow(/must not be in the future/);

    const payload = await officialPayload();
    const reviewedCuration = await curation();
    expect(() =>
      buildArtifact({
        rawBody: JSON.stringify(payload),
        retrievedAt: future,
        snapshotPath: "data/sources/tainan/future.json",
        curation: reviewedCuration,
      }),
    ).toThrow(/must not be in the future/);
  });

  it("rejects ambiguous, impossible, or timezone-less provenance timestamps", () => {
    for (const invalid of [
      "08/09/2026",
      "2026-02-30",
      "2026-08-09T15:34:35",
    ]) {
      expect(() => parseArgs(["--retrieved-at", invalid])).toThrow(/ISO|calendar date/);
    }
  });

  it("rejects a snapshot that relabels the approved source", () => {
    expect(() =>
      assertOfficialSource({
        ...OFFICIAL_SOURCE,
        endpointUrl: "https://example.test/not-the-approved-source",
      }),
    ).toThrow(/does not match the approved official source/);
  });
});
