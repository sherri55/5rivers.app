#!/usr/bin/env node
/**
 * 5rivers.app MCP Server
 *
 * Exposes tools so a local model (e.g. in Cursor, Claude Desktop) can answer
 * queries like "show me jobs for 12th feb 2025" by calling the backend GraphQL API.
 *
 * Run: npx ts-node src/index.ts   or   node dist/index.js
 * Configure in Cursor: Settings > MCP > Add server (stdio, command: node dist/index.js)
 */
import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { createBackendClient } from "./backend.js";
// Backend URL from env (default for local dev)
const GRAPHQL_ENDPOINT = process.env.FIVERIVERS_GRAPHQL_URL ?? "http://localhost:4001/graphql";
const AUTH_TOKEN = process.env.FIVERIVERS_AUTH_TOKEN;
const backend = createBackendClient({
    graphqlEndpoint: GRAPHQL_ENDPOINT,
    authToken: AUTH_TOKEN,
});
function parseDateArg(dateStr) {
    // Accept "12th feb 2025", "2025-02-12", "12 feb 2025", "Feb 12, 2025"
    const d = new Date(dateStr);
    if (isNaN(d.getTime()))
        return dateStr;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}
const server = new Server({
    name: "5rivers-app",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "list_jobs",
            description: "List jobs with optional filters. Use for queries like 'show me jobs for 12th feb 2025', 'jobs for driver X', 'pending jobs'. Returns job list with date, amount, driver, status.",
            inputSchema: {
                type: "object",
                properties: {
                    date: {
                        type: "string",
                        description: "Single date (e.g. '2025-02-12' or '12th feb 2025') - returns jobs on that day.",
                    },
                    dateFrom: {
                        type: "string",
                        description: "Start date (YYYY-MM-DD or natural language).",
                    },
                    dateTo: {
                        type: "string",
                        description: "End date (YYYY-MM-DD or natural language).",
                    },
                    limit: {
                        type: "number",
                        description: "Max jobs to return (default 50, max 100).",
                        default: 50,
                    },
                    invoiceStatus: {
                        type: "string",
                        description: "Filter by status: PENDING, RAISED, RECEIVED, etc.",
                    },
                },
            },
        },
        {
            name: "get_job",
            description: "Get a single job by ID. Use when the user asks for details of a specific job.",
            inputSchema: {
                type: "object",
                properties: {
                    id: { type: "string", description: "Job ID." },
                },
                required: ["id"],
            },
        },
        {
            name: "search_jobs",
            description: "Full-text search jobs (e.g. by ticket id, company name). Use when user asks to 'search for X'.",
            inputSchema: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Search query." },
                    limit: { type: "number", default: 10 },
                },
                required: ["query"],
            },
        },
        {
            name: "get_dashboard_stats",
            description: "Get dashboard summary: total jobs, amount, invoices, comparison with previous period. Use for 'how many jobs this month', 'summary', 'overview'.",
            inputSchema: {
                type: "object",
                properties: {
                    year: { type: "number", description: "Year (e.g. 2025)." },
                    month: { type: "number", description: "Month 1-12." },
                },
            },
        },
        {
            name: "list_invoices",
            description: "List invoices with optional filters. Use for 'show invoices', 'invoices for February'.",
            inputSchema: {
                type: "object",
                properties: {
                    status: { type: "string", description: "Invoice status filter." },
                    limit: { type: "number", default: 20 },
                },
            },
        },
    ],
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const safeArgs = args ?? {};
    try {
        if (name === "list_jobs") {
            let dateFrom;
            let dateTo;
            if (safeArgs.date) {
                const d = parseDateArg(String(safeArgs.date));
                dateFrom = d;
                dateTo = d;
            }
            else {
                if (safeArgs.dateFrom)
                    dateFrom = parseDateArg(String(safeArgs.dateFrom));
                if (safeArgs.dateTo)
                    dateTo = parseDateArg(String(safeArgs.dateTo));
            }
            const limit = Math.min(Number(safeArgs.limit) || 50, 100);
            const result = await backend.getJobs({
                dateFrom,
                dateTo,
                invoiceStatus: safeArgs.invoiceStatus,
            }, { page: 1, limit });
            const text = result.nodes.length === 0
                ? "No jobs found for the given filters."
                : JSON.stringify({
                    totalCount: result.totalCount,
                    hasNextPage: result.hasNextPage,
                    jobs: result.nodes,
                }, null, 2);
            return { content: [{ type: "text", text }] };
        }
        if (name === "get_job") {
            const id = String(safeArgs.id ?? "");
            if (!id)
                throw new Error("Job id is required.");
            const job = await backend.getJob(id);
            const text = job
                ? JSON.stringify(job, null, 2)
                : "Job not found.";
            return { content: [{ type: "text", text }] };
        }
        if (name === "search_jobs") {
            const query = String(safeArgs.query ?? "");
            const limit = Math.min(Number(safeArgs.limit) || 10, 50);
            const results = await backend.searchJobs(query, limit);
            const text = results.length === 0
                ? "No jobs matched the search."
                : JSON.stringify(results, null, 2);
            return { content: [{ type: "text", text }] };
        }
        if (name === "get_dashboard_stats") {
            const year = safeArgs.year;
            const month = safeArgs.month;
            const stats = await backend.getDashboardStats(year, month);
            return {
                content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
            };
        }
        if (name === "list_invoices") {
            const status = safeArgs.status;
            const limit = Math.min(Number(safeArgs.limit) || 20, 100);
            const invoices = await backend.getInvoices(undefined, status, limit);
            const text = invoices.length === 0
                ? "No invoices found."
                : JSON.stringify(invoices, null, 2);
            return { content: [{ type: "text", text }] };
        }
        throw new Error(`Unknown tool: ${name}`);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            content: [{ type: "text", text: `Error: ${message}` }],
            isError: true,
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((err) => {
    console.error(err);
    process.exit(1);
});
