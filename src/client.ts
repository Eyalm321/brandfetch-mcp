import { readFileSync } from "node:fs";

const API_BASE_URL = "https://api.brandfetch.io";
export const LOGO_CDN_BASE_URL = "https://cdn.brandfetch.io";

interface Account {
  user: string;
  apiKey?: string;
  clientId?: string;
}

interface ParsedAccount {
  user?: string;
  BRANDFETCH_API_KEY?: string;
  BRANDFETCH_CLIENT_ID?: string;
  apiKey?: string;
  clientId?: string;
}

let cachedAccounts: Map<string, Account> | null = null;
let cachedSnapshot: string | undefined;

function envSnapshot(): string {
  return [
    `BRANDFETCH_API_KEY=${process.env.BRANDFETCH_API_KEY ?? ""}`,
    `BRANDFETCH_CLIENT_ID=${process.env.BRANDFETCH_CLIENT_ID ?? ""}`,
    `BRANDFETCH_ACCOUNTS_FILE=${process.env.BRANDFETCH_ACCOUNTS_FILE ?? ""}`,
  ].join("\n");
}

function parseAccountsJson(raw: string, source: string): Map<string, Account> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `${source} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`
    );
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${source} must be a JSON array of account objects`);
  }
  const out = new Map<string, Account>();
  for (const [i, entry] of parsed.entries()) {
    if (!entry || typeof entry !== "object") {
      throw new Error(`${source}[${i}] is not an object`);
    }
    const acc = entry as ParsedAccount;
    const apiKey = acc.BRANDFETCH_API_KEY ?? acc.apiKey;
    const clientId = acc.BRANDFETCH_CLIENT_ID ?? acc.clientId;
    if (!apiKey && !clientId) {
      throw new Error(
        `${source}[${i}] must define at least one of BRANDFETCH_API_KEY or BRANDFETCH_CLIENT_ID`
      );
    }
    const user = (acc.user ?? "default").trim().toLowerCase();
    if (out.has(user)) {
      throw new Error(`${source} contains duplicate user "${user}"`);
    }
    out.set(user, { user, apiKey, clientId });
  }
  return out;
}

/**
 * Build the account map from supported configuration sources, merged in
 * this order (later sources override earlier ones for the same user):
 *
 *   1. Top-level `BRANDFETCH_API_KEY` / `BRANDFETCH_CLIENT_ID` → "default" account
 *   2. `BRANDFETCH_ACCOUNTS_FILE` — path to a JSON file containing
 *      `[{user, BRANDFETCH_API_KEY, BRANDFETCH_CLIENT_ID}, ...]`
 *
 * User identifiers are lowercased throughout. An account may carry only one
 * of the two credentials — tools that need a missing credential will throw.
 */
function parseAccounts(): Map<string, Account> {
  const snapshot = envSnapshot();
  if (cachedAccounts && cachedSnapshot === snapshot) return cachedAccounts;

  const map = new Map<string, Account>();

  if (process.env.BRANDFETCH_API_KEY || process.env.BRANDFETCH_CLIENT_ID) {
    map.set("default", {
      user: "default",
      apiKey: process.env.BRANDFETCH_API_KEY,
      clientId: process.env.BRANDFETCH_CLIENT_ID,
    });
  }

  const filePath = process.env.BRANDFETCH_ACCOUNTS_FILE;
  if (filePath && filePath.trim()) {
    let raw: string;
    try {
      raw = readFileSync(filePath.trim(), "utf8");
    } catch (err) {
      throw new Error(
        `BRANDFETCH_ACCOUNTS_FILE could not be read at "${filePath}": ${err instanceof Error ? err.message : String(err)}`
      );
    }
    for (const [user, acc] of parseAccountsJson(raw, "BRANDFETCH_ACCOUNTS_FILE")) {
      map.set(user, acc);
    }
  }

  cachedAccounts = map;
  cachedSnapshot = snapshot;
  return map;
}

function resolveAccount(user?: string): Account {
  const accounts = parseAccounts();
  const key = (user ?? "default").trim().toLowerCase();
  const acc = accounts.get(key);
  if (!acc) {
    if (!user || key === "default") {
      throw new Error(
        "No default Brandfetch credentials configured. Set BRANDFETCH_API_KEY " +
          "and/or BRANDFETCH_CLIENT_ID (or include a default entry in the file " +
          "referenced by BRANDFETCH_ACCOUNTS_FILE)."
      );
    }
    const known = [...accounts.keys()].join(", ") || "(none)";
    throw new Error(
      `No Brandfetch credentials configured for user "${user}". Configured users: ${known}`
    );
  }
  return acc;
}

export function getApiKey(user?: string): string {
  const acc = resolveAccount(user);
  if (!acc.apiKey) {
    throw new Error(
      `Account "${acc.user}" has no BRANDFETCH_API_KEY configured. ` +
        "This endpoint requires a Bearer API key from https://developers.brandfetch.com/."
    );
  }
  return acc.apiKey;
}

export function getClientId(user?: string): string {
  const acc = resolveAccount(user);
  if (!acc.clientId) {
    throw new Error(
      `Account "${acc.user}" has no BRANDFETCH_CLIENT_ID configured. ` +
        "This endpoint requires a Client ID from https://developers.brandfetch.com/."
    );
  }
  return acc.clientId;
}

/**
 * Returns the list of configured user identifiers, lowercased.
 */
export function listConfiguredUsers(): string[] {
  return [...parseAccounts().keys()];
}

/** Test-only: clear the parsed-accounts cache. */
export function _resetAccountsCache(): void {
  cachedAccounts = null;
  cachedSnapshot = undefined;
}

async function readResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function describeError(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const msg =
      (obj.message as string | undefined) ??
      (obj.error as string | undefined) ??
      (obj.detail as string | undefined);
    if (msg) return `Brandfetch API error (${status}): ${msg}`;
  }
  if (typeof data === "string" && data.trim()) {
    return `Brandfetch API error (${status}): ${data.trim()}`;
  }
  return `Brandfetch API error (${status})`;
}

interface RequestOptions {
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | undefined>;
  body?: Record<string, unknown>;
}

/** Authenticated request using Bearer API key. */
export async function brandfetchRequest<T>(
  path: string,
  options: RequestOptions = {},
  user?: string
): Promise<T> {
  const apiKey = getApiKey(user);
  const url = buildUrl(API_BASE_URL, path, options.query);

  const init: RequestInit = {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  };

  const res = await fetch(url, init);
  const data = await readResponse(res);
  if (!res.ok) throw new Error(describeError(data, res.status));
  return data as T;
}

/** Public request authenticated only by the `c` (client ID) query parameter. */
export async function brandfetchPublicRequest<T>(
  path: string,
  options: Omit<RequestOptions, "method" | "body"> = {},
  user?: string
): Promise<T> {
  const clientId = getClientId(user);
  const query = { ...(options.query ?? {}), c: clientId };
  const url = buildUrl(API_BASE_URL, path, query);

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const data = await readResponse(res);
  if (!res.ok) throw new Error(describeError(data, res.status));
  return data as T;
}

export function buildUrl(
  base: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined>
): string {
  const url = new URL(path.replace(/^\//, ""), base.endsWith("/") ? base : base + "/");
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}
