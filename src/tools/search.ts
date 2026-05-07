import { z } from "zod";
import { brandfetchPublicRequest } from "../client.js";
import { userField } from "./_shared.js";

export const searchTools = [
  {
    name: "brandfetch_brand_search",
    description:
      "Search Brandfetch's brand index by company name. Returns up to a handful of matches with their domains, brand IDs, icons, and quality scores. Authenticated by Client ID (BRANDFETCH_CLIENT_ID) — no API key required.",
    inputSchema: z.object({
      name: z.string().describe("Company or brand name to search for."),
      user: userField,
    }),
    handler: async (args: { name: string; user?: string }) => {
      return brandfetchPublicRequest(
        `/v2/search/${encodeURIComponent(args.name)}`,
        {},
        args.user
      );
    },
  },
];
