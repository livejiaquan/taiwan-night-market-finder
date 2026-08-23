import {
  access,
  copyFile,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";
import { afterEach, describe, expect, it } from "vitest";

const REPO_ROOT = process.cwd();
const SCRIPT_PATH = resolve(REPO_ROOT, "scripts/generate-deployment-metadata.mjs");
const temporaryDirectories = [];

async function deploymentDirectory() {
  const directory = await mkdtemp(join(tmpdir(), "night-market-deploy-metadata-"));
  temporaryDirectories.push(directory);
  return directory;
}

function runMetadata(outDir, siteUrl = "https://markets.example.test") {
  return spawnSync(
    process.execPath,
    [SCRIPT_PATH, "--site-url", siteUrl, "--out-dir", outDir],
    { cwd: REPO_ROOT, encoding: "utf8" },
  );
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("deployment metadata generation", () => {
  it("writes absolute metadata and one sitemap URL per public route", async () => {
    const directory = await deploymentDirectory();
    await copyFile(resolve(REPO_ROOT, "index.html"), join(directory, "index.html"));

    const result = runMetadata(directory);

    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: "generated",
      urls: 33,
      prerendered: 32,
      noindexShells: 3,
    });
    const index = await readFile(join(directory, "index.html"), "utf8");
    const marketIndex = await readFile(
      join(directory, "market", "tainan-licensed-5", "index.html"),
      "utf8",
    );
    const labIndex = await readFile(join(directory, "lab", "index.html"), "utf8");
    const sitemap = await readFile(join(directory, "sitemap.xml"), "utf8");
    const robots = await readFile(join(directory, "robots.txt"), "utf8");
    const redirects = await readFile(join(directory, "_redirects"), "utf8");
    expect(index).toContain('rel="canonical" href="https://markets.example.test/"');
    expect(index).toContain('property="og:url" content="https://markets.example.test/"');
    expect(index).toContain('href="%BASE_URL%favicon.svg"');
    expect(marketIndex).toContain("<title>武聖夜市｜臺南夜市正常營業日與資料來源</title>");
    expect(marketIndex).toContain(
      'rel="canonical" href="https://markets.example.test/market/tainan-licensed-5"',
    );
    expect(marketIndex).toContain(
      'property="og:url" content="https://markets.example.test/market/tainan-licensed-5"',
    );
    expect(marketIndex).toContain("不是即時開門保證");
    expect(labIndex).toContain('<meta name="robots" content="noindex,nofollow" />');
    expect(labIndex).toContain(
      'rel="canonical" href="https://markets.example.test/lab"',
    );
    expect(sitemap.match(/<url>/gu)).toHaveLength(33);
    expect(robots).toContain("Sitemap: https://markets.example.test/sitemap.xml");
    expect(redirects).toContain(
      "/market/tainan-licensed-5 /market/tainan-licensed-5/index.html 200",
    );
    expect(redirects).toContain("/lab /lab/index.html 200");
    expect(redirects).toContain("/* /index.html 200");
  });

  it.each([
    ["missing", "<html><head></head><body></body></html>"],
    [
      "duplicated",
      '<link rel="canonical" href="https://night-market.invalid/" /><link rel="canonical" href="https://night-market.invalid/" />' +
        '<meta property="og:url" content="/" />',
    ],
  ])("fails closed when required placeholders are %s", async (_caseName, index) => {
    const directory = await deploymentDirectory();
    await writeFile(join(directory, "index.html"), index, "utf8");

    const result = runMetadata(directory);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/Expected exactly one .* placeholder/);
    await expect(access(join(directory, "sitemap.xml"))).rejects.toThrow();
    await expect(access(join(directory, "robots.txt"))).rejects.toThrow();
  });

  it.each([
    "http://markets.example.test",
    "https://user:secret@markets.example.test",
    "https://markets.example.test/subpath",
    "https://markets.example.test?preview=true",
    "https://markets.example.test#preview",
  ])("rejects a non-origin production URL before writing output: %s", async (siteUrl) => {
    const directory = await deploymentDirectory();
    await copyFile(resolve(REPO_ROOT, "index.html"), join(directory, "index.html"));

    const result = runMetadata(directory, siteUrl);

    expect(result.status).toBe(1);
    await expect(access(join(directory, "sitemap.xml"))).rejects.toThrow();
    await expect(access(join(directory, "robots.txt"))).rejects.toThrow();
  });
});
import { spawnSync } from "node:child_process";
