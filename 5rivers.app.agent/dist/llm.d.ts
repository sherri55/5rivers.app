import { type Message } from './conversation.js';
export interface NormalizedToolCall {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
    /** Gemini 3.x thought-signature; only populated by GeminiProvider. */
    thoughtSignature?: string;
}
export interface NormalizedResponse {
    content: string;
    toolCalls?: NormalizedToolCall[];
}
export interface LLMProvider {
    /**
     * Send conversation history to the LLM.
     * `toolFilter` (optional) restricts which tools the model is given access to
     * — used by the pipeline to scope phases (Validator = read-only, Creator =
     * write-enabled).
     */
    chat(messages: Message[], toolFilter?: ReadonlySet<string>): Promise<NormalizedResponse>;
}
/**
 * Resolve a provider by name. When `name` is omitted, falls back to
 * `LLM_PROVIDER` (back-compat for callers that don't know about the router).
 *
 * Each name is constructed at most once — subsequent calls return the same
 * instance (so Gemini's cache manager and LM Studio's /v1/models probe still
 * run only once per process).
 */
export declare function getProvider(name?: string): LLMProvider;
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
