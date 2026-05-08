/**
 * Wipe everything we hold for a (platform, userId) conversation:
 *   • the chat history (system prompt + all turns)
 *   • the three-phase pipeline state (current phase, parsed data)
 *   • any pending supervision confirmation (regular tool calls)
 *   • any pending document-processor confirmation
 *
 * Use this from /clear commands, the chat widget's clear button, etc.
 * It is safe to call when nothing is set — every clear is a no-op miss.
 */
export declare function resetConversation(platform: string, userId: string): void;
export interface AgentResponse {
    text: string;
    toolCalls?: Array<{
        name: string;
        args: Record<string, unknown>;
        result: string;
    }>;
}
export interface ImageInput {
    data: string;
    mimeType: string;
}
/**
 * Process a user message through the agent loop.
 * Returns the final text response.
 *
 * When SUPERVISION_MODE=true (default), any write tool calls are held and the
 * user is shown a confirmation prompt before they are executed.
 */
export declare function processMessage(platform: string, userId: string, userMessage: string, authToken?: string, images?: ImageInput[]): Promise<AgentResponse>;
