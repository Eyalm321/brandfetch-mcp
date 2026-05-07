import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { _resetAccountsCache } from "../../client.js";
import { logoTools } from "../../tools/logo.js";

describe("logoTools", () => {
  beforeEach(() => {
    for (const k of Object.keys(process.env)) {
      if (k.startsWith("BRANDFETCH_")) vi.stubEnv(k, "");
    }
    vi.stubEnv("BRANDFETCH_CLIENT_ID", "cid_test");
    _resetAccountsCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    _resetAccountsCache();
  });

  it("exports 1 tool", () => {
    expect(logoTools).toHaveLength(1);
  });

  const tool = logoTools[0];

  it("returns a CDN URL with the client id", async () => {
    const { url } = (await tool.handler({ identifier: "nike.com" })) as { url: string };
    expect(url).toBe("https://cdn.brandfetch.io/nike.com?c=cid_test");
  });

  it("includes type, theme, format, fallback, w, h", async () => {
    const { url } = (await tool.handler({
      identifier: "nike.com",
      type: "icon",
      theme: "dark",
      format: "png",
      fallback: "transparent",
      width: 128,
      height: 64,
    })) as { url: string };

    expect(url).toContain("c=cid_test");
    expect(url).toContain("type=icon");
    expect(url).toContain("theme=dark");
    expect(url).toContain("format=png");
    expect(url).toContain("fallback=transparent");
    expect(url).toContain("w=128");
    expect(url).toContain("h=64");
  });

  it("supports explicit type-prefixed identifiers", async () => {
    const { url } = (await tool.handler({ identifier: "ticker/NKE" })) as {
      url: string;
    };
    expect(url).toContain("/ticker/NKE");
    expect(url).toContain("c=cid_test");
  });

  it("throws when no client id is configured", async () => {
    vi.stubEnv("BRANDFETCH_CLIENT_ID", "");
    _resetAccountsCache();
    await expect(tool.handler({ identifier: "nike.com" })).rejects.toThrow(
      /no BRANDFETCH_CLIENT_ID configured|No default Brandfetch credentials/
    );
  });
});
