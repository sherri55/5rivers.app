/**
 * Document Processor — code-driven orchestrator for tickets and paystubs.
 *
 * Replaces all workflow logic that was previously in the system prompt.
 * Calls tool handlers directly via ALL_TOOLS — no LLM involved.
 */
import type { RestClient } from '../../5rivers.app.mcp/dist/rest-client.js';
import type { DocumentExtraction } from './ocr-parser.js';
export interface ProcessorAction {
    tool: string;
    args: Record<string, unknown>;
    result: string;
    status: 'success' | 'error';
}
export interface PendingDocAction {
    confirmationText: string;
    writes: Array<{
        tool: string;
        args: Record<string, unknown>;
    }>;
}
export interface ProcessorResult {
    text: string;
    actions: ProcessorAction[];
    needsConfirmation?: PendingDocAction;
}
/**
 * Process a parsed document extraction.
 * Returns a formatted text response and audit trail.
 *
 * For `unknown` extraction types, returns null — the caller should fall
 * through to the tool-calling model.
 */
export declare function processDocument(extraction: DocumentExtraction, client: RestClient, supervised: boolean): Promise<ProcessorResult | null>;
/**
 * Format the results of executing pending document writes (after user confirmation).
 * Called from llm.ts when the user confirms a pending document action.
 */
export declare function formatWriteResults(toolResults: Array<{
    name: string;
    args: Record<string, unknown>;
    result: string;
}>): string;
