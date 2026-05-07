import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { _resetAccountsCache } from "../../client.js";
import { utilityTools } from "../../tools/utility.js";

describe("utilityTools", () => {
  beforeEach(() => {
    for (const k of Object.keys(process.env)) {
      if (k.startsWith("BRANDFETCH_")) vi.stubEnv(k, "");
    }
    _resetAccountsCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    _resetAccountsCache();
  });

  it("exports 1 tool", () => {
    expect(utilityTools).toHaveLength(1);
  });

  it("brandfetch_list_users returns the current configured users", async () => {
    vi.stubEnv("BRANDFETCH_API_KEY", "bf_x");
    _resetAccountsCache();
    const result = (await utilityTools[0].handler({})) as { users: string[] };
    expect(result.users).toContain("default");
  });

  it("returns an empty list when nothing is configured", async () => {
    const result = (await utilityTools[0].handler({})) as { users: string[] };
    expect(result.users).toEqual([]);
  });
});
