import generatedDataset from "../data/generated/tainan-night-markets.json";

export const OPENING_DAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

export type OpeningDay = (typeof OPENING_DAYS)[number];
export type EvidenceStatus = "verified" | "conflict" | "stale" | "unknown";
export type EvidenceMethod = "official_dataset" | "official_page" | "derived";
export type EvidenceField =
  | "adminCode"
  | "districtName"
  | "name"
  | "scheduleDays"
  | "permittedArea"
  | "navigationQuery";

export interface FieldEvidence<T> {
  field: EvidenceField;
  value: T;
  status: EvidenceStatus;
  method: EvidenceMethod;
  sourceId: string;
  sourceLabel: string;
  publisher: string;
  sourceUrl: string;
  recordId: string | null;
  retrievedAt: string;
  sourceUpdatedAt: string | null;
  verifiedAt: string;
  derivation?: string;
  note?: string;
}

export interface ScheduleConflict {
  id: string;
  field: "scheduleDays";
  days: OpeningDay[];
  status: "unresolved";
  summaryZh: string;
  summaryEn: string;
  sources: FieldEvidence<OpeningDay[]>[];
}

export interface TrustedMarket {
  id: string;
  recordId: string;
  city: "臺南市";
  adminCode: string;
  name: string;
  permittedArea: string;
  scheduleRaw: string;
  scheduleDays: OpeningDay[];
  navigationQuery: string;
  verifiedAt: string;
  evidence: {
    adminCode: FieldEvidence<string>;
    name: FieldEvidence<string>;
    permittedArea: FieldEvidence<string>;
    scheduleDays: FieldEvidence<OpeningDay[]>[];
    navigationQuery: FieldEvidence<string>;
  };
  conflicts: ScheduleConflict[];
}

export interface DatasetSource {
  sourceId: string;
  publisher: string;
  datasetName: string;
  datasetUrl: string;
  endpointUrl: string;
  licenseName: string;
  licenseUrl: string;
  snapshotPath: string;
  rawSha256: string;
  retrievedAt: string;
  sourceUpdatedAt: string | null;
}

export interface DatasetProfile {
  rowCount: number;
  requiredColumns: string[];
  uniqueRecordIds: true;
  uniqueNames: true;
}

export interface TrustedMarketDataset {
  schemaVersion: 1;
  datasetId: "tainan-licensed-night-markets";
  parserVersion: string;
  generatedAt: string;
  source: DatasetSource;
  profile: DatasetProfile;
  markets: TrustedMarket[];
}

export type FreshnessStatus = "current" | "aging" | "hard-stale";

export interface Freshness {
  status: FreshnessStatus;
  ageDays: number;
  verifiedAt: string;
}

export type MarketDecisionStatus =
  | "confirmed"
  | "not-scheduled"
  | "conflict"
  | "stale"
  | "unknown";

export interface MarketDecision {
  status: MarketDecisionStatus;
  day: OpeningDay;
  scheduledByPrimarySource: boolean;
  isPositive: boolean;
  freshness: Freshness;
  reason:
    | "scheduled-and-verified"
    | "not-in-verified-schedule"
    | "source-disagreement"
    | "verification-hard-stale"
    | "schedule-evidence-unavailable";
  conflict?: ScheduleConflict;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;
export const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;
const EVIDENCE_STATUSES = new Set<EvidenceStatus>([
  "verified",
  "conflict",
  "stale",
  "unknown",
]);
const EVIDENCE_METHODS = new Set<EvidenceMethod>([
  "official_dataset",
  "official_page",
  "derived",
]);
const EVIDENCE_FIELDS = new Set<EvidenceField>([
  "adminCode",
  "districtName",
  "name",
  "scheduleDays",
  "permittedArea",
  "navigationQuery",
]);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u;

function fail(message: string): never {
  throw new Error(`Invalid market dataset: ${message}`);
}

function asRecord(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(`${context} must be an object`);
  }
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown, context: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${context} must be a non-empty string`);
  }
  return value;
}

function taipeiDateAt(timestamp: number): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function assertDateLike(value: unknown, context: string): asserts value is string {
  const text = asNonEmptyString(value, context);
  const isDateOnly = ISO_DATE_PATTERN.test(text);
  if (!isDateOnly && !ISO_TIMESTAMP_PATTERN.test(text)) {
    fail(`${context} must be an ISO 8601 date or timestamp with timezone`);
  }
  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) {
    fail(`${context} must be a valid ISO date or timestamp`);
  }
  if (isDateOnly && new Date(parsed).toISOString().slice(0, 10) !== text) {
    fail(`${context} must be a real calendar date`);
  }
  const comparisonTime = Date.now() + MAX_FUTURE_CLOCK_SKEW_MS;
  const beyondClockSkew = isDateOnly
    ? text > taipeiDateAt(comparisonTime)
    : Date.parse(text) > comparisonTime;
  if (beyondClockSkew) {
    fail(
      `${context} must not be in the future beyond ${MAX_FUTURE_CLOCK_SKEW_MS / 60000} minutes of clock skew`,
    );
  }
}

function assertHttpUrl(value: unknown, context: string): asserts value is string {
  const text = asNonEmptyString(value, context);
  let parsed: URL;
  try {
    parsed = new URL(text);
  } catch {
    fail(`${context} must be a valid URL`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    fail(`${context} must use http or https`);
  }
}

export function isOpeningDay(value: unknown): value is OpeningDay {
  return typeof value === "string" && OPENING_DAYS.includes(value as OpeningDay);
}

function asOpeningDays(value: unknown, context: string): OpeningDay[] {
  if (!Array.isArray(value) || value.length === 0) {
    fail(`${context} must be a non-empty array`);
  }
  const seen = new Set<OpeningDay>();
  for (const day of value) {
    if (!isOpeningDay(day)) {
      fail(`${context} contains an invalid weekday: ${String(day)}`);
    }
    if (seen.has(day)) {
      fail(`${context} contains duplicate weekday: ${day}`);
    }
    seen.add(day);
  }
  return OPENING_DAYS.filter((day) => seen.has(day));
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validateEvidence<T>(
  input: unknown,
  expectedField: EvidenceField,
  validateValue: (value: unknown, context: string) => T,
  context: string,
): FieldEvidence<T> {
  const evidence = asRecord(input, context);
  if (evidence.field !== expectedField || !EVIDENCE_FIELDS.has(evidence.field as EvidenceField)) {
    fail(`${context}.field must be ${expectedField}`);
  }
  if (!EVIDENCE_STATUSES.has(evidence.status as EvidenceStatus)) {
    fail(`${context}.status is invalid`);
  }
  if (!EVIDENCE_METHODS.has(evidence.method as EvidenceMethod)) {
    fail(`${context}.method is invalid`);
  }
  asNonEmptyString(evidence.sourceId, `${context}.sourceId`);
  asNonEmptyString(evidence.sourceLabel, `${context}.sourceLabel`);
  asNonEmptyString(evidence.publisher, `${context}.publisher`);
  assertHttpUrl(evidence.sourceUrl, `${context}.sourceUrl`);
  if (evidence.recordId !== null) {
    asNonEmptyString(evidence.recordId, `${context}.recordId`);
  }
  assertDateLike(evidence.retrievedAt, `${context}.retrievedAt`);
  if (evidence.sourceUpdatedAt !== null) {
    assertDateLike(evidence.sourceUpdatedAt, `${context}.sourceUpdatedAt`);
  }
  assertDateLike(evidence.verifiedAt, `${context}.verifiedAt`);
  if (evidence.derivation !== undefined) {
    asNonEmptyString(evidence.derivation, `${context}.derivation`);
  }
  if (evidence.note !== undefined) {
    asNonEmptyString(evidence.note, `${context}.note`);
  }

  const validatedValue = validateValue(evidence.value, `${context}.value`);
  return { ...evidence, value: validatedValue } as unknown as FieldEvidence<T>;
}

function stringValue(value: unknown, context: string): string {
  return asNonEmptyString(value, context);
}

function scheduleValue(value: unknown, context: string): OpeningDay[] {
  return asOpeningDays(value, context);
}

function validateConflict(input: unknown, context: string): ScheduleConflict {
  const conflict = asRecord(input, context);
  asNonEmptyString(conflict.id, `${context}.id`);
  if (conflict.field !== "scheduleDays") {
    fail(`${context}.field must be scheduleDays`);
  }
  if (conflict.status !== "unresolved") {
    fail(`${context}.status must be unresolved`);
  }
  const days = asOpeningDays(conflict.days, `${context}.days`);
  asNonEmptyString(conflict.summaryZh, `${context}.summaryZh`);
  asNonEmptyString(conflict.summaryEn, `${context}.summaryEn`);
  if (!Array.isArray(conflict.sources) || conflict.sources.length !== 2) {
    fail(`${context}.sources must contain exactly two evidence records`);
  }
  const sources = conflict.sources.map((source, index) =>
    validateEvidence(
      source,
      "scheduleDays",
      scheduleValue,
      `${context}.sources[${index}]`,
    ),
  );
  if (sources.some((source) => source.status !== "conflict")) {
    fail(`${context}.sources must be marked conflict`);
  }

  const differingDays = OPENING_DAYS.filter(
    (day) => sources[0].value.includes(day) !== sources[1].value.includes(day),
  );
  if (!sameValue(days, differingDays)) {
    fail(`${context}.days must match the specific days on which sources disagree`);
  }

  return { ...conflict, days, sources } as unknown as ScheduleConflict;
}

function validateSource(input: unknown): DatasetSource {
  const source = asRecord(input, "source");
  asNonEmptyString(source.sourceId, "source.sourceId");
  asNonEmptyString(source.publisher, "source.publisher");
  asNonEmptyString(source.datasetName, "source.datasetName");
  assertHttpUrl(source.datasetUrl, "source.datasetUrl");
  assertHttpUrl(source.endpointUrl, "source.endpointUrl");
  asNonEmptyString(source.licenseName, "source.licenseName");
  assertHttpUrl(source.licenseUrl, "source.licenseUrl");
  const snapshotPath = asNonEmptyString(source.snapshotPath, "source.snapshotPath");
  if (!snapshotPath.startsWith("data/sources/tainan/") || snapshotPath.includes("..")) {
    fail("source.snapshotPath must stay within data/sources/tainan");
  }
  if (typeof source.rawSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(source.rawSha256)) {
    fail("source.rawSha256 must be SHA-256 hex");
  }
  assertDateLike(source.retrievedAt, "source.retrievedAt");
  if (source.sourceUpdatedAt !== null) {
    fail("source.sourceUpdatedAt must be null because the upstream payload does not provide it");
  }
  return source as unknown as DatasetSource;
}

function validateMarket(
  input: unknown,
  source: DatasetSource,
  index: number,
): TrustedMarket {
  const context = `markets[${index}]`;
  const market = asRecord(input, context);
  const id = asNonEmptyString(market.id, `${context}.id`);
  const recordId = asNonEmptyString(market.recordId, `${context}.recordId`);
  if (market.city !== "臺南市") {
    fail(`${context}.city must be 臺南市`);
  }
  if (typeof market.adminCode !== "string" || !/^6700\d{4}$/u.test(market.adminCode)) {
    fail(`${context}.adminCode must be an eight-digit Tainan code beginning 6700`);
  }
  const name = asNonEmptyString(market.name, `${context}.name`);
  const permittedArea = asNonEmptyString(market.permittedArea, `${context}.permittedArea`);
  asNonEmptyString(market.scheduleRaw, `${context}.scheduleRaw`);
  const scheduleDays = asOpeningDays(market.scheduleDays, `${context}.scheduleDays`);
  const navigationQuery = asNonEmptyString(
    market.navigationQuery,
    `${context}.navigationQuery`,
  );
  assertDateLike(market.verifiedAt, `${context}.verifiedAt`);

  const rawEvidence = asRecord(market.evidence, `${context}.evidence`);
  const adminCodeEvidence = validateEvidence(
    rawEvidence.adminCode,
    "adminCode",
    stringValue,
    `${context}.evidence.adminCode`,
  );
  const nameEvidence = validateEvidence(
    rawEvidence.name,
    "name",
    stringValue,
    `${context}.evidence.name`,
  );
  const areaEvidence = validateEvidence(
    rawEvidence.permittedArea,
    "permittedArea",
    stringValue,
    `${context}.evidence.permittedArea`,
  );
  const navigationEvidence = validateEvidence(
    rawEvidence.navigationQuery,
    "navigationQuery",
    stringValue,
    `${context}.evidence.navigationQuery`,
  );
  if (!Array.isArray(rawEvidence.scheduleDays) || rawEvidence.scheduleDays.length === 0) {
    fail(`${context}.evidence.scheduleDays must not be empty`);
  }
  const scheduleEvidence = rawEvidence.scheduleDays.map((evidence, evidenceIndex) =>
    validateEvidence(
      evidence,
      "scheduleDays",
      scheduleValue,
      `${context}.evidence.scheduleDays[${evidenceIndex}]`,
    ),
  );

  if (!sameValue(nameEvidence.value, name)) {
    fail(`${context}.evidence.name does not match market.name`);
  }
  if (!sameValue(adminCodeEvidence.value, market.adminCode)) {
    fail(`${context}.evidence.adminCode does not match market.adminCode`);
  }
  if (!sameValue(areaEvidence.value, permittedArea)) {
    fail(`${context}.evidence.permittedArea does not match market.permittedArea`);
  }
  if (!sameValue(navigationEvidence.value, navigationQuery)) {
    fail(`${context}.evidence.navigationQuery does not match market.navigationQuery`);
  }
  if (navigationEvidence.method !== "derived" || !navigationEvidence.derivation) {
    fail(`${context}.navigationQuery must be marked derived with a derivation`);
  }
  if (
    adminCodeEvidence.sourceId !== source.sourceId ||
    nameEvidence.sourceId !== source.sourceId ||
    areaEvidence.sourceId !== source.sourceId
  ) {
    fail(`${context} official fields must reference dataset sourceId`);
  }
  if (
    adminCodeEvidence.recordId !== recordId ||
    nameEvidence.recordId !== recordId ||
    areaEvidence.recordId !== recordId
  ) {
    fail(`${context} official field evidence must reference its recordId`);
  }
  const primaryScheduleEvidence = scheduleEvidence.find(
    (evidence) => evidence.sourceId === source.sourceId && evidence.recordId === recordId,
  );
  if (!primaryScheduleEvidence || !sameValue(primaryScheduleEvidence.value, scheduleDays)) {
    fail(`${context} must preserve official schedule evidence matching scheduleDays`);
  }

  if (!Array.isArray(market.conflicts)) {
    fail(`${context}.conflicts must be an array`);
  }
  const conflicts = market.conflicts.map((conflict, conflictIndex) =>
    validateConflict(conflict, `${context}.conflicts[${conflictIndex}]`),
  );
  const conflictIds = new Set(conflicts.map((conflict) => conflict.id));
  if (conflictIds.size !== conflicts.length) {
    fail(`${context}.conflicts contains duplicate IDs`);
  }
  if (conflicts.length === 0 && primaryScheduleEvidence.status !== "verified") {
    fail(`${context} schedule must be verified when no conflict is recorded`);
  }
  if (
    conflicts.length > 0 &&
    !conflicts.every((conflict) =>
      conflict.sources.some(
        (evidence) =>
          evidence.sourceId === primaryScheduleEvidence.sourceId &&
          sameValue(evidence.value, primaryScheduleEvidence.value),
      ),
    )
  ) {
    fail(`${context} conflict sources must include the primary schedule evidence`);
  }

  return {
    ...market,
    id,
    recordId,
    name,
    permittedArea,
    scheduleDays,
    navigationQuery,
    evidence: {
      adminCode: adminCodeEvidence,
      name: nameEvidence,
      permittedArea: areaEvidence,
      scheduleDays: scheduleEvidence,
      navigationQuery: navigationEvidence,
    },
    conflicts,
  } as unknown as TrustedMarket;
}

export function validateMarketDataset(input: unknown): TrustedMarketDataset {
  const dataset = asRecord(input, "root");
  if (dataset.schemaVersion !== 1) {
    fail("schemaVersion must be 1");
  }
  if (dataset.datasetId !== "tainan-licensed-night-markets") {
    fail("datasetId must be tainan-licensed-night-markets");
  }
  asNonEmptyString(dataset.parserVersion, "parserVersion");
  assertDateLike(dataset.generatedAt, "generatedAt");
  const source = validateSource(dataset.source);
  const profile = asRecord(dataset.profile, "profile");
  if (profile.rowCount !== 32) {
    fail("profile.rowCount must equal the reviewed baseline of 32");
  }
  if (!Array.isArray(profile.requiredColumns) || profile.requiredColumns.length !== 5) {
    fail("profile.requiredColumns must contain the five reviewed source columns");
  }
  profile.requiredColumns.forEach((column, index) =>
    asNonEmptyString(column, `profile.requiredColumns[${index}]`),
  );
  if (profile.uniqueRecordIds !== true || profile.uniqueNames !== true) {
    fail("profile uniqueness checks must pass");
  }
  if (!Array.isArray(dataset.markets) || dataset.markets.length !== profile.rowCount) {
    fail("markets length must equal profile.rowCount");
  }
  const markets = dataset.markets.map((market, index) =>
    validateMarket(market, source, index),
  );
  const ids = new Set(markets.map((market) => market.id));
  const recordIds = new Set(markets.map((market) => market.recordId));
  const names = new Set(markets.map((market) => market.name));
  if (ids.size !== markets.length) {
    fail("market IDs must be unique");
  }
  if (recordIds.size !== markets.length) {
    fail("record IDs must be unique");
  }
  if (names.size !== markets.length) {
    fail("market names must be unique");
  }

  return {
    ...dataset,
    source,
    profile: profile as unknown as DatasetProfile,
    markets,
  } as unknown as TrustedMarketDataset;
}

export function getFreshness(
  verifiedAt: string,
  now: Date | string = new Date(),
): Freshness {
  const verifiedTime = Date.parse(verifiedAt);
  const nowTime = now instanceof Date ? now.valueOf() : Date.parse(now);
  if (Number.isNaN(verifiedTime)) {
    throw new Error(`Invalid verifiedAt: ${verifiedAt}`);
  }
  if (Number.isNaN(nowTime)) {
    throw new Error(`Invalid current time: ${String(now)}`);
  }
  if (verifiedTime > nowTime + MAX_FUTURE_CLOCK_SKEW_MS) {
    throw new Error(
      `verifiedAt must not be in the future beyond ${MAX_FUTURE_CLOCK_SKEW_MS / 60000} minutes of clock skew: ${verifiedAt}`,
    );
  }
  const ageDays = Math.max(0, Math.floor((nowTime - verifiedTime) / DAY_IN_MS));
  const status: FreshnessStatus =
    ageDays <= 30 ? "current" : ageDays <= 90 ? "aging" : "hard-stale";
  return { status, ageDays, verifiedAt };
}

export function getMarketDecision(
  market: TrustedMarket,
  day: OpeningDay,
  now: Date | string = new Date(),
): MarketDecision {
  if (!isOpeningDay(day)) {
    throw new Error(`Invalid opening day: ${String(day)}`);
  }
  const freshness = getFreshness(market.verifiedAt, now);
  const scheduledByPrimarySource = market.scheduleDays.includes(day);
  const conflict = market.conflicts.find((item) => item.days.includes(day));

  if (conflict) {
    return {
      status: "conflict",
      day,
      scheduledByPrimarySource,
      isPositive: false,
      freshness,
      reason: "source-disagreement",
      conflict,
    };
  }

  const primaryEvidence = market.evidence.scheduleDays.find(
    (evidence) =>
      evidence.method === "official_dataset" && evidence.recordId === market.recordId,
  );
  if (!primaryEvidence || primaryEvidence.status === "unknown") {
    return {
      status: "unknown",
      day,
      scheduledByPrimarySource,
      isPositive: false,
      freshness,
      reason: "schedule-evidence-unavailable",
    };
  }

  if (freshness.status === "hard-stale" || primaryEvidence.status === "stale") {
    return {
      status: "stale",
      day,
      scheduledByPrimarySource,
      isPositive: false,
      freshness,
      reason: "verification-hard-stale",
    };
  }

  if (!scheduledByPrimarySource) {
    return {
      status: "not-scheduled",
      day,
      scheduledByPrimarySource,
      isPositive: false,
      freshness,
      reason: "not-in-verified-schedule",
    };
  }

  return {
    status: "confirmed",
    day,
    scheduledByPrimarySource,
    isPositive: true,
    freshness,
    reason: "scheduled-and-verified",
  };
}

export const marketDataset = validateMarketDataset(generatedDataset as unknown);
