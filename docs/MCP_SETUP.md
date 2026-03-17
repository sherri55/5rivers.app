# MCP server setup for 5rivers.app

The **5rivers.app MCP server** lets a local model (e.g. in Cursor) answer natural language questions by calling your backend GraphQL API.

**Example:** User asks *“show me jobs for 12th feb 2025”* → model calls the `list_jobs` tool with `date: "2025-02-12"` → MCP server queries the backend and returns job list → model summarizes for the user.

---

## Quick start

1. **Build the MCP server**
   ```bash
   cd 5rivers.app.mcp
   npm install
   npm run build
   ```

2. **Start the backend** (so the MCP server can call it)
   ```bash
   cd 5rivers.app.backend
   npm run dev
   ```

3. **Add MCP server in Cursor**
   - Open Cursor **Settings** → **MCP** (or edit the MCP config file).
   - Add a server entry that runs the built script with `FIVERIVERS_GRAPHQL_URL` pointing at your backend.

Example config (adjust the path to your repo):

```json
{
  "mcpServers": {
    "5rivers": {
      "command": "node",
      "args": ["D:/Personal/Projects/5rivers.app/5rivers.app.mcp/dist/index.js"],
      "env": {
        "FIVERIVERS_GRAPHQL_URL": "http://localhost:4001/graphql"
      }
    }
  }
}
```

4. Restart or reload Cursor so it picks up the new MCP server. You can then ask in chat things like:
   - “Show me jobs for 12th feb 2025”
   - “How many jobs this month?”
   - “List pending jobs”

---

## Where things live

| Item | Location |
|------|----------|
| MCP server code | `5rivers.app.mcp/` |
| Backend (GraphQL) | `5rivers.app.backend/` (must be running) |
| This doc | `docs/MCP_SETUP.md` |
| MCP server README | `5rivers.app.mcp/README.md` |

The MCP server is **read-only**: it only calls GraphQL queries (jobs, invoices, dashboard). It does not perform mutations.

---

## Optional: auth

If your GraphQL API requires a JWT:

1. In `5rivers.app.mcp`, set in `.env` or in the MCP server `env` in Cursor:
   ```bash
   FIVERIVERS_AUTH_TOKEN=your-jwt-token
   ```
2. The MCP server sends `Authorization: Bearer <token>` on every request.

---

## Tools the model can call

- **list_jobs** – List jobs by date range, single date, or status (e.g. “jobs for 12th feb 2025”, “pending jobs”).
- **get_job** – Get one job by ID.
- **search_jobs** – Full-text search (e.g. ticket id, company name).
- **get_dashboard_stats** – Dashboard summary (totals, comparison).
- **list_invoices** – List invoices with optional status filter.

The model decides when to call which tool from the user’s question and then formats the JSON result into a readable answer.
