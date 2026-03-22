/**
 * Shared tool definitions for 5Rivers.
 * Used by both the MCP server (stdio) and the agent (Ollama).
 * Transport-agnostic: each tool has a name, description, JSON Schema, and handler.
 */
import type { RestClient } from './rest-client.js';
export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    handler: (client: RestClient, args: Record<string, unknown>) => Promise<string>;
}
export declare const ALL_TOOLS: ToolDefinition[];
