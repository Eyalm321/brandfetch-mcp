import { z } from "zod";

/**
 * Optional `user` field added to every tool. Selects which account from the
 * file referenced by `BRANDFETCH_ACCOUNTS_FILE` to use. Omit to use the
 * default account from `BRANDFETCH_API_KEY` / `BRANDFETCH_CLIENT_ID`.
 */
export const userField = z
  .string()
  .optional()
  .describe(
    "Optional user identifier to select which Brandfetch account to use from the " +
      "file referenced by BRANDFETCH_ACCOUNTS_FILE. Matching is case-insensitive. " +
      "Omit to use the default account (BRANDFETCH_API_KEY / BRANDFETCH_CLIENT_ID)."
  );

export const allowNsfwField = z
  .boolean()
  .optional()
  .describe(
    "If true, allow brand data flagged as NSFW. Defaults to false (NSFW brands are filtered)."
  );
