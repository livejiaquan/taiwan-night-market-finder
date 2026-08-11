#!/usr/bin/env node

import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import process from "node:process";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL, URL } from "node:url";

export const DATASET_ID = "tainan-licensed-night-markets";
export const PARSER_VERSION = "tainan-license-v2";
export const APPROVED_ROW_COUNT = 32;
export const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

export const OFFICIAL_SOURCE = Object.freeze({
  sourceId: DATASET_ID,
  publisher: "臺南市政府經濟發展局",
  datasetName: "臺南市已取得設置許可夜市名冊",
  datasetUrl: "https://data.gov.tw/dataset/53634",
  endpointUrl:
    "https://soa.tainan.gov.tw/Api/Service/Get/611e74b4-d09a-4712-b421-aa062fd02854",
  licenseName: "政府資料開放授權條款－第1版",
  licenseUrl: "https://data.gov.tw/license",
});

const moduleUrl = new URL(import.meta.url);
const REPO_ROOT =
  moduleUrl.protocol === "file:"
    ? fileURLToPath(new URL("../", moduleUrl))
    : process.cwd();
const CURATION_PATH = resolve(
  REPO_ROOT,
  "data/curation/tainan-schedule-conflicts.json",
);
const SNAPSHOT_DIRECTORY = resolve(REPO_ROOT, "data/sources/tainan");
const ARTIFACT_PATH = resolve(
  REPO_ROOT,
  "src/data/generated/tainan-night-markets.json",
);

const ADMIN_CODE_COLUMN = "\uFEFF地址-行政區域代碼";
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
const EXPECTED_ROW_KEYS = [
  "Seq",
  ADMIN_CODE_COLUMN,
  "夜市名稱",
  "許可路段或區域",
  "營業時間",
];
const DAY_BY_HAN = Object.freeze({
  一: "Mon",
  二: "Tue",
  三: "Wed",
  四: "Thu",
  五: "Fri",
  六: "Sat",
  日: "Sun",
});
const DAY_ORDER = Object.freeze([
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
]);
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

function assertIsoTimestamp(value, context, nullable = false) {
  if (nullable && value === null) {
    return null;
  }
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
  assert(
    parsed.protocol === "https:" || parsed.protocol === "http:",
    `${context} must use http or https`,
  );
  return stringValue;
}

export function assertOfficialSource(value, context = "snapshot.source") {
  assertExactKeys(value, Object.keys(OFFICIAL_SOURCE), context);
  for (const [field, expected] of Object.entries(OFFICIAL_SOURCE)) {
    assert(
      value[field] === expected,
      `${context}.${field} does not match the approved official source`,
    );
  }
}

function canonicalDays(days) {
  assert(Array.isArray(days) && days.length > 0, "scheduleDays must not be empty");
  const unique = new Set();
  for (const day of days) {
    assert(DAY_ORDER.includes(day), `Unknown opening day: ${String(day)}`);
    assert(!unique.has(day), `Duplicate opening day: ${day}`);
    unique.add(day);
  }
  return DAY_ORDER.filter((day) => unique.has(day));
}

export function parseSchedule(rawValue) {
  const raw = assertNonEmptyString(rawValue, "schedule").normalize("NFKC");
  const match = /^每[週周](.+)$/u.exec(raw);
  assert(
    match !== null,
    `Unsupported schedule format: ${raw}. Expected 每週/每周 followed by weekdays.`,
  );

  const compact = match[1].replace(/[\s、，,／/]+/gu, "");
  assert(compact.length > 0, `Schedule has no weekdays: ${raw}`);

  const days = [];
  for (const token of compact) {
    const day = DAY_BY_HAN[token];
    assert(day !== undefined, `Unsupported weekday token "${token}" in schedule: ${raw}`);
    assert(!days.includes(day), `Duplicate weekday token "${token}" in schedule: ${raw}`);
    days.push(day);
  }

  return canonicalDays(days);
}

export function sha256(rawBody) {
  return createHash("sha256").update(Buffer.from(rawBody, "utf8")).digest("hex");
}

export function parseOfficialPayload(rawBody) {
  assertNonEmptyString(rawBody, "official response body");
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    throw new Error(
      `Official response is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  assertExactKeys(payload, EXPECTED_ROOT_KEYS, "official response");
  assert(payload.success === true, "Official response success must be true");
  assert(payload.errorCode === 0, "Official response errorCode must be 0");
  assert(Array.isArray(payload.data), "Official response data must be an array");
  assert(payload.data.length > 0, "Official response returned zero rows; refusing to publish");
  assert(
    payload.data.length === APPROVED_ROW_COUNT,
    `Official row-count drift: approved ${APPROVED_ROW_COUNT}, received ${payload.data.length}`,
  );

  const recordIds = new Set();
  const names = new Set();
  const rows = payload.data.map((row, index) => {
    const rowContext = `official row ${index + 1}`;
    assertExactKeys(row, EXPECTED_ROW_KEYS, rowContext);
    assert(
      Number.isInteger(row.Seq) && row.Seq > 0,
      `${rowContext}.Seq must be a positive integer`,
    );
    const recordId = String(row.Seq);
    assert(!recordIds.has(recordId), `Duplicate official record ID: ${recordId}`);
    recordIds.add(recordId);

    const adminCode = assertNonEmptyString(row[ADMIN_CODE_COLUMN], `${rowContext}.adminCode`);
    assert(
      /^6700\d{4}$/u.test(adminCode),
      `${rowContext}.adminCode must be an eight-digit Tainan code beginning 6700`,
    );

    const name = assertNonEmptyString(row["夜市名稱"], `${rowContext}.name`);
    assert(!names.has(name), `Duplicate official market name: ${name}`);
    names.add(name);

    const permittedArea = assertNonEmptyString(
      row["許可路段或區域"],
      `${rowContext}.permittedArea`,
    );
    const scheduleRaw = assertNonEmptyString(row["營業時間"], `${rowContext}.schedule`);
    const scheduleDays = parseSchedule(scheduleRaw);

    return {
      recordId,
      adminCode,
      name,
      permittedArea,
      scheduleRaw,
      scheduleDays,
    };
  });

  return {
    payload,
    rows,
    profile: {
      rowCount: rows.length,
      requiredColumns: [...EXPECTED_ROW_KEYS],
      uniqueRecordIds: recordIds.size === rows.length,
      uniqueNames: names.size === rows.length,
    },
  };
}

function sameDays(left, right) {
  return JSON.stringify(canonicalDays(left)) === JSON.stringify(canonicalDays(right));
}

function differingDays(left, right) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return DAY_ORDER.filter((day) => leftSet.has(day) !== rightSet.has(day));
}

export function validateCuration(input) {
  assertExactKeys(input, ["schemaVersion", "datasetId", "conflicts"], "curation");
  assert(input.schemaVersion === 1, "Unsupported curation schemaVersion");
  assert(input.datasetId === DATASET_ID, "Curation datasetId does not match");
  assert(Array.isArray(input.conflicts), "Curation conflicts must be an array");

  const conflictIds = new Set();
  const recordIds = new Set();
  for (const conflict of input.conflicts) {
    assertExactKeys(
      conflict,
      [
        "id",
        "recordId",
        "marketName",
        "field",
        "status",
        "days",
        "summaryZh",
        "summaryEn",
        "sources",
      ],
      "curation conflict",
    );
    const conflictId = assertNonEmptyString(conflict.id, "curation conflict.id");
    assert(!conflictIds.has(conflictId), `Duplicate curation conflict ID: ${conflictId}`);
    conflictIds.add(conflictId);
    const recordId = assertNonEmptyString(conflict.recordId, `${conflictId}.recordId`);
    assert(!recordIds.has(recordId), `Multiple schedule conflicts for record ${recordId}`);
    recordIds.add(recordId);
    assertNonEmptyString(conflict.marketName, `${conflictId}.marketName`);
    assert(conflict.field === "scheduleDays", `${conflictId}.field must be scheduleDays`);
    assert(conflict.status === "unresolved", `${conflictId}.status must be unresolved`);
    conflict.days = canonicalDays(conflict.days);
    assertNonEmptyString(conflict.summaryZh, `${conflictId}.summaryZh`);
    assertNonEmptyString(conflict.summaryEn, `${conflictId}.summaryEn`);
    assert(
      Array.isArray(conflict.sources) && conflict.sources.length === 2,
      `${conflictId} must contain exactly two source values`,
    );

    for (const [sourceIndex, source] of conflict.sources.entries()) {
      const context = `${conflictId}.sources[${sourceIndex}]`;
      assertExactKeys(
        source,
        [
          "sourceId",
          "sourceLabel",
          "publisher",
          "sourceUrl",
          "method",
          "recordId",
          "rawValue",
          "value",
          "retrievedAt",
          "sourceUpdatedAt",
          "verifiedAt",
          "note",
        ],
        context,
      );
      assertNonEmptyString(source.sourceId, `${context}.sourceId`);
      assertNonEmptyString(source.sourceLabel, `${context}.sourceLabel`);
      assertNonEmptyString(source.publisher, `${context}.publisher`);
      assertHttpUrl(source.sourceUrl, `${context}.sourceUrl`);
      assert(
        source.method === "official_dataset" || source.method === "official_page",
        `${context}.method must be an official source method`,
      );
      assertNonEmptyString(source.rawValue, `${context}.rawValue`);
      source.value = canonicalDays(source.value);
      assert(
        sameDays(parseSchedule(source.rawValue), source.value),
        `${context}.rawValue does not match parsed value`,
      );
      if (source.sourceId === DATASET_ID) {
        assert(source.recordId === recordId, `${context}.recordId must match conflict record`);
        assert(source.retrievedAt === null, `${context}.retrievedAt must be injected from snapshot`);
        assert(source.sourceUpdatedAt === null, `${context}.sourceUpdatedAt must remain unknown`);
        assert(source.verifiedAt === null, `${context}.verifiedAt must be injected from snapshot`);
      } else {
        assert(source.recordId === null, `${context}.recordId must be null when page has none`);
        assertNotFutureTimestamp(source.retrievedAt, `${context}.retrievedAt`);
        assertNotFutureTimestamp(source.sourceUpdatedAt, `${context}.sourceUpdatedAt`);
        assertNotFutureTimestamp(source.verifiedAt, `${context}.verifiedAt`);
      }
      assertNonEmptyString(source.note, `${context}.note`);
    }

    const expectedDifferences = differingDays(
      conflict.sources[0].value,
      conflict.sources[1].value,
    );
    assert(
      expectedDifferences.length > 0,
      `${conflictId} sources no longer disagree; resolve or remove the curation entry`,
    );
    assert(
      sameDays(conflict.days, expectedDifferences),
      `${conflictId}.days must equal the source-value differences`,
    );
  }

  return input;
}

function makeOfficialEvidence(field, value, row, retrievedAt, status = "verified") {
  return {
    field,
    value,
    status,
    method: "official_dataset",
    sourceId: OFFICIAL_SOURCE.sourceId,
    sourceLabel: OFFICIAL_SOURCE.datasetName,
    publisher: OFFICIAL_SOURCE.publisher,
    sourceUrl: OFFICIAL_SOURCE.endpointUrl,
    recordId: row.recordId,
    retrievedAt,
    sourceUpdatedAt: null,
    verifiedAt: retrievedAt,
  };
}

function makeConflict(row, conflict, retrievedAt) {
  assert(
    conflict.marketName === row.name,
    `${conflict.id} expected market ${conflict.marketName}, received ${row.name}`,
  );
  const primarySource = conflict.sources.find((source) => source.sourceId === DATASET_ID);
  assert(primarySource !== undefined, `${conflict.id} has no official dataset source`);
  assert(
    primarySource.rawValue === row.scheduleRaw,
    `${conflict.id} raw official schedule changed from ${primarySource.rawValue} to ${row.scheduleRaw}`,
  );
  assert(
    sameDays(primarySource.value, row.scheduleDays),
    `${conflict.id} official schedule days changed; manual conflict review required`,
  );

  const sources = conflict.sources.map((source) => ({
    field: "scheduleDays",
    value: canonicalDays(source.value),
    status: "conflict",
    method: source.method,
    sourceId: source.sourceId,
    sourceLabel: source.sourceLabel,
    publisher: source.publisher,
    sourceUrl: source.sourceUrl,
    recordId: source.recordId,
    retrievedAt: source.sourceId === DATASET_ID ? retrievedAt : source.retrievedAt,
    sourceUpdatedAt: source.sourceUpdatedAt,
    verifiedAt: source.sourceId === DATASET_ID ? retrievedAt : source.verifiedAt,
    note: source.note,
  }));

  return {
    id: conflict.id,
    field: "scheduleDays",
    days: canonicalDays(conflict.days),
    status: "unresolved",
    summaryZh: conflict.summaryZh,
    summaryEn: conflict.summaryEn,
    sources,
  };
}

export function buildArtifact({ rawBody, retrievedAt, snapshotPath, curation }) {
  assertNotFutureTimestamp(retrievedAt, "retrievedAt");
  const parsed = parseOfficialPayload(rawBody);
  const checkedCuration = validateCuration(curation);
  const conflictsByRecordId = new Map(
    checkedCuration.conflicts.map((conflict) => [conflict.recordId, conflict]),
  );

  for (const conflictRecordId of conflictsByRecordId.keys()) {
    assert(
      parsed.rows.some((row) => row.recordId === conflictRecordId),
      `Curation references missing record ID: ${conflictRecordId}`,
    );
  }

  const markets = parsed.rows.map((row) => {
    const curatedConflict = conflictsByRecordId.get(row.recordId);
    const conflicts = curatedConflict
      ? [makeConflict(row, curatedConflict, retrievedAt)]
      : [];
    const navigationQuery = `${row.name} ${row.permittedArea} 臺南市`;
    const scheduleEvidence = conflicts.length
      ? conflicts[0].sources
      : [makeOfficialEvidence("scheduleDays", row.scheduleDays, row, retrievedAt)];

    return {
      id: `tainan-licensed-${row.recordId}`,
      recordId: row.recordId,
      city: "臺南市",
      adminCode: row.adminCode,
      name: row.name,
      permittedArea: row.permittedArea,
      scheduleRaw: row.scheduleRaw,
      scheduleDays: row.scheduleDays,
      navigationQuery,
      verifiedAt: retrievedAt,
      evidence: {
        adminCode: makeOfficialEvidence("adminCode", row.adminCode, row, retrievedAt),
        name: makeOfficialEvidence("name", row.name, row, retrievedAt),
        permittedArea: makeOfficialEvidence(
          "permittedArea",
          row.permittedArea,
          row,
          retrievedAt,
        ),
        scheduleDays: scheduleEvidence,
        navigationQuery: {
          field: "navigationQuery",
          value: navigationQuery,
          status: "verified",
          method: "derived",
          sourceId: OFFICIAL_SOURCE.sourceId,
          sourceLabel: OFFICIAL_SOURCE.datasetName,
          publisher: "本產品依官方欄位衍生",
          sourceUrl: OFFICIAL_SOURCE.endpointUrl,
          recordId: row.recordId,
          retrievedAt,
          sourceUpdatedAt: null,
          verifiedAt: retrievedAt,
          derivation: "夜市名稱 + 官方許可路段或區域 + 臺南市；僅作 Maps 搜尋字串，不是官方座標。",
        },
      },
      conflicts,
    };
  });

  const rawSha256 = sha256(rawBody);
  return {
    schemaVersion: 1,
    datasetId: DATASET_ID,
    parserVersion: PARSER_VERSION,
    generatedAt: retrievedAt,
    source: {
      ...OFFICIAL_SOURCE,
      snapshotPath,
      rawSha256,
      retrievedAt,
      sourceUpdatedAt: null,
    },
    profile: parsed.profile,
    markets,
  };
}

export function validateArtifact(artifact) {
  assertExactKeys(
    artifact,
    [
      "schemaVersion",
      "datasetId",
      "parserVersion",
      "generatedAt",
      "source",
      "profile",
      "markets",
    ],
    "generated artifact",
  );
  assert(artifact.schemaVersion === 1, "Generated artifact schemaVersion must be 1");
  assert(artifact.datasetId === DATASET_ID, "Generated artifact datasetId does not match");
  assert(artifact.parserVersion === PARSER_VERSION, "Generated artifact parserVersion does not match");
  assertNotFutureTimestamp(artifact.generatedAt, "generated artifact.generatedAt");
  assert(isPlainObject(artifact.source), "Generated artifact source must be an object");
  assertNotFutureTimestamp(
    artifact.source.retrievedAt,
    "generated artifact.source.retrievedAt",
  );
  assert(artifact.source.sourceUpdatedAt === null, "Payload has no sourceUpdatedAt; it must stay null");
  assert(
    /^[a-f0-9]{64}$/u.test(artifact.source.rawSha256),
    "Generated artifact rawSha256 must be SHA-256 hex",
  );
  assert(
    isPlainObject(artifact.profile) && artifact.profile.rowCount === APPROVED_ROW_COUNT,
    `Generated artifact profile rowCount must be ${APPROVED_ROW_COUNT}`,
  );
  assert(
    Array.isArray(artifact.markets) && artifact.markets.length === APPROVED_ROW_COUNT,
    `Generated artifact must contain ${APPROVED_ROW_COUNT} markets`,
  );
  const ids = new Set();
  const recordIds = new Set();
  for (const market of artifact.markets) {
    assertNonEmptyString(market.id, "generated market.id");
    assert(!ids.has(market.id), `Duplicate generated market ID: ${market.id}`);
    ids.add(market.id);
    assertNonEmptyString(market.recordId, `${market.id}.recordId`);
    assert(!recordIds.has(market.recordId), `Duplicate generated record ID: ${market.recordId}`);
    recordIds.add(market.recordId);
    assertNonEmptyString(market.name, `${market.id}.name`);
    assertNonEmptyString(market.permittedArea, `${market.id}.permittedArea`);
    canonicalDays(market.scheduleDays);
    assertNotFutureTimestamp(market.verifiedAt, `${market.id}.verifiedAt`);
    assert(isPlainObject(market.evidence), `${market.id}.evidence must be an object`);
    assert(
      isPlainObject(market.evidence.adminCode) &&
        market.evidence.adminCode.field === "adminCode" &&
        market.evidence.adminCode.value === market.adminCode &&
        market.evidence.adminCode.recordId === market.recordId,
      `${market.id} must preserve official adminCode evidence`,
    );
    assert(
      Array.isArray(market.evidence.scheduleDays) &&
        market.evidence.scheduleDays.length > 0,
      `${market.id} must have schedule evidence`,
    );
    assert(Array.isArray(market.conflicts), `${market.id}.conflicts must be an array`);
  }
  return artifact;
}

function snapshotFilename(retrievedAt, rawSha256) {
  const timestamp = retrievedAt.replace(/[^0-9A-Za-z-]/gu, "-").replace(/-+/gu, "-");
  return `${timestamp}-${rawSha256.slice(0, 12)}.json`;
}

function toRepoPath(absolutePath) {
  return relative(REPO_ROOT, absolutePath).split("\\").join("/");
}

async function loadCuration() {
  const raw = await readFile(CURATION_PATH, "utf8");
  return validateCuration(JSON.parse(raw));
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
      "input snapshot",
    );
    assertOfficialSource(parsed.source, "input snapshot.source");
    assertNotFutureTimestamp(parsed.retrievedAt, "input snapshot.retrievedAt");
    assert(parsed.sourceUpdatedAt === null, "input snapshot.sourceUpdatedAt must be null");
    assert(
      sha256(parsed.rawBody) === parsed.rawSha256,
      "Input snapshot checksum does not match rawBody",
    );
    if (retrievedAtOption !== null) {
      assert(
        retrievedAtOption === parsed.retrievedAt,
        "--retrieved-at must match an immutable snapshot's retrievedAt",
      );
    }
    return { rawBody: parsed.rawBody, retrievedAt: parsed.retrievedAt };
  }

  assert(
    retrievedAtOption !== null,
    "--retrieved-at is required with a raw --input response",
  );
  return { rawBody: rawInput, retrievedAt: retrievedAtOption };
}

async function fetchLive(retrievedAtOption) {
  const response = await globalThis.fetch(OFFICIAL_SOURCE.endpointUrl, {
    headers: { accept: "application/json" },
  });
  assert(
    response.ok,
    `Official endpoint request failed: HTTP ${response.status} ${response.statusText}`,
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
    if (!(error instanceof Error) || !Object.hasOwn(error, "code") || error.code !== "EEXIST") {
      throw error;
    }
    const existing = await readFile(path, "utf8");
    assert(existing === contents, `Immutable snapshot already exists with different content: ${path}`);
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
    source: OFFICIAL_SOURCE,
    retrievedAt,
    sourceUpdatedAt: null,
    rawSha256: sha256(rawBody),
    rawBody,
  };
}

async function prepareCandidate(rawBody, retrievedAt) {
  assertNotFutureTimestamp(retrievedAt, "retrievedAt");
  const digest = sha256(rawBody);
  const snapshotPath = resolve(
    SNAPSHOT_DIRECTORY,
    snapshotFilename(retrievedAt, digest),
  );
  const curation = await loadCuration();
  const artifact = buildArtifact({
    rawBody,
    retrievedAt,
    snapshotPath: toRepoPath(snapshotPath),
    curation,
  });
  validateArtifact(artifact);
  return { artifact, snapshotPath, digest };
}

export async function checkCommittedArtifact() {
  const artifactRaw = await readFile(ARTIFACT_PATH, "utf8");
  const artifact = validateArtifact(JSON.parse(artifactRaw));
  const snapshotPath = resolve(REPO_ROOT, artifact.source.snapshotPath);
  assert(
    snapshotPath.startsWith(`${SNAPSHOT_DIRECTORY}/`),
    "Generated artifact snapshotPath must stay inside data/sources/tainan",
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
    "committed snapshot",
  );
  assert(snapshot.snapshotSchemaVersion === 1, "Unsupported snapshot schemaVersion");
  assertOfficialSource(snapshot.source, "committed snapshot.source");
  assert(snapshot.sourceUpdatedAt === null, "Snapshot sourceUpdatedAt must remain null");
  assert(
    sha256(snapshot.rawBody) === snapshot.rawSha256,
    "Committed snapshot raw checksum mismatch",
  );
  assert(
    snapshot.rawSha256 === artifact.source.rawSha256,
    "Artifact raw checksum does not match committed snapshot",
  );
  assert(
    snapshot.retrievedAt === artifact.source.retrievedAt,
    "Artifact retrievedAt does not match committed snapshot",
  );

  const curation = await loadCuration();
  const rebuilt = buildArtifact({
    rawBody: snapshot.rawBody,
    retrievedAt: snapshot.retrievedAt,
    snapshotPath: artifact.source.snapshotPath,
    curation,
  });
  validateArtifact(rebuilt);
  assert(
    JSON.stringify(rebuilt) === JSON.stringify(artifact),
    "Generated artifact is not reproducible from its snapshot and curation",
  );
  return artifact;
}

export function parseArgs(argv) {
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
      "Usage: node scripts/sync-tainan-night-markets.mjs [options]",
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

export async function runCli(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return null;
  }

  if (options.check && options.input === null) {
    const artifact = await checkCommittedArtifact();
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
  runCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(
      `[sync-tainan-night-markets] ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
