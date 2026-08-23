import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const config = await readFile("vitest.config.ts", "utf8");

describe("normal Vitest discovery", () => {
  it("keeps Playwright release smoke specs outside the unit/data suite", () => {
    expect(config).toMatch(/exclude:\s*\[[^\]]*["']e2e\/\*\*["']/u);
  });
});
