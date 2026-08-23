#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
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
const repoRoot = resolve(new URL("..", import.meta.url).pathname);

function readOption(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

async function fetchText(url) {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const response = await fetch(url, { headers: { accept: "application/json" }, signal });
  if (!response.ok) throw new Error(`Official endpoint failed: ${response.status} ${response.statusText}`);
  return response.text();
}

async function committedRaw(artifactPath) {
  const artifact = JSON.parse(await readFile(resolve(repoRoot, artifactPath), "utf8"));
  const snapshot = JSON.parse(await readFile(resolve(repoRoot, artifact.source.snapshotPath), "utf8"));
  return snapshot.rawBody;
}

const marketRaw = await fetchText(OFFICIAL_SOURCE.endpointUrl);
const districtRaw = await fetchText(DISTRICT_OFFICIAL_SOURCE.endpointUrl);
parseOfficialPayload(marketRaw);
parseDistrictPayload(districtRaw);

const result = {
  checkedAt: new Date().toISOString(),
  timeoutMs: TIMEOUT_MS,
  markets: semanticDiff(await committedRaw("src/data/generated/tainan-night-markets.json"), marketRaw),
  districts: districtSemanticDiff(await committedRaw("src/data/generated/tainan-districts.json"), districtRaw),
};
result.hasMeaningfulChange = result.markets.hasMeaningfulChange || result.districts.hasMeaningfulChange;

const output = readOption("--output");
if (output) await writeFile(resolve(process.cwd(), output), `${JSON.stringify(result, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(result)}\n`);
