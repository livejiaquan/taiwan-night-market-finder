#!/usr/bin/env node

import process from "node:process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));

function fail(message) {
  throw new Error(message);
}

function parseBasePath(value) {
  if (!value || value === "/") return "";
  if (!/^\/[a-zA-Z0-9._-]+(?:\/[a-zA-Z0-9._-]+)*$/u.test(value)) {
    fail("--base-path must be a safe absolute path without a trailing slash");
  }
  return value;
}

function parseArgs(argv) {
  const options = { siteUrl: null, basePath: "", outDir: resolve(repoRoot, "dist") };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--site-url") {
      options.siteUrl = argv[index + 1] ?? fail("--site-url requires an HTTPS URL");
      index += 1;
    } else if (argument === "--base-path") {
      options.basePath = parseBasePath(argv[index + 1] ?? fail("--base-path requires an absolute path"));
      index += 1;
    } else if (argument === "--out-dir") {
      options.outDir = resolve(process.cwd(), argv[index + 1] ?? fail("--out-dir requires a path"));
      index += 1;
    } else {
      fail(`Unknown argument: ${argument}`);
    }
  }
  if (!options.siteUrl) {
    fail("--site-url is required; refusing to invent a production domain");
  }
  let parsed;
  try {
    parsed = new URL(options.siteUrl);
  } catch {
    fail("--site-url must be a valid HTTPS origin");
  }
  if (parsed.protocol !== "https:") {
    fail("--site-url must use HTTPS");
  }
  if (parsed.username || parsed.password) {
    fail("--site-url must not contain credentials");
  }
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    fail("--site-url must be an origin without a path, query, or fragment");
  }
  return { siteUrl: parsed.origin, basePath: options.basePath, outDir: options.outDir };
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function countOccurrences(value, search) {
  return value.split(search).length - 1;
}

function replaceExactlyOnce(value, pattern, replacement, label) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const matches = [...value.matchAll(new RegExp(pattern.source, flags))];
  if (matches.length !== 1) {
    fail(`Expected exactly one ${label} in index.html; found ${matches.length}`);
  }
  return value.replace(pattern, replacement);
}

function applyAbsoluteSiteMetadata(index, siteUrl, basePath) {
  const rootPath = `${basePath}/`;
  const replacements = [
    {
      label: "canonical placeholder",
      search: 'rel="canonical" href="https://night-market.invalid/"',
      replacement: `rel="canonical" href="${siteUrl}${rootPath}"`,
    },
    {
      label: "Open Graph URL placeholder",
      search: 'property="og:url" content="/"',
      replacement: `property="og:url" content="${siteUrl}${rootPath}"`,
    },
  ];

  let output = index;
  for (const item of replacements) {
    const count = countOccurrences(output, item.search);
    if (count !== 1) {
      fail(`Expected exactly one ${item.label} in index.html; found ${count}`);
    }
    output = output.replace(item.search, item.replacement);
    if (countOccurrences(output, item.replacement) !== 1) {
      fail(`Failed to write the absolute ${item.label} in index.html`);
    }
  }
  return output;
}

function buildMarketIndex(rootIndex, siteUrl, basePath, market) {
  const marketPath = `/market/${encodeURIComponent(market.id)}`;
  const title = `${market.name}｜臺南夜市正常營業日與資料來源`;
  const description = `查${market.name}的正常營業日、許可區域、資料比對時間與原始來源；不是即時開門保證。`;
  let output = rootIndex;
  output = replaceExactlyOnce(
    output,
    /<title>[^<]*<\/title>/u,
    `<title>${escapeXml(title)}</title>`,
    "title",
  );
  output = replaceExactlyOnce(
    output,
    /<meta\b(?=[^>]*\bname="description")[^>]*>/u,
    `<meta name="description" content="${escapeXml(description)}" />`,
    "description meta tag",
  );
  output = replaceExactlyOnce(
    output,
    /<meta\b(?=[^>]*\bproperty="og:title")[^>]*>/u,
    `<meta property="og:title" content="${escapeXml(title)}" />`,
    "Open Graph title tag",
  );
  output = replaceExactlyOnce(
    output,
    /<meta\b(?=[^>]*\bproperty="og:description")[^>]*>/u,
    `<meta property="og:description" content="${escapeXml(description)}" />`,
    "Open Graph description tag",
  );
  output = replaceExactlyOnce(
    output,
    /<meta\b(?=[^>]*\bproperty="og:url")[^>]*>/u,
    `<meta property="og:url" content="${escapeXml(`${siteUrl}${basePath}${marketPath}`)}" />`,
    "Open Graph URL tag",
  );
  output = replaceExactlyOnce(
    output,
    /<meta\b(?=[^>]*\bname="twitter:title")[^>]*>/u,
    `<meta name="twitter:title" content="${escapeXml(title)}" />`,
    "Twitter title tag",
  );
  output = replaceExactlyOnce(
    output,
    /<meta\b(?=[^>]*\bname="twitter:description")[^>]*>/u,
    `<meta name="twitter:description" content="${escapeXml(description)}" />`,
    "Twitter description tag",
  );
  output = replaceExactlyOnce(
    output,
    /<link\b(?=[^>]*\brel="canonical")[^>]*>/u,
    `<link rel="canonical" href="${escapeXml(`${siteUrl}${basePath}${marketPath}`)}" />`,
    "canonical tag",
  );
  return { contents: output, marketPath };
}

function buildNoindexIndex(rootIndex, siteUrl, basePath, routePath) {
  const title = "視覺原型 Lab｜今晚哪裡有市";
  const description = "保留的內部視覺原型，不是公共夜市資料產品。";
  let output = rootIndex;
  output = replaceExactlyOnce(
    output,
    /<title>[^<]*<\/title>/u,
    `<title>${title}</title>`,
    "title",
  );
  output = replaceExactlyOnce(
    output,
    /<meta\b(?=[^>]*\bname="robots")[^>]*>/u,
    '<meta name="robots" content="noindex,nofollow" />',
    "robots meta tag",
  );
  output = replaceExactlyOnce(
    output,
    /<meta\b(?=[^>]*\bname="description")[^>]*>/u,
    `<meta name="description" content="${description}" />`,
    "description meta tag",
  );
  output = replaceExactlyOnce(
    output,
    /<meta\b(?=[^>]*\bproperty="og:title")[^>]*>/u,
    `<meta property="og:title" content="${title}" />`,
    "Open Graph title tag",
  );
  output = replaceExactlyOnce(
    output,
    /<meta\b(?=[^>]*\bproperty="og:description")[^>]*>/u,
    `<meta property="og:description" content="${description}" />`,
    "Open Graph description tag",
  );
  output = replaceExactlyOnce(
    output,
    /<meta\b(?=[^>]*\bproperty="og:url")[^>]*>/u,
    `<meta property="og:url" content="${siteUrl}${basePath}${routePath}" />`,
    "Open Graph URL tag",
  );
  output = replaceExactlyOnce(
    output,
    /<meta\b(?=[^>]*\bname="twitter:title")[^>]*>/u,
    `<meta name="twitter:title" content="${title}" />`,
    "Twitter title tag",
  );
  output = replaceExactlyOnce(
    output,
    /<meta\b(?=[^>]*\bname="twitter:description")[^>]*>/u,
    `<meta name="twitter:description" content="${description}" />`,
    "Twitter description tag",
  );
  output = replaceExactlyOnce(
    output,
    /<link\b(?=[^>]*\brel="canonical")[^>]*>/u,
    `<link rel="canonical" href="${siteUrl}${basePath}${routePath}" />`,
    "canonical tag",
  );
  return { contents: output, routePath };
}

async function run() {
  const options = parseArgs(process.argv.slice(2));
  const dataset = JSON.parse(
    await readFile(resolve(repoRoot, "src/data/generated/tainan-night-markets.json"), "utf8"),
  );
  if (!Array.isArray(dataset.markets) || dataset.markets.length === 0) {
    fail("Generated dataset must contain markets before deployment metadata is written");
  }
  const marketIds = new Set();
  for (const market of dataset.markets) {
    if (typeof market.id !== "string" || !market.id || typeof market.name !== "string" || !market.name) {
      fail("Every generated market must have a non-empty id and name");
    }
    if (marketIds.has(market.id)) {
      fail(`Duplicate generated market id: ${market.id}`);
    }
    marketIds.add(market.id);
  }
  const lastModified = String(dataset.generatedAt).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(lastModified)) {
    fail("Generated dataset must provide a valid generatedAt date");
  }
  const paths = ["/", ...dataset.markets.map((market) => `/market/${encodeURIComponent(market.id)}`)];
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.map(
      (path) =>
        `  <url><loc>${escapeXml(`${options.siteUrl}${options.basePath}${path}`)}</loc><lastmod>${lastModified}</lastmod></url>`,
    ),
    "</urlset>",
    "",
  ].join("\n");
  const robots = `User-agent: *\nAllow: /\n\nSitemap: ${options.siteUrl}${options.basePath}/sitemap.xml\n`;

  const indexPath = resolve(options.outDir, "index.html");
  const sourceIndex = await readFile(indexPath, "utf8");
  const index = applyAbsoluteSiteMetadata(sourceIndex, options.siteUrl, options.basePath);
  const marketPages = dataset.markets.map((market) => ({
    id: encodeURIComponent(market.id),
    ...buildMarketIndex(index, options.siteUrl, options.basePath, market),
  }));
  const prototypePages = ["/lab", "/style/neon", "/style/travel"].map((routePath) => ({
    directoryParts: routePath.split("/").filter(Boolean),
    ...buildNoindexIndex(index, options.siteUrl, options.basePath, routePath),
  }));
  const redirects = [
    ...marketPages.map(
      ({ marketPath }) => `${marketPath} ${marketPath}/index.html 200`,
    ),
    ...prototypePages.map(
      ({ routePath }) => `${routePath} ${routePath}/index.html 200`,
    ),
    "/* /index.html 200",
    "",
  ].join("\n");

  await mkdir(options.outDir, { recursive: true });
  for (const marketPage of marketPages) {
    const directory = resolve(options.outDir, "market", marketPage.id);
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, "index.html"), marketPage.contents, "utf8");
  }
  for (const prototypePage of prototypePages) {
    const directory = resolve(options.outDir, ...prototypePage.directoryParts);
    await mkdir(directory, { recursive: true });
    await writeFile(resolve(directory, "index.html"), prototypePage.contents, "utf8");
  }
  await writeFile(resolve(options.outDir, "sitemap.xml"), sitemap, "utf8");
  await writeFile(resolve(options.outDir, "robots.txt"), robots, "utf8");
  await writeFile(resolve(options.outDir, "_redirects"), redirects, "utf8");
  await writeFile(indexPath, index, "utf8");

  process.stdout.write(
    `${JSON.stringify({ siteUrl: options.siteUrl, urls: paths.length, prerendered: marketPages.length, noindexShells: prototypePages.length, outDir: options.outDir, status: "generated" })}\n`,
  );
}

run().catch((error) => {
  process.stderr.write(`[generate-deployment-metadata] ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
