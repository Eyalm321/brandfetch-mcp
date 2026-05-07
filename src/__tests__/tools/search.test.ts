import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../client.js", () => ({
  brandfetchPublicRequest: vi.fn().mockResolvedValue([]),
}));

import { brandfetchPublicRequest } from "../../client.js";
import { searchTools } from "../../tools/search.js";

const mockRequest = vi.mocked(brandfetchPublicRequest);

describe("searchTools", () => {
  beforeEach(() => mockRequest.mockClear());

  it("exports 1 tool", () => {
    expect(searchTools).toHaveLength(1);
  });

  it("brandfetch_brand_search calls /v2/search/{name}", async () => {
    const tool = searchTools[0];
    await tool.handler({ name: "Nike" });
    expect(mockRequest).toHaveBeenCalledWith("/v2/search/Nike", {}, undefined);
  });

  it("URL-encodes the query", async () => {
    const tool = searchTools[0];
    await tool.handler({ name: "Stark Industries" });
    expect(mockRequest.mock.calls[0][0]).toBe("/v2/search/Stark%20Industries");
  });

  it("forwards user", async () => {
    const tool = searchTools[0];
    await tool.handler({ name: "Nike", user: "alice" });
    expect(mockRequest.mock.calls[0][2]).toBe("alice");
  });
});
