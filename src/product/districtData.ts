import generatedDistrictDataset from "../data/generated/tainan-districts.json";
import {
  MAX_FUTURE_CLOCK_SKEW_MS,
  marketDataset,
  type FieldEvidence,
} from "./marketData";

const DISTRICT_SOURCE_ID = "tainan-district-codes";
const DISTRICT_SOURCE_URL =
  "https://soa.tainan.gov.tw/Api/Service/Get/5b389f60-dee6-425a-8a40-f5cb2f949cf1";
const DISTRICT_DATASET_URL =
  "https://data.tainan.gov.tw/DataSet/Detail/70d961d2-9f38-4112-847d-907b436820ab";
const DISTRICT_PUBLISHER = "臺南市政府研究發展考核委員會";
const DISTRICT_DATASET_NAME = "臺南市各區代碼";
const DISTRICT_LICENSE_URL = "https://data.gov.tw/license";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const APPROVED_DISTRICT_COUNT = 37;
export const DISTRICT_REFERENCE_MAX_AGE_DAYS = 365;

export interface DistrictDatasetSource {
  sourceId: typeof DISTRICT_SOURCE_ID;
  publisher: typeof DISTRICT_PUBLISHER;
  datasetName: typeof DISTRICT_DATASET_NAME;
  datasetUrl: typeof DISTRICT_DATASET_URL;
  endpointUrl: typeof DISTRICT_SOURCE_URL;
  licenseName: "政府資料開放授權條款－第1版";
  licenseUrl: typeof DISTRICT_LICENSE_URL;
  snapshotPath: string;
  rawSha256: string;
  retrievedAt: string;
  sourceUpdatedAt: null;
}

export interface TrustedDistrict {
  sequence: number;
  code: string;
  fullName: string;
  shortName: string;
  evidence: FieldEvidence<string>;
}

export interface TrustedDistrictDataset {
  schemaVersion: 1;
  datasetId: typeof DISTRICT_SOURCE_ID;
  parserVersion: "tainan-district-codes-v1";
  generatedAt: string;
  source: DistrictDatasetSource;
  profile: {
    rowCount: typeof APPROVED_DISTRICT_COUNT;
    uniqueCodes: true;
    uniqueNames: true;
  };
  districts: TrustedDistrict[];
}

function fail(message: string): never {
  throw new Error(`Invalid district reference: ${message}`);
}

function asRecord(value: unknown, context: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail(`${context} must be an object`);
  }
  return value as Record<string, unknown>;
}

function assertExactKeys(value: Record<string, unknown>, expected: string[], context: string) {
  const actual = Object.keys(value).sort();
  const expectedSorted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expectedSorted)) {
    fail(`${context} schema drift`);
  }
}

function asNonEmptyString(value: unknown, context: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail(`${context} must be a non-empty string`);
  }
  return value;
}

function assertHttpsUrl(value: unknown, context: string): string {
  const stringValue = asNonEmptyString(value, context);
  let url: URL;
  try {
    url = new URL(stringValue);
  } catch {
    fail(`${context} must be a valid HTTPS URL`);
  }
  if (url.protocol !== "https:") {
    fail(`${context} must use HTTPS`);
  }
  return stringValue;
}

function timestamp(value: unknown, context: string): string {
  const stringValue = asNonEmptyString(value, context);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(
      stringValue,
    ) ||
    Number.isNaN(Date.parse(stringValue))
  ) {
    fail(`${context} must be an ISO timestamp with timezone`);
  }
  return stringValue;
}

function assertNotFuture(value: string, context: string, now: Date) {
  if (Date.parse(value) > now.valueOf() + MAX_FUTURE_CLOCK_SKEW_MS) {
    fail(
      `${context} must not be in the future beyond ${MAX_FUTURE_CLOCK_SKEW_MS / 60000} minutes of clock skew`,
    );
  }
}

function expectedCode(sequence: number) {
  return `6700${String(sequence * 10).padStart(4, "0")}`;
}

export function getDistrictReferenceAgeDays(
  retrievedAt: string,
  now: Date | string = new Date(),
) {
  const retrievedTime = Date.parse(retrievedAt);
  const nowTime = now instanceof Date ? now.valueOf() : Date.parse(now);
  if (Number.isNaN(retrievedTime) || Number.isNaN(nowTime)) {
    fail("district reference freshness requires valid timestamps");
  }
  if (retrievedTime > nowTime + MAX_FUTURE_CLOCK_SKEW_MS) {
    fail("district reference retrievedAt must not be in the future");
  }
  return Math.max(0, Math.floor((nowTime - retrievedTime) / DAY_IN_MS));
}

function validateSource(input: unknown, now: Date): DistrictDatasetSource {
  const source = asRecord(input, "source");
  assertExactKeys(
    source,
    [
      "sourceId",
      "publisher",
      "datasetName",
      "datasetUrl",
      "endpointUrl",
      "licenseName",
      "licenseUrl",
      "snapshotPath",
      "rawSha256",
      "retrievedAt",
      "sourceUpdatedAt",
    ],
    "source",
  );
  if (
    source.sourceId !== DISTRICT_SOURCE_ID ||
    source.publisher !== DISTRICT_PUBLISHER ||
    source.datasetName !== DISTRICT_DATASET_NAME ||
    source.datasetUrl !== DISTRICT_DATASET_URL ||
    source.endpointUrl !== DISTRICT_SOURCE_URL ||
    source.licenseName !== "政府資料開放授權條款－第1版" ||
    source.licenseUrl !== DISTRICT_LICENSE_URL
  ) {
    fail("source identity does not match the approved official district source");
  }
  const snapshotPath = asNonEmptyString(source.snapshotPath, "source.snapshotPath");
  if (!snapshotPath.startsWith("data/sources/tainan-districts/") || snapshotPath.includes("..")) {
    fail("source.snapshotPath must stay within data/sources/tainan-districts");
  }
  if (typeof source.rawSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(source.rawSha256)) {
    fail("source.rawSha256 must be SHA-256 hex");
  }
  const retrievedAt = timestamp(source.retrievedAt, "source.retrievedAt");
  assertNotFuture(retrievedAt, "source.retrievedAt", now);
  if (source.sourceUpdatedAt !== null) {
    fail("source.sourceUpdatedAt must remain null because the API does not provide it");
  }
  return source as unknown as DistrictDatasetSource;
}

function validateDistrict(input: unknown, index: number, source: DistrictDatasetSource, now: Date) {
  const district = asRecord(input, `districts[${index}]`);
  assertExactKeys(district, ["sequence", "code", "fullName", "shortName", "evidence"], `districts[${index}]`);
  const sequence = index + 1;
  if (district.sequence !== sequence || district.code !== expectedCode(sequence)) {
    fail(`districts[${index}] must preserve the reviewed code sequence`);
  }
  const fullName = asNonEmptyString(district.fullName, `districts[${index}].fullName`);
  const shortName = asNonEmptyString(district.shortName, `districts[${index}].shortName`);
  if (!/^臺南市.+區$/u.test(fullName) || shortName !== fullName.slice("臺南市".length)) {
    fail(`districts[${index}] name derivation is invalid`);
  }

  const evidence = asRecord(district.evidence, `districts[${index}].evidence`);
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
    `districts[${index}].evidence`,
  );
  if (
    evidence.field !== "districtName" ||
    evidence.value !== fullName ||
    evidence.status !== "verified" ||
    evidence.method !== "official_dataset" ||
    evidence.sourceId !== source.sourceId ||
    evidence.sourceLabel !== source.datasetName ||
    evidence.publisher !== source.publisher ||
    evidence.sourceUrl !== source.endpointUrl ||
    evidence.recordId !== district.code ||
    evidence.retrievedAt !== source.retrievedAt ||
    evidence.sourceUpdatedAt !== null ||
    evidence.verifiedAt !== source.retrievedAt
  ) {
    fail(`districts[${index}].evidence does not preserve official lineage`);
  }
  assertHttpsUrl(evidence.sourceUrl, `districts[${index}].evidence.sourceUrl`);
  const evidenceRetrievedAt = timestamp(evidence.retrievedAt, `districts[${index}].evidence.retrievedAt`);
  const evidenceVerifiedAt = timestamp(evidence.verifiedAt, `districts[${index}].evidence.verifiedAt`);
  assertNotFuture(evidenceRetrievedAt, `districts[${index}].evidence.retrievedAt`, now);
  assertNotFuture(evidenceVerifiedAt, `districts[${index}].evidence.verifiedAt`, now);
  asNonEmptyString(evidence.note, `districts[${index}].evidence.note`);
  return district as unknown as TrustedDistrict;
}

export function validateDistrictDataset(
  input: unknown,
  now: Date | string = new Date(),
): TrustedDistrictDataset {
  const runtimeNow = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(runtimeNow.valueOf())) {
    fail("current district reference time is invalid");
  }
  const dataset = asRecord(input, "root");
  assertExactKeys(
    dataset,
    ["schemaVersion", "datasetId", "parserVersion", "generatedAt", "source", "profile", "districts"],
    "root",
  );
  if (
    dataset.schemaVersion !== 1 ||
    dataset.datasetId !== DISTRICT_SOURCE_ID ||
    dataset.parserVersion !== "tainan-district-codes-v1"
  ) {
    fail("schema identity mismatch");
  }
  const generatedAt = timestamp(dataset.generatedAt, "generatedAt");
  assertNotFuture(generatedAt, "generatedAt", runtimeNow);
  const source = validateSource(dataset.source, runtimeNow);
  if (generatedAt !== source.retrievedAt) {
    fail("generatedAt must equal source.retrievedAt");
  }
  if (getDistrictReferenceAgeDays(source.retrievedAt, runtimeNow) > DISTRICT_REFERENCE_MAX_AGE_DAYS) {
    fail(`district reference exceeds its ${DISTRICT_REFERENCE_MAX_AGE_DAYS}-day review window`);
  }

  const profile = asRecord(dataset.profile, "profile");
  assertExactKeys(profile, ["rowCount", "uniqueCodes", "uniqueNames"], "profile");
  if (
    profile.rowCount !== APPROVED_DISTRICT_COUNT ||
    profile.uniqueCodes !== true ||
    profile.uniqueNames !== true
  ) {
    fail("profile must preserve the reviewed 37-row unique baseline");
  }
  if (!Array.isArray(dataset.districts) || dataset.districts.length !== APPROVED_DISTRICT_COUNT) {
    fail("districts must contain the reviewed 37-row baseline");
  }
  const districts = dataset.districts.map((district, index) =>
    validateDistrict(district, index, source, runtimeNow),
  );
  const codes = new Set(districts.map((district) => district.code));
  const names = new Set(districts.map((district) => district.fullName));
  if (codes.size !== districts.length || names.size !== districts.length) {
    fail("district codes and names must be unique");
  }
  return { ...dataset, source, districts } as unknown as TrustedDistrictDataset;
}

export const districtDataset = validateDistrictDataset(generatedDistrictDataset as unknown);
const districtByCode = new Map(districtDataset.districts.map((district) => [district.code, district]));

for (const market of marketDataset.markets) {
  if (!districtByCode.has(market.adminCode)) {
    fail(`market ${market.id} has no official district mapping for ${market.adminCode}`);
  }
}

export const pilotDistricts = districtDataset.districts.filter((district) =>
  marketDataset.markets.some((market) => market.adminCode === district.code),
);

export function getDistrict(code: string): TrustedDistrict {
  const district = districtByCode.get(code);
  if (!district) {
    throw new Error(`Unknown official Tainan district code: ${code}`);
  }
  return district;
}
