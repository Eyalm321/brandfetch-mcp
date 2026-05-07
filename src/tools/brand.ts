import { z } from "zod";
import { brandfetchRequest } from "../client.js";
import { allowNsfwField, userField } from "./_shared.js";

export const brandTools = [
  {
    name: "brandfetch_brand_get",
    description:
      "Fetch brand data by any supported identifier — domain (nike.com), Brandfetch brand ID (id_0dwKPKT), stock/ETF ticker (NKE), ISIN (US6541061031), or crypto symbol (BTC). Returns logos, colors, fonts, social links, company info, and quality score. Requires a Brandfetch API key.",
    inputSchema: z.object({
      identifier: z
        .string()
        .describe("Domain, brand ID, stock/ETF ticker, ISIN, or crypto symbol."),
      allowNsfw: allowNsfwField,
      user: userField,
    }),
    handler: async (args: { identifier: string; allowNsfw?: boolean; user?: string }) => {
      return brandfetchRequest(
        `/v2/brands/${encodeURIComponent(args.identifier)}`,
        { query: { allowNsfw: args.allowNsfw } },
        args.user
      );
    },
  },
  {
    name: "brandfetch_brand_get_by_domain",
    description:
      "Fetch brand data by domain only (e.g. 'nike.com'). Use this when you want to disambiguate from tickers/ISINs that share the input string. Requires a Brandfetch API key.",
    inputSchema: z.object({
      domain: z.string().describe("Domain name, e.g. 'nike.com'."),
      allowNsfw: allowNsfwField,
      user: userField,
    }),
    handler: async (args: { domain: string; allowNsfw?: boolean; user?: string }) => {
      return brandfetchRequest(
        `/v2/brands/domain/${encodeURIComponent(args.domain)}`,
        { query: { allowNsfw: args.allowNsfw } },
        args.user
      );
    },
  },
  {
    name: "brandfetch_brand_get_by_ticker",
    description:
      "Fetch brand data by stock or ETF ticker (e.g. 'NKE', 'AAPL'). Requires a Brandfetch API key.",
    inputSchema: z.object({
      ticker: z.string().describe("Stock or ETF ticker symbol, e.g. 'NKE'."),
      allowNsfw: allowNsfwField,
      user: userField,
    }),
    handler: async (args: { ticker: string; allowNsfw?: boolean; user?: string }) => {
      return brandfetchRequest(
        `/v2/brands/ticker/${encodeURIComponent(args.ticker)}`,
        { query: { allowNsfw: args.allowNsfw } },
        args.user
      );
    },
  },
  {
    name: "brandfetch_brand_get_by_isin",
    description:
      "Fetch brand data by ISIN code (e.g. 'US6541061031'). Requires a Brandfetch API key.",
    inputSchema: z.object({
      isin: z.string().describe("ISIN code, e.g. 'US6541061031'."),
      allowNsfw: allowNsfwField,
      user: userField,
    }),
    handler: async (args: { isin: string; allowNsfw?: boolean; user?: string }) => {
      return brandfetchRequest(
        `/v2/brands/isin/${encodeURIComponent(args.isin)}`,
        { query: { allowNsfw: args.allowNsfw } },
        args.user
      );
    },
  },
  {
    name: "brandfetch_brand_get_by_crypto",
    description:
      "Fetch brand data by crypto symbol (e.g. 'BTC', 'ETH'). Requires a Brandfetch API key.",
    inputSchema: z.object({
      symbol: z.string().describe("Crypto symbol, e.g. 'BTC'."),
      allowNsfw: allowNsfwField,
      user: userField,
    }),
    handler: async (args: { symbol: string; allowNsfw?: boolean; user?: string }) => {
      return brandfetchRequest(
        `/v2/brands/crypto/${encodeURIComponent(args.symbol)}`,
        { query: { allowNsfw: args.allowNsfw } },
        args.user
      );
    },
  },
  {
    name: "brandfetch_brand_from_transaction",
    description:
      "Resolve a raw payment transaction string (e.g. 'STARBUCKS 1523 OMAHA NE') into merchant brand data. Requires a Brandfetch API key.",
    inputSchema: z.object({
      transactionLabel: z
        .string()
        .describe("The raw transaction text from the bank/card statement."),
      countryCode: z
        .string()
        .describe(
          "ISO 3166-1 alpha-2 country code where the transaction took place (e.g. 'US')."
        ),
      user: userField,
    }),
    handler: async (args: {
      transactionLabel: string;
      countryCode: string;
      user?: string;
    }) => {
      return brandfetchRequest(
        "/v2/brands/transaction",
        {
          method: "POST",
          body: {
            transactionLabel: args.transactionLabel,
            countryCode: args.countryCode,
          },
        },
        args.user
      );
    },
  },
];
