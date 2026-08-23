import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const workflow = await readFile(
  ".github/workflows/weekly-data-maintenance.yml",
  "utf8",
);

describe("weekly data maintenance workflow", () => {
  it("reuses one review branch and an existing open PR without force pushing", () => {
    expect(workflow).toContain("MAINTENANCE_BRANCH: maintenance/tainan-data-review");
    expect(workflow).not.toContain("github.run_id");
    expect(workflow).toContain("github.rest.pulls.list");
    expect(workflow).toContain("git merge --no-edit origin/main");
    expect(workflow).not.toMatch(/git push[^\n]*--force/u);
    expect(workflow).toContain("git diff --cached --quiet");
  });
});
