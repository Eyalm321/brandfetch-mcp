import { z } from "zod";
import { LOGO_CDN_BASE_URL, buildUrl, getClientId } from "../client.js";
import { userField } from "./_shared.js";

const logoTypeField = z
  .enum(["logo", "symbol", "icon"])
  .optional()
  .describe(
    "Which logo variant to return. 'logo' = full wordmark, 'symbol' = bare mark, 'icon' = favicon-style. Defaults to Brandfetch's automatic pick."
  );

const themeField = z
  .enum(["light", "dark"])
  .optional()
  .describe("Force a light or dark variant. Defaults to Brandfetch's automatic pick.");

const formatField = z
  .enum(["webp", "png", "jpg", "jpeg", "svg"])
  .optional()
  .describe("Output image format. Defaults to webp.");

const fallbackField = z
  .enum([
    "404",
    "transparent",
    "lettermark",
    "brandmark",
    "brandmark+lettermark",
  ])
  .optional()
  .describe(
    "What to return when no logo is available. '404' returns a 404 error; defaults to a generated lettermark."
  );

export const logoTools = [
  {
    name: "brandfetch_logo_url",
    description:
      "Build a Brandfetch Logo CDN URL for a domain, ticker, ISIN, or crypto symbol. Returns the URL string — fetch it with any HTTP client to get the image bytes. Requires BRANDFETCH_CLIENT_ID. Free, no attribution required.",
    inputSchema: z.object({
      identifier: z
        .string()
        .describe(
          "Domain (nike.com), ticker (NKE), ISIN, or crypto symbol. To force interpretation, prefix with 'domain/', 'ticker/', or 'crypto/'."
        ),
      type: logoTypeField,
      theme: themeField,
      format: formatField,
      fallback: fallbackField,
      width: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Target width in pixels. Double for retina."),
      height: z
        .number()
        .int()
        .positive()
        .optional()
        .describe("Target height in pixels. Double for retina."),
      user: userField,
    }),
    handler: async (args: {
      identifier: string;
      type?: string;
      theme?: string;
      format?: string;
      fallback?: string;
      width?: number;
      height?: number;
      user?: string;
    }) => {
      const clientId = getClientId(args.user);
      const url = buildUrl(LOGO_CDN_BASE_URL, args.identifier, {
        c: clientId,
        type: args.type,
        theme: args.theme,
        format: args.format,
        fallback: args.fallback,
        w: args.width,
        h: args.height,
      });
      return { url };
    },
  },
];
