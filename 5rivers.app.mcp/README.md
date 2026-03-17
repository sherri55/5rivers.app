# 5rivers.app MCP Server

MCP server so a local model (Cursor, Claude Desktop, etc.) can answer questions like "show me jobs for 12th Feb 2025" by calling your backend GraphQL API.

## Prerequisites

- Node 18+
- 5rivers backend running at `http://localhost:4001/graphql` (or set `FIVERIVERS_GRAPHQL_URL`)

## Setup

```bash
npm install
cp .env.example .env
npm run build
```

## Run

```bash
node dist/index.js
```

The server uses stdio. Register it in Cursor MCP config so Cursor spawns it and talks over stdio.

## Cursor MCP config

Add to your MCP config (e.g. Settings > MCP):

```json
{
  "mcpServers": {
    "5rivers": {
      "command": "node",
      "args": ["/absolute/path/to/5rivers.app.mcp/dist/index.js"],
      "env": {
        "FIVERIVERS_GRAPHQL_URL": "http://localhost:4001/graphql"
      }
    }
  }
}
```

Use the real absolute path to `dist/index.js`. Optional: `FIVERIVERS_AUTH_TOKEN` if your API requires JWT.

## Tools

- **list_jobs** – date, dateFrom, dateTo, limit, invoiceStatus
- **get_job** – id
- **search_jobs** – query, limit
- **get_dashboard_stats** – year, month
- **list_invoices** – status, limit

See `docs/MCP_SETUP.md` in the repo root for more detail.
