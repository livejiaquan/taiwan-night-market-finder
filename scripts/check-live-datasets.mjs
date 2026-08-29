#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  OFFICIAL_SOURCE,
  parseOfficialPayload,
  semanticDiff,
} from "./sync-tainan-night-markets.mjs";
import {
  DISTRICT_OFFICIAL_SOURCE,
  districtSemanticDiff,
  parseDistrictPayload,
} from "./sync-tainan-districts.mjs";

const TIMEOUT_MS = 15_000;
const DEFAULT_RETRY_DELAYS_MS = [0, 1_000, 3_000];
const repoRoot = resolve(process.env.REPO_ROOT ?? process.cwd());

class OfficialSourceUnavailableError extends Error {
  constructor(url, cause) {
    super(`Official endpoint remained unavailable after retries: ${url}`, { cause });
    this.name = "OfficialSourceUnavailableError";
  }
}

class OfficialHttpError extends Error {
  constructor(status, statusText) {
    super(`Official endpoint failed: ${status} ${statusText}`);
    this.name = "OfficialHttpError";
    this.status = status;
  }
}

function readOption(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function delay(milliseconds) {
  return new Promise((resolvePromise) => globalThis.setTimeout(resolvePromise, milliseconds));
}

function isTransient(error) {
  if (error instanceof OfficialHttpError) return error.status === 429 || error.status >= 500;
  if (error instanceof TypeError) return true;
  if (!(error instanceof Error)) return false;
  return (
    error.name === "AbortError" ||
    error.cause?.code === "UND_ERR_CONNECT_TIMEOUT" ||
    error.cause?.code === "UND_ERR_HEADERS_TIMEOUT"
  );
}

async function fetchTextOnce(url, fetchImpl, timeoutMs) {
  const signal = AbortSignal.timeout(timeoutMs);
  const response = await fetchImpl(url, { headers: { accept: "application/json" }, signal });
  if (!response.ok) throw new OfficialHttpError(response.status, response.statusText);
  return response.text();
}

export async function fetchTextWithRetry(url, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? delay;
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  const retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  let lastError;

  for (let attempt = 0; attempt < retryDelaysMs.length; attempt += 1) {
    if (attempt > 0 && retryDelaysMs[attempt] > 0) await sleep(retryDelaysMs[attempt]);
    try {
      return await fetchTextOnce(url, fetchImpl, timeoutMs);
    } catch (error) {
      if (!isTransient(error)) throw error;
      lastError = error;
    }
  }

  throw new OfficialSourceUnavailableError(url, lastError);
}

async function committedRaw(artifactPath) {
  const artifact = JSON.parse(await readFile(resolve(repoRoot, artifactPath), "utf8"));
  const snapshot = JSON.parse(await readFile(resolve(repoRoot, artifact.source.snapshotPath), "utf8"));
  return snapshot.rawBody;
}

export async function checkLiveDatasets(options = {}) {
  const now = options.now ?? (() => new Date());
  const timeoutMs = options.timeoutMs ?? TIMEOUT_MS;
  const fetchOptions = {
    fetchImpl: options.fetchImpl,
    sleep: options.sleep,
    timeoutMs,
    retryDelaysMs: options.retryDelaysMs,
  };

  let marketRaw;
  let districtRaw;
  try {
    [marketRaw, districtRaw] = await Promise.all([
      fetchTextWithRetry(OFFICIAL_SOURCE.endpointUrl, fetchOptions),
      fetchTextWithRetry(DISTRICT_OFFICIAL_SOURCE.endpointUrl, fetchOptions),
    ]);
  } catch (error) {
    if (!(error instanceof OfficialSourceUnavailableError)) throw error;
    return {
      checkedAt: now().toISOString(),
      timeoutMs,
      status: "unavailable",
      hasMeaningfulChange: false,
      error: error.message,
    };
  }

  parseOfficialPayload(marketRaw);
  parseDistrictPayload(districtRaw);
  const readCommitted = options.committedRawImpl ?? committedRaw;
  const result = {
    checkedAt: now().toISOString(),
    timeoutMs,
    status: "available",
    markets: semanticDiff(
      await readCommitted("src/data/generated/tainan-night-markets.json"),
      marketRaw,
    ),
    districts: districtSemanticDiff(
      await readCommitted("src/data/generated/tainan-districts.json"),
      districtRaw,
    ),
  };
  result.hasMeaningfulChange =
    result.markets.hasMeaningfulChange || result.districts.hasMeaningfulChange;
  return result;
}

export async function main() {
  const result = await checkLiveDatasets();
  const output = readOption("--output");
  if (output) {
    await writeFile(resolve(process.cwd(), output), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  }
  if (result.status === "unavailable") {
    globalThis.console.error(`::warning::${result.error}; weekly maintenance skipped safely.`);
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result;
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  void main().catch((error) => {
    globalThis.console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
