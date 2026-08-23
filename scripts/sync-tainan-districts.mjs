#!/usr/bin/env node

import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import process from "node:process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL, URL } from "node:url";

export const DISTRICT_DATASET_ID = "tainan-district-codes";
export const DISTRICT_PARSER_VERSION = "tainan-district-codes-v1";
export const APPROVED_DISTRICT_COUNT = 37;
export const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;
export const LIVE_FETCH_TIMEOUT_MS = 15_000;

export const DISTRICT_OFFICIAL_SOURCE = Object.freeze({
  sourceId: DISTRICT_DATASET_ID,
  publisher: "臺南市政府研究發展考核委員會",
  datasetName: "臺南市各區代碼",
  datasetUrl:
    "https://data.tainan.gov.tw/DataSet/Detail/70d961d2-9f38-4112-847d-907b436820ab",
  endpointUrl:
    "https://soa.tainan.gov.tw/Api/Service/Get/5b389f60-dee6-425a-8a40-f5cb2f949cf1",
  licenseName: "政府資料開放授權條款－第1版",
  licenseUrl: "https://data.gov.tw/license",
});

const moduleUrl = new URL(import.meta.url);
const REPO_ROOT =
  moduleUrl.protocol === "file:"
    ? fileURLToPath(new URL("../", moduleUrl))
    : process.cwd();
const SNAPSHOT_DIRECTORY = resolve(REPO_ROOT, "data/sources/tainan-districts");
const ARTIFACT_PATH = resolve(
  REPO_ROOT,
  "src/data/generated/tainan-districts.json",
);
const EXPECTED_ROOT_KEYS = [
  "contentType",
  "data",
  "errorCode",
  "id",
  "isImage",
  "message",
  "size",
  "success",
];
const EXPECTED_ROW_KEYS = ["Seq", "AreaName", "AreaCode"];
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertExactKeys(value, expectedKeys, context) {
  assert(isPlainObject(value), `${context} must be an object`);
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${context} schema drift: expected [${expected.join(", ")}], received [${actual.join(", ")}]`,
  );
}

function assertNonEmptyString(value, context) {
  assert(
    typeof value === "string" && value.trim().length > 0,
    `${context} must be a non-empty string`,
  );
  return value.trim();
}

function assertIsoTimestamp(value, context) {
  assertNonEmptyString(value, context);
  const isDateOnly = ISO_DATE_PATTERN.test(value);
  assert(
    isDateOnly || ISO_TIMESTAMP_PATTERN.test(value),
    `${context} must be an ISO 8601 date or timestamp with timezone`,
  );
  const parsed = Date.parse(value);
  assert(!Number.isNaN(parsed), `${context} must be a valid ISO date or timestamp`);
  if (isDateOnly) {
    assert(
      new Date(parsed).toISOString().slice(0, 10) === value,
      `${context} must be a real calendar date`,
    );
  }
  return value;
}

function taipeiDateAt(timestamp) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function assertNotFutureTimestamp(value, context, now = Date.now()) {
  assertIsoTimestamp(value, context);
  const beyondClockSkew = ISO_DATE_PATTERN.test(value)
    ? value > taipeiDateAt(now + MAX_FUTURE_CLOCK_SKEW_MS)
    : Date.parse(value) > now + MAX_FUTURE_CLOCK_SKEW_MS;
  assert(
    !beyondClockSkew,
    `${context} must not be in the future beyond ${MAX_FUTURE_CLOCK_SKEW_MS / 60000} minutes of clock skew`,
  );
  return value;
}

function assertHttpUrl(value, context) {
  const stringValue = assertNonEmptyString(value, context);
  let parsed;
  try {
    parsed = new URL(stringValue);
  } catch {
    throw new Error(`${context} must be a valid URL`);
  }
  assert(parsed.protocol === "https:", `${context} must use https`);
  return stringValue;
}

export function assertDistrictOfficialSource(
  value,
  context = "snapshot.source",
) {
  assertExactKeys(value, Object.keys(DISTRICT_OFFICIAL_SOURCE), context);
  for (const [field, expected] of Object.entries(DISTRICT_OFFICIAL_SOURCE)) {
    assert(
      value[field] === expected,
      `${context}.${field} does not match the approved official source`,
    );
  }
}

export function districtSha256(rawBody) {
  return createHash("sha256").update(Buffer.from(rawBody, "utf8")).digest("hex");
}

function expectedCodeForSequence(sequence) {
  return `6700${String(sequence * 10).padStart(4, "0")}`;
}

export function parseDistrictPayload(rawBody) {
  assertNonEmptyString(rawBody, "official district response body");
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    throw new Error(
      `Official district response is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  assertExactKeys(payload, EXPECTED_ROOT_KEYS, "official district response");
  assert(payload.success === true, "Official district response success must be true");
  assert(payload.errorCode === 0, "Official district response errorCode must be 0");
  assert(Array.isArray(payload.data), "Official district response data must be an array");
  assert(
    payload.data.length === APPROVED_DISTRICT_COUNT,
    `Official district row-count drift: approved ${APPROVED_DISTRICT_COUNT}, received ${payload.data.length}`,
  );

  const codes = new Set();
  const fullNames = new Set();
  const districts = payload.data.map((row, index) => {
    const context = `official district row ${index + 1}`;
    assertExactKeys(row, EXPECTED_ROW_KEYS, context);
    const expectedSequence = index + 1;
    assert(
      row.Seq === expectedSequence,
      `${context}.Seq must preserve the reviewed 1–${APPROVED_DISTRICT_COUNT} order`,
    );
    const code = assertNonEmptyString(row.AreaCode, `${context}.AreaCode`);
    assert(
      /^6700\d{4}$/u.test(code),
      `${context}.AreaCode must be an eight-digit Tainan code beginning 6700`,
    );
    assert(
      code === expectedCodeForSequence(expectedSequence),
      `${context}.AreaCode changed from the reviewed official sequence`,
    );
    assert(!codes.has(code), `Duplicate official district code: ${code}`);
    codes.add(code);

    const fullName = assertNonEmptyString(row.AreaName, `${context}.AreaName`);
    assert(
      /^臺南市.+區$/u.test(fullName),
      `${context}.AreaName must be a full 臺南市…區 name`,
    );
    assert(!fullNames.has(fullName), `Duplicate official district name: ${fullName}`);
    fullNames.add(fullName);
    const shortName = fullName.slice("臺南市".length);
    assertNonEmptyString(shortName, `${context}.shortName`);

    return {
      sequence: expectedSequence,
      code,
      fullName,
      shortName,
    };
  });

  return {
    payload,
    districts,
    profile: {
      rowCount: districts.length,
      uniqueCodes: codes.size === districts.length,
      uniqueNames: fullNames.size === districts.length,
    },
  };
}

function semanticDistricts(rawBody) {
  return parseDistrictPayload(rawBody).districts
    .map(({ sequence, code, fullName, shortName }) => ({ sequence, code, fullName, shortName }))
    .sort((left, right) => left.sequence - right.sequence);
}

export function districtSemanticHash(rawBody) {
  return districtSha256(JSON.stringify(semanticDistricts(rawBody)));
}

export function districtSemanticDiff(previousRawBody, nextRawBody) {
  const previous = semanticDistricts(previousRawBody);
  const next = semanticDistricts(nextRawBody);
  const previousByCode = new Map(previous.map((row) => [row.code, row]));
  const nextByCode = new Map(next.map((row) => [row.code, row]));
  const added = next.filter((row) => !previousByCode.has(row.code)).map((row) => row.code);
  const removed = previous.filter((row) => !nextByCode.has(row.code)).map((row) => row.code);
  const changed = next.flatMap((row) => {
    const prior = previousByCode.get(row.code);
    if (!prior) return [];
    const fields = Object.keys(row).filter(
      (field) => field !== "code" && JSON.stringify(row[field]) !== JSON.stringify(prior[field]),
    );
    return fields.length ? [{ code: row.code, fields }] : [];
  });
  return {
    previousSemanticHash: districtSha256(JSON.stringify(previous)),
    nextSemanticHash: districtSha256(JSON.stringify(next)),
    changed,
    added,
    removed,
    hasMeaningfulChange: added.length > 0 || removed.length > 0 || changed.length > 0,
  };
}

function makeDistrictEvidence(district, retrievedAt) {
  return {
    field: "districtName",
    value: district.fullName,
    status: "verified",
    method: "official_dataset",
    sourceId: DISTRICT_OFFICIAL_SOURCE.sourceId,
    sourceLabel: DISTRICT_OFFICIAL_SOURCE.datasetName,
    publisher: DISTRICT_OFFICIAL_SOURCE.publisher,
    sourceUrl: DISTRICT_OFFICIAL_SOURCE.endpointUrl,
    recordId: district.code,
    retrievedAt,
    sourceUpdatedAt: null,
    verifiedAt: retrievedAt,
    note: `官方行政區代碼 ${district.code} 對應 ${district.fullName}；只用於 exact district filter，不代表距離或附近。`,
  };
}

export function buildDistrictArtifact({ rawBody, retrievedAt, snapshotPath }) {
  assertNotFutureTimestamp(retrievedAt, "retrievedAt");
  const parsed = parseDistrictPayload(rawBody);
  const rawSha256 = districtSha256(rawBody);
  return {
    schemaVersion: 1,
    datasetId: DISTRICT_DATASET_ID,
    parserVersion: DISTRICT_PARSER_VERSION,
    generatedAt: retrievedAt,
    source: {
      ...DISTRICT_OFFICIAL_SOURCE,
      snapshotPath,
      rawSha256,
      retrievedAt,
      sourceUpdatedAt: null,
    },
    profile: parsed.profile,
    districts: parsed.districts.map((district) => ({
      ...district,
      evidence: makeDistrictEvidence(district, retrievedAt),
    })),
  };
}

function validateArtifactSource(source) {
  assertExactKeys(
    source,
    [
      ...Object.keys(DISTRICT_OFFICIAL_SOURCE),
      "snapshotPath",
      "rawSha256",
      "retrievedAt",
      "sourceUpdatedAt",
    ],
    "generated district artifact.source",
  );
  const approvedSource = Object.fromEntries(
    Object.keys(DISTRICT_OFFICIAL_SOURCE).map((key) => [key, source[key]]),
  );
  assertDistrictOfficialSource(approvedSource, "generated district artifact.source identity");
  const snapshotPath = assertNonEmptyString(
    source.snapshotPath,
    "generated district artifact.source.snapshotPath",
  );
  assert(
    snapshotPath.startsWith("data/sources/tainan-districts/") &&
      !snapshotPath.includes(".."),
    "Generated district snapshotPath must stay inside data/sources/tainan-districts",
  );
  assert(
    typeof source.rawSha256 === "string" && /^[a-f0-9]{64}$/u.test(source.rawSha256),
    "Generated district rawSha256 must be SHA-256 hex",
  );
  assertNotFutureTimestamp(
    source.retrievedAt,
    "generated district artifact.source.retrievedAt",
  );
  assert(
    source.sourceUpdatedAt === null,
    "District API has no sourceUpdatedAt; it must stay null",
  );
}

function validateDistrictEvidence(evidence, district, retrievedAt) {
  assertExactKeys(
    evidence,
    [
      "field",
      "value",
      "status",
      "method",
      "sourceId",
      "sourceLabel",
      "publisher",
      "sourceUrl",
      "recordId",
      "retrievedAt",
      "sourceUpdatedAt",
      "verifiedAt",
      "note",
    ],
    `${district.code}.evidence`,
  );
  assert(evidence.field === "districtName", `${district.code}.evidence.field mismatch`);
  assert(evidence.value === district.fullName, `${district.code}.evidence.value mismatch`);
  assert(evidence.status === "verified", `${district.code}.evidence must be verified`);
  assert(
    evidence.method === "official_dataset",
    `${district.code}.evidence must use official_dataset method`,
  );
  assert(
    evidence.sourceId === DISTRICT_DATASET_ID,
    `${district.code}.evidence sourceId mismatch`,
  );
  assert(
    evidence.sourceLabel === DISTRICT_OFFICIAL_SOURCE.datasetName,
    `${district.code}.evidence sourceLabel mismatch`,
  );
  assert(
    evidence.publisher === DISTRICT_OFFICIAL_SOURCE.publisher,
    `${district.code}.evidence publisher mismatch`,
  );
  assertHttpUrl(evidence.sourceUrl, `${district.code}.evidence.sourceUrl`);
  assert(evidence.recordId === district.code, `${district.code}.evidence.recordId mismatch`);
  assert(evidence.retrievedAt === retrievedAt, `${district.code}.evidence.retrievedAt mismatch`);
  assert(evidence.verifiedAt === retrievedAt, `${district.code}.evidence.verifiedAt mismatch`);
  assert(evidence.sourceUpdatedAt === null, `${district.code}.evidence.sourceUpdatedAt must be null`);
  assertNonEmptyString(evidence.note, `${district.code}.evidence.note`);
}

export function validateDistrictArtifact(artifact) {
  assertExactKeys(
    artifact,
    [
      "schemaVersion",
      "datasetId",
      "parserVersion",
      "generatedAt",
      "source",
      "profile",
      "districts",
    ],
    "generated district artifact",
  );
  assert(artifact.schemaVersion === 1, "Generated district artifact schemaVersion must be 1");
  assert(artifact.datasetId === DISTRICT_DATASET_ID, "Generated district datasetId mismatch");
  assert(
    artifact.parserVersion === DISTRICT_PARSER_VERSION,
    "Generated district parserVersion mismatch",
  );
  assertNotFutureTimestamp(artifact.generatedAt, "generated district artifact.generatedAt");
  validateArtifactSource(artifact.source);
  assert(
    isPlainObject(artifact.profile) &&
      artifact.profile.rowCount === APPROVED_DISTRICT_COUNT &&
      artifact.profile.uniqueCodes === true &&
      artifact.profile.uniqueNames === true,
    "Generated district profile must preserve the reviewed 37-row unique baseline",
  );
  assert(
    Array.isArray(artifact.districts) && artifact.districts.length === APPROVED_DISTRICT_COUNT,
    `Generated district artifact must contain ${APPROVED_DISTRICT_COUNT} districts`,
  );

  const codes = new Set();
  const names = new Set();
  artifact.districts.forEach((district, index) => {
    const context = `generated district ${index + 1}`;
    assertExactKeys(
      district,
      ["sequence", "code", "fullName", "shortName", "evidence"],
      context,
    );
    assert(district.sequence === index + 1, `${context}.sequence mismatch`);
    assert(
      district.code === expectedCodeForSequence(district.sequence),
      `${context}.code mismatch`,
    );
    assert(!codes.has(district.code), `Duplicate generated district code: ${district.code}`);
    codes.add(district.code);
    assert(/^臺南市.+區$/u.test(district.fullName), `${context}.fullName is invalid`);
    assert(
      district.shortName === district.fullName.slice("臺南市".length),
      `${context}.shortName mismatch`,
    );
    assert(!names.has(district.fullName), `Duplicate generated district name: ${district.fullName}`);
    names.add(district.fullName);
    validateDistrictEvidence(
      district.evidence,
      district,
      artifact.source.retrievedAt,
    );
  });
  return artifact;
}

function snapshotFilename(retrievedAt, rawSha256) {
  const timestamp = retrievedAt.replace(/[^0-9A-Za-z-]/gu, "-").replace(/-+/gu, "-");
  return `${timestamp}-${rawSha256.slice(0, 12)}.json`;
}

function toRepoPath(absolutePath) {
  return relative(REPO_ROOT, absolutePath).split("\\").join("/");
}

async function loadRawInput(inputPath, retrievedAtOption) {
  const absolutePath = resolve(process.cwd(), inputPath);
  const rawInput = await readFile(absolutePath, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(rawInput);
  } catch {
    parsed = null;
  }

  if (isPlainObject(parsed) && parsed.snapshotSchemaVersion === 1 && "rawBody" in parsed) {
    assertExactKeys(
      parsed,
      [
        "snapshotSchemaVersion",
        "source",
        "retrievedAt",
        "sourceUpdatedAt",
        "rawSha256",
        "rawBody",
      ],
      "district input snapshot",
    );
    assertDistrictOfficialSource(parsed.source, "district input snapshot.source");
    assertNotFutureTimestamp(parsed.retrievedAt, "district input snapshot.retrievedAt");
    assert(
      parsed.sourceUpdatedAt === null,
      "district input snapshot.sourceUpdatedAt must be null",
    );
    assert(
      districtSha256(parsed.rawBody) === parsed.rawSha256,
      "District input snapshot checksum does not match rawBody",
    );
    if (retrievedAtOption !== null) {
      assert(
        retrievedAtOption === parsed.retrievedAt,
        "--retrieved-at must match an immutable district snapshot's retrievedAt",
      );
    }
    return { rawBody: parsed.rawBody, retrievedAt: parsed.retrievedAt };
  }

  assert(
    retrievedAtOption !== null,
    "--retrieved-at is required with a raw district --input response",
  );
  return { rawBody: rawInput, retrievedAt: retrievedAtOption };
}

async function fetchLive(retrievedAtOption) {
  const response = await globalThis.fetch(DISTRICT_OFFICIAL_SOURCE.endpointUrl, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(LIVE_FETCH_TIMEOUT_MS),
  });
  assert(
    response.ok,
    `Official district endpoint request failed: HTTP ${response.status} ${response.statusText}`,
  );
  return {
    rawBody: await response.text(),
    retrievedAt: retrievedAtOption ?? new Date().toISOString(),
  };
}

async function writeImmutable(path, contents) {
  await mkdir(dirname(path), { recursive: true });
  try {
    await writeFile(path, contents, { encoding: "utf8", flag: "wx" });
    return "created";
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !Object.hasOwn(error, "code") ||
      error.code !== "EEXIST"
    ) {
      throw error;
    }
    const existing = await readFile(path, "utf8");
    assert(
      existing === contents,
      `Immutable district snapshot already exists with different content: ${path}`,
    );
    return "unchanged";
  }
}

async function writeArtifactAtomic(artifact) {
  await mkdir(dirname(ARTIFACT_PATH), { recursive: true });
  const temporaryPath = `${ARTIFACT_PATH}.tmp-${process.pid}`;
  const contents = `${JSON.stringify(artifact, null, 2)}\n`;
  await writeFile(temporaryPath, contents, { encoding: "utf8", flag: "wx" });
  await rename(temporaryPath, ARTIFACT_PATH);
}

function makeSnapshot(rawBody, retrievedAt) {
  return {
    snapshotSchemaVersion: 1,
    source: DISTRICT_OFFICIAL_SOURCE,
    retrievedAt,
    sourceUpdatedAt: null,
    rawSha256: districtSha256(rawBody),
    rawBody,
  };
}

async function prepareCandidate(rawBody, retrievedAt) {
  assertNotFutureTimestamp(retrievedAt, "retrievedAt");
  const digest = districtSha256(rawBody);
  const snapshotPath = resolve(
    SNAPSHOT_DIRECTORY,
    snapshotFilename(retrievedAt, digest),
  );
  const artifact = buildDistrictArtifact({
    rawBody,
    retrievedAt,
    snapshotPath: toRepoPath(snapshotPath),
  });
  validateDistrictArtifact(artifact);
  return { artifact, snapshotPath, digest };
}

export async function checkCommittedDistrictArtifact() {
  const artifactRaw = await readFile(ARTIFACT_PATH, "utf8");
  const artifact = validateDistrictArtifact(JSON.parse(artifactRaw));
  const snapshotPath = resolve(REPO_ROOT, artifact.source.snapshotPath);
  assert(
    snapshotPath.startsWith(`${SNAPSHOT_DIRECTORY}/`),
    "Generated district snapshotPath must stay inside data/sources/tainan-districts",
  );
  const snapshotRaw = await readFile(snapshotPath, "utf8");
  const snapshot = JSON.parse(snapshotRaw);
  assertExactKeys(
    snapshot,
    [
      "snapshotSchemaVersion",
      "source",
      "retrievedAt",
      "sourceUpdatedAt",
      "rawSha256",
      "rawBody",
    ],
    "committed district snapshot",
  );
  assert(snapshot.snapshotSchemaVersion === 1, "Unsupported district snapshot schemaVersion");
  assertDistrictOfficialSource(snapshot.source, "committed district snapshot.source");
  assert(snapshot.sourceUpdatedAt === null, "District snapshot sourceUpdatedAt must remain null");
  assert(
    districtSha256(snapshot.rawBody) === snapshot.rawSha256,
    "Committed district snapshot raw checksum mismatch",
  );
  assert(
    snapshot.rawSha256 === artifact.source.rawSha256,
    "District artifact raw checksum does not match committed snapshot",
  );
  assert(
    snapshot.retrievedAt === artifact.source.retrievedAt,
    "District artifact retrievedAt does not match committed snapshot",
  );
  const rebuilt = buildDistrictArtifact({
    rawBody: snapshot.rawBody,
    retrievedAt: snapshot.retrievedAt,
    snapshotPath: artifact.source.snapshotPath,
  });
  validateDistrictArtifact(rebuilt);
  assert(
    JSON.stringify(rebuilt) === JSON.stringify(artifact),
    "Generated district artifact is not reproducible from its snapshot",
  );
  return artifact;
}

export function parseDistrictArgs(argv) {
  const options = { input: null, retrievedAt: null, check: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--input") {
      const value = argv[index + 1];
      assert(value !== undefined && !value.startsWith("--"), "--input requires a path");
      options.input = value;
      index += 1;
    } else if (argument === "--retrieved-at") {
      const value = argv[index + 1];
      assert(
        value !== undefined && !value.startsWith("--"),
        "--retrieved-at requires an ISO date or timestamp",
      );
      assertNotFutureTimestamp(value, "--retrieved-at");
      options.retrievedAt = value;
      index += 1;
    } else if (argument === "--check") {
      options.check = true;
    } else if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

function printHelp() {
  process.stdout.write(
    [
      "Usage: node scripts/sync-tainan-districts.mjs [options]",
      "",
      "No options: fetch the official live endpoint, validate, snapshot, and generate.",
      "--input <path>: ingest a saved raw API response or immutable snapshot.",
      "--retrieved-at <ISO>: audit retrieval time; required for raw --input.",
      "--check: offline-validate the committed snapshot and generated artifact.",
      "--check --input <path>: validate a candidate without writing files.",
      "",
    ].join("\n"),
  );
}

export async function runDistrictCli(argv) {
  const options = parseDistrictArgs(argv);
  if (options.help) {
    printHelp();
    return null;
  }

  if (options.check && options.input === null) {
    const artifact = await checkCommittedDistrictArtifact();
    process.stdout.write(
      `${JSON.stringify({
        mode: "check",
        rowCount: artifact.profile.rowCount,
        rawSha256: artifact.source.rawSha256,
        snapshotPath: artifact.source.snapshotPath,
        status: "valid",
      })}\n`,
    );
    return artifact;
  }

  const source =
    options.input === null
      ? await fetchLive(options.retrievedAt)
      : await loadRawInput(options.input, options.retrievedAt);
  const candidate = await prepareCandidate(source.rawBody, source.retrievedAt);

  if (options.check) {
    process.stdout.write(
      `${JSON.stringify({
        mode: "candidate-check",
        rowCount: candidate.artifact.profile.rowCount,
        rawSha256: candidate.digest,
        status: "valid-no-write",
      })}\n`,
    );
    return candidate.artifact;
  }

  const snapshot = makeSnapshot(source.rawBody, source.retrievedAt);
  const snapshotState = await writeImmutable(
    candidate.snapshotPath,
    `${JSON.stringify(snapshot, null, 2)}\n`,
  );
  await writeArtifactAtomic(candidate.artifact);
  process.stdout.write(
    `${JSON.stringify({
      mode: options.input === null ? "live-sync" : "input-sync",
      rowCount: candidate.artifact.profile.rowCount,
      rawSha256: candidate.digest,
      snapshotPath: candidate.artifact.source.snapshotPath,
      snapshotState,
      artifactPath: toRepoPath(ARTIFACT_PATH),
      status: "published",
    })}\n`,
  );
  return candidate.artifact;
}

const isDirectExecution =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  runDistrictCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(
      `[sync-tainan-districts] ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
