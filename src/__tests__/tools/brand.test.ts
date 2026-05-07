import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../client.js", () => ({
  brandfetchRequest: vi.fn().mockResolvedValue({ name: "Nike" }),
  brandfetchPublicRequest: vi.fn().mockResolvedValue([]),
  getApiKey: vi.fn().mockReturnValue("bf_test"),
  getClientId: vi.fn().mockReturnValue("cid_test"),
  listConfiguredUsers: vi.fn().mockReturnValue([]),
  buildUrl: (...args: unknown[]) => (globalThis as any).__realBuildUrl?.(...args) ?? "",
  LOGO_CDN_BASE_URL: "https://cdn.brandfetch.io",
}));

import { brandfetchRequest } from "../../client.js";
import { brandTools } from "../../tools/brand.js";

const mockRequest = vi.mocked(brandfetchRequest);

describe("brandTools", () => {
  beforeEach(() => {
    mockRequest.mockClear();
  });

  it("exports 6 tools", () => {
    expect(brandTools).toHaveLength(6);
  });

  it("has no duplicate tool names", () => {
    const names = brandTools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every tool accepts an optional user param", () => {
    for (const tool of brandTools) {
      expect(tool.inputSchema.shape).toHaveProperty("user");
    }
  });

  describe("brandfetch_brand_get", () => {
    const tool = brandTools.find((t) => t.name === "brandfetch_brand_get")!;

    it("calls /v2/brands/{identifier}", async () => {
      await tool.handler({ identifier: "nike.com" });
      expect(mockRequest).toHaveBeenCalledWith(
        "/v2/brands/nike.com",
        { query: { allowNsfw: undefined } },
        undefined
      );
    });

    it("URL-encodes the identifier", async () => {
      await tool.handler({ identifier: "with space.com" });
      expect(mockRequest.mock.calls[0][0]).toBe("/v2/brands/with%20space.com");
    });

    it("forwards allowNsfw and user", async () => {
      await tool.handler({ identifier: "nike.com", allowNsfw: true, user: "alice" });
      expect(mockRequest).toHaveBeenCalledWith(
        "/v2/brands/nike.com",
        { query: { allowNsfw: true } },
        "alice"
      );
    });
  });

  describe("brandfetch_brand_get_by_domain", () => {
    const tool = brandTools.find((t) => t.name === "brandfetch_brand_get_by_domain")!;

    it("calls /v2/brands/domain/{domain}", async () => {
      await tool.handler({ domain: "nike.com" });
      expect(mockRequest).toHaveBeenCalledWith(
        "/v2/brands/domain/nike.com",
        { query: { allowNsfw: undefined } },
        undefined
      );
    });
  });

  describe("brandfetch_brand_get_by_ticker", () => {
    const tool = brandTools.find((t) => t.name === "brandfetch_brand_get_by_ticker")!;

    it("calls /v2/brands/ticker/{ticker}", async () => {
      await tool.handler({ ticker: "NKE" });
      expect(mockRequest).toHaveBeenCalledWith(
        "/v2/brands/ticker/NKE",
        { query: { allowNsfw: undefined } },
        undefined
      );
    });
  });

  describe("brandfetch_brand_get_by_isin", () => {
    const tool = brandTools.find((t) => t.name === "brandfetch_brand_get_by_isin")!;

    it("calls /v2/brands/isin/{isin}", async () => {
      await tool.handler({ isin: "US6541061031" });
      expect(mockRequest).toHaveBeenCalledWith(
        "/v2/brands/isin/US6541061031",
        { query: { allowNsfw: undefined } },
        undefined
      );
    });
  });

  describe("brandfetch_brand_get_by_crypto", () => {
    const tool = brandTools.find((t) => t.name === "brandfetch_brand_get_by_crypto")!;

    it("calls /v2/brands/crypto/{symbol}", async () => {
      await tool.handler({ symbol: "BTC" });
      expect(mockRequest).toHaveBeenCalledWith(
        "/v2/brands/crypto/BTC",
        { query: { allowNsfw: undefined } },
        undefined
      );
    });
  });

  describe("brandfetch_brand_from_transaction", () => {
    const tool = brandTools.find(
      (t) => t.name === "brandfetch_brand_from_transaction"
    )!;

    it("POSTs to /v2/brands/transaction with body", async () => {
      await tool.handler({
        transactionLabel: "STARBUCKS 1523 OMAHA NE",
        countryCode: "US",
      });
      expect(mockRequest).toHaveBeenCalledWith(
        "/v2/brands/transaction",
        {
          method: "POST",
          body: {
            transactionLabel: "STARBUCKS 1523 OMAHA NE",
            countryCode: "US",
          },
        },
        undefined
      );
    });

    it("forwards user", async () => {
      await tool.handler({
        transactionLabel: "X",
        countryCode: "FR",
        user: "bob",
      });
      expect(mockRequest.mock.calls[0][2]).toBe("bob");
    });
  });
});
