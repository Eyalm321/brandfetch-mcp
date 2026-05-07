# brandfetch-mcp

MCP server for the [Brandfetch API](https://docs.brandfetch.com/) — 9 tools covering brand retrieval (by domain, ticker, ISIN, crypto symbol, brand ID), brand search, transaction-to-merchant resolution, and the Logo CDN. Supports multiple Brandfetch accounts in a single server instance.

## Installation

### npm

```bash
npm install -g brandfetch-mcp-server
```

### GitHub Packages

```bash
npm install -g @eyalm321/brandfetch-mcp-server --registry=https://npm.pkg.github.com
```

## Configuration

Brandfetch uses two credentials:

- **`BRANDFETCH_API_KEY`** — Bearer token for the Brand API and transaction lookup. Get one at [developers.brandfetch.com](https://developers.brandfetch.com/).
- **`BRANDFETCH_CLIENT_ID`** — public Client ID for the Brand Search API and Logo CDN. Free, also from the developer portal.

Configure either or both — tools that need a missing credential will surface a clear error.

### Single account

```bash
export BRANDFETCH_API_KEY="bf_..."
export BRANDFETCH_CLIENT_ID="..."
```

### Multiple accounts

Create a JSON file listing your accounts and point `BRANDFETCH_ACCOUNTS_FILE` at it:

```json
// ~/.brandfetch-accounts.json
[
  { "user": "default", "BRANDFETCH_API_KEY": "bf_...", "BRANDFETCH_CLIENT_ID": "..." },
  { "user": "alice",   "BRANDFETCH_API_KEY": "bf_...", "BRANDFETCH_CLIENT_ID": "..." },
  { "user": "acme",    "BRANDFETCH_CLIENT_ID": "..." }
]
```

```bash
export BRANDFETCH_ACCOUNTS_FILE="$HOME/.brandfetch-accounts.json"
```

The shorthand aliases `apiKey` and `clientId` are also accepted inside the file.

Pass `user` to any tool to switch accounts:

```jsonc
{ "name": "brandfetch_brand_search", "arguments": { "name": "Nike" } }
{ "name": "brandfetch_brand_search", "arguments": { "name": "Nike", "user": "alice" } }
```

User identifiers are case-insensitive.

## Tools

| Tool | Endpoint | Auth |
| --- | --- | --- |
| `brandfetch_brand_get` | `GET /v2/brands/{identifier}` | API key |
| `brandfetch_brand_get_by_domain` | `GET /v2/brands/domain/{domain}` | API key |
| `brandfetch_brand_get_by_ticker` | `GET /v2/brands/ticker/{ticker}` | API key |
| `brandfetch_brand_get_by_isin` | `GET /v2/brands/isin/{isin}` | API key |
| `brandfetch_brand_get_by_crypto` | `GET /v2/brands/crypto/{symbol}` | API key |
| `brandfetch_brand_from_transaction` | `POST /v2/brands/transaction` | API key |
| `brandfetch_brand_search` | `GET /v2/search/{name}?c={clientId}` | Client ID |
| `brandfetch_logo_url` | `https://cdn.brandfetch.io/{identifier}?c={clientId}` | Client ID |
| `brandfetch_list_users` | (local) | none |

## Claude Desktop config

```jsonc
{
  "mcpServers": {
    "brandfetch": {
      "command": "npx",
      "args": ["-y", "brandfetch-mcp-server"],
      "env": {
        "BRANDFETCH_API_KEY": "bf_...",
        "BRANDFETCH_CLIENT_ID": "..."
      }
    }
  }
}
```

## Development

```bash
npm install
npm test
npm run build
```

## License

MIT
