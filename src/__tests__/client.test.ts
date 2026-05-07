import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  brandfetchRequest,
  brandfetchPublicRequest,
  buildUrl,
  getApiKey,
  getClientId,
  listConfiguredUsers,
  _resetAccountsCache,
  LOGO_CDN_BASE_URL,
} from "../client.js";

function clearBrandfetchEnv() {
  for (const k of Object.keys(process.env)) {
    if (k.startsWith("BRANDFETCH_")) vi.stubEnv(k, "");
  }
}

describe("buildUrl", () => {
  it("joins base + path and serializes query params", () => {
    const url = buildUrl("https://api.brandfetch.io", "/v2/brands/nike.com", {
      allowNsfw: true,
    });
    expect(url).toBe("https://api.brandfetch.io/v2/brands/nike.com?allowNsfw=true");
  });

  it("skips undefined/null/empty query values", () => {
    const url = buildUrl("https://cdn.brandfetch.io", "nike.com", {
      c: "abc",
      type: undefined,
      theme: "",
      w: 0,
    });
    expect(url).toBe("https://cdn.brandfetch.io/nike.com?c=abc&w=0");
  });

  it("preserves the full path including slashes (URL encodes them)", () => {
    const url = buildUrl(LOGO_CDN_BASE_URL, "domain/nike.com", { c: "abc" });
    expect(url).toContain("nike.com");
    expect(url).toContain("c=abc");
  });
});

describe("brandfetchRequest", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
    clearBrandfetchEnv();
    vi.stubEnv("BRANDFETCH_API_KEY", "bf_test_key");
    _resetAccountsCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    _resetAccountsCache();
  });

  it("throws when no default credentials are configured", async () => {
    vi.stubEnv("BRANDFETCH_API_KEY", "");
    vi.stubEnv("BRANDFETCH_CLIENT_ID", "");
    _resetAccountsCache();
    await expect(brandfetchRequest("/v2/brands/x")).rejects.toThrow(
      /No default Brandfetch credentials configured/
    );
  });

  it("throws when the resolved account has no API key", async () => {
    vi.stubEnv("BRANDFETCH_API_KEY", "");
    vi.stubEnv("BRANDFETCH_CLIENT_ID", "client_only");
    _resetAccountsCache();
    await expect(brandfetchRequest("/v2/brands/x")).rejects.toThrow(
      /no BRANDFETCH_API_KEY configured/
    );
  });

  it("sends GET with Bearer token and no body by default", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ name: "Nike" })),
    });

    await brandfetchRequest("/v2/brands/nike.com");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.brandfetch.io/v2/brands/nike.com");
    expect(init.method).toBe("GET");
    expect(init.headers.Authorization).toBe("Bearer bf_test_key");
    expect(init.headers["Content-Type"]).toBeUndefined();
    expect(init.body).toBeUndefined();
  });

  it("appends query parameters", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("{}"),
    });

    await brandfetchRequest("/v2/brands/nike.com", {
      query: { allowNsfw: true },
    });

    expect(mockFetch.mock.calls[0][0]).toBe(
      "https://api.brandfetch.io/v2/brands/nike.com?allowNsfw=true"
    );
  });

  it("sends POST with JSON body and Content-Type", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("{}"),
    });

    await brandfetchRequest("/v2/brands/transaction", {
      method: "POST",
      body: { transactionLabel: "STARBUCKS", countryCode: "US" },
    });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({
      transactionLabel: "STARBUCKS",
      countryCode: "US",
    });
  });

  it("returns parsed JSON on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ name: "Nike", domain: "nike.com" })),
    });

    const result = await brandfetchRequest("/v2/brands/nike.com");
    expect(result).toEqual({ name: "Nike", domain: "nike.com" });
  });

  it("throws on non-OK response with API message", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve(JSON.stringify({ message: "Not found" })),
    });

    await expect(brandfetchRequest("/v2/brands/nope")).rejects.toThrow(
      "Brandfetch API error (404): Not found"
    );
  });

  it("throws on non-OK response with no body", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve(""),
    });

    await expect(brandfetchRequest("/v2/brands/x")).rejects.toThrow(
      "Brandfetch API error (500)"
    );
  });

  describe("BRANDFETCH_ACCOUNTS_FILE multi-user", () => {
    let tmp: string;

    beforeEach(() => {
      tmp = mkdtempSync(join(tmpdir(), "brandfetch-mcp-test-"));
    });

    afterEach(() => {
      rmSync(tmp, { recursive: true, force: true });
    });

    it("loads accounts from a JSON file", async () => {
      const file = join(tmp, "accounts.json");
      writeFileSync(
        file,
        JSON.stringify([
          {
            user: "alice",
            BRANDFETCH_API_KEY: "bf_alice",
            BRANDFETCH_CLIENT_ID: "cid_alice",
          },
          {
            user: "bob",
            BRANDFETCH_API_KEY: "bf_bob",
          },
        ])
      );
      vi.stubEnv("BRANDFETCH_ACCOUNTS_FILE", file);
      _resetAccountsCache();
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve("{}"),
      });

      await brandfetchRequest("/v2/brands/x", {}, "alice");

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers.Authorization).toBe("Bearer bf_alice");
    });

    it("matches user identifier case-insensitively", async () => {
      const file = join(tmp, "accounts.json");
      writeFileSync(
        file,
        JSON.stringify([
          { user: "AliceCo", apiKey: "bf_alice", clientId: "cid_alice" },
        ])
      );
      vi.stubEnv("BRANDFETCH_ACCOUNTS_FILE", file);
      _resetAccountsCache();
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve("{}"),
      });

      await brandfetchRequest("/v2/brands/x", {}, "aliceco");

      expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe("Bearer bf_alice");
    });

    it("default account in the file overrides top-level env vars", async () => {
      const file = join(tmp, "accounts.json");
      writeFileSync(
        file,
        JSON.stringify([
          { user: "default", apiKey: "bf_file_default" },
        ])
      );
      vi.stubEnv("BRANDFETCH_ACCOUNTS_FILE", file);
      _resetAccountsCache();
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve("{}"),
      });

      await brandfetchRequest("/v2/brands/x");

      expect(mockFetch.mock.calls[0][1].headers.Authorization).toBe(
        "Bearer bf_file_default"
      );
    });

    it("throws a helpful error when an unknown user is requested", async () => {
      const file = join(tmp, "accounts.json");
      writeFileSync(
        file,
        JSON.stringify([{ user: "alice", apiKey: "bf_alice" }])
      );
      vi.stubEnv("BRANDFETCH_ACCOUNTS_FILE", file);
      _resetAccountsCache();
      await expect(brandfetchRequest("/v2/brands/x", {}, "ghost")).rejects.toThrow(
        /No Brandfetch credentials configured for user "ghost"/
      );
    });

    it("throws when the file path does not exist", async () => {
      vi.stubEnv("BRANDFETCH_ACCOUNTS_FILE", join(tmp, "nope.json"));
      _resetAccountsCache();
      await expect(brandfetchRequest("/v2/brands/x")).rejects.toThrow(
        /BRANDFETCH_ACCOUNTS_FILE could not be read/
      );
    });

    it("throws when the file is not valid JSON", async () => {
      const file = join(tmp, "bad.json");
      writeFileSync(file, "not-json");
      vi.stubEnv("BRANDFETCH_ACCOUNTS_FILE", file);
      _resetAccountsCache();
      await expect(brandfetchRequest("/v2/brands/x")).rejects.toThrow(
        /BRANDFETCH_ACCOUNTS_FILE is not valid JSON/
      );
    });

    it("throws when the file is not a JSON array", async () => {
      const file = join(tmp, "wrong.json");
      writeFileSync(file, JSON.stringify({ user: "alice" }));
      vi.stubEnv("BRANDFETCH_ACCOUNTS_FILE", file);
      _resetAccountsCache();
      await expect(brandfetchRequest("/v2/brands/x")).rejects.toThrow(
        /BRANDFETCH_ACCOUNTS_FILE must be a JSON array/
      );
    });

    it("throws when an entry has neither api key nor client id", async () => {
      const file = join(tmp, "missing.json");
      writeFileSync(file, JSON.stringify([{ user: "alice" }]));
      vi.stubEnv("BRANDFETCH_ACCOUNTS_FILE", file);
      _resetAccountsCache();
      await expect(brandfetchRequest("/v2/brands/x", {}, "alice")).rejects.toThrow(
        /must define at least one of BRANDFETCH_API_KEY or BRANDFETCH_CLIENT_ID/
      );
    });

    it("throws when the file has duplicate users", async () => {
      const file = join(tmp, "dupes.json");
      writeFileSync(
        file,
        JSON.stringify([
          { user: "alice", apiKey: "a" },
          { user: "Alice", apiKey: "b" },
        ])
      );
      vi.stubEnv("BRANDFETCH_ACCOUNTS_FILE", file);
      _resetAccountsCache();
      await expect(brandfetchRequest("/v2/brands/x")).rejects.toThrow(
        /duplicate user "alice"/
      );
    });
  });
});

describe("brandfetchPublicRequest", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
    clearBrandfetchEnv();
    vi.stubEnv("BRANDFETCH_CLIENT_ID", "cid_test");
    _resetAccountsCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    _resetAccountsCache();
  });

  it("appends client id as 'c' query param and uses no Authorization header", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("[]"),
    });

    await brandfetchPublicRequest("/v2/search/nike");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.brandfetch.io/v2/search/nike?c=cid_test");
    expect(init.method).toBe("GET");
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("merges caller query params with client id", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("[]"),
    });

    await brandfetchPublicRequest("/v2/search/nike", { query: { limit: 5 } });
    expect(mockFetch.mock.calls[0][0]).toContain("limit=5");
    expect(mockFetch.mock.calls[0][0]).toContain("c=cid_test");
  });

  it("throws when client id is missing", async () => {
    vi.stubEnv("BRANDFETCH_CLIENT_ID", "");
    vi.stubEnv("BRANDFETCH_API_KEY", "bf_key_only");
    _resetAccountsCache();
    await expect(brandfetchPublicRequest("/v2/search/nike")).rejects.toThrow(
      /no BRANDFETCH_CLIENT_ID configured/
    );
  });

  it("throws on non-OK response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve(JSON.stringify({ message: "rate limited" })),
    });
    await expect(brandfetchPublicRequest("/v2/search/nike")).rejects.toThrow(
      "Brandfetch API error (429): rate limited"
    );
  });
});

describe("getApiKey / getClientId", () => {
  beforeEach(() => {
    clearBrandfetchEnv();
    _resetAccountsCache();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    _resetAccountsCache();
  });

  it("returns key when configured", () => {
    vi.stubEnv("BRANDFETCH_API_KEY", "bf_x");
    vi.stubEnv("BRANDFETCH_CLIENT_ID", "cid_x");
    _resetAccountsCache();
    expect(getApiKey()).toBe("bf_x");
    expect(getClientId()).toBe("cid_x");
  });
});

describe("listConfiguredUsers", () => {
  let tmp: string;

  beforeEach(() => {
    clearBrandfetchEnv();
    _resetAccountsCache();
    tmp = mkdtempSync(join(tmpdir(), "brandfetch-mcp-test-"));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    _resetAccountsCache();
    rmSync(tmp, { recursive: true, force: true });
  });

  it("returns empty list when nothing is configured", () => {
    expect(listConfiguredUsers()).toEqual([]);
  });

  it("includes 'default' when only API key is set", () => {
    vi.stubEnv("BRANDFETCH_API_KEY", "bf_x");
    _resetAccountsCache();
    expect(listConfiguredUsers()).toContain("default");
  });

  it("includes 'default' when only client id is set", () => {
    vi.stubEnv("BRANDFETCH_CLIENT_ID", "cid_x");
    _resetAccountsCache();
    expect(listConfiguredUsers()).toContain("default");
  });

  it("includes users from BRANDFETCH_ACCOUNTS_FILE (lowercased)", () => {
    const file = join(tmp, "a.json");
    writeFileSync(
      file,
      JSON.stringify([
        { user: "Alice", apiKey: "a" },
        { user: "BOB", clientId: "b" },
      ])
    );
    vi.stubEnv("BRANDFETCH_ACCOUNTS_FILE", file);
    _resetAccountsCache();
    const users = listConfiguredUsers();
    expect(users).toContain("alice");
    expect(users).toContain("bob");
  });
});
