#!/usr/bin/env node
/**
 * 5rivers.app MCP Server
 *
 * Exposes tools so an LLM (e.g. in Cursor, Claude Desktop) can query and
 * manage jobs, drivers, companies, invoices, expenses via the REST API.
 *
 * Run: npx ts-node src/index.ts   or   node dist/index.js
 * Configure in Cursor/Claude Desktop: stdio transport, command: node dist/index.js
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createRestClient } from './rest-client.js';
import { ALL_TOOLS } from './tools.js';

const API_URL = process.env.FIVE_RIVERS_API_URL ?? 'http://localhost:4000/api';
const AUTH_TOKEN = process.env.FIVE_RIVERS_TOKEN;

const client = createRestClient({ baseUrl: API_URL, authToken: AUTH_TOKEN });

const server = new Server(
  { name: '5rivers-app', version: '2.0.0' },
  { capabilities: { tools: {} } },
);

// Register all tools from shared definitions
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: ALL_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

// Dispatch tool calls to shared handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const safeArgs = (args as Record<string, unknown>) ?? {};

  const tool = ALL_TOOLS.find((t) => t.name === name);
  if (!tool) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  try {
    const result = await tool.handler(client, safeArgs);
    return { content: [{ type: 'text', text: result }] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
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
