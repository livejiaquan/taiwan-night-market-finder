import { describe, expect, it, vi } from "vitest";
import { checkLiveDatasets, fetchTextWithRetry } from "./check-live-datasets.mjs";

function ok(body) {
  return { ok: true, status: 200, statusText: "OK", text: async () => body };
}

describe("live dataset availability handling", () => {
  it("retries transient transport failures before succeeding", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(ok("payload"));
    const sleep = vi.fn(async () => undefined);

    await expect(
      fetchTextWithRetry("https://example.test/data", { fetchImpl, sleep, retryDelaysMs: [0, 1] }),
    ).resolves.toBe("payload");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledOnce();
  });

  it("turns an exhausted transient outage into a safe no-change result", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    await expect(
      checkLiveDatasets({
        fetchImpl,
        sleep: async () => undefined,
        retryDelaysMs: [0, 0],
      }),
    ).resolves.toMatchObject({
      status: "unavailable",
      hasMeaningfulChange: false,
    });
  });

  it("still fails for permanent HTTP configuration errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await expect(
      checkLiveDatasets({
        fetchImpl,
        sleep: async () => undefined,
        retryDelaysMs: [0, 0],
      }),
    ).rejects.toThrow(/404 Not Found/);
  });
});
