/**
 * Conversation manager — maintains per-user message history.
 * Keyed by "platform:userId" (e.g. "telegram:123456").
 */
export interface Message {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
    tool_call_name?: string;
    imageUrls?: string[];
}
export interface ToolCall {
    id?: string;
    function: {
        name: string;
        arguments: Record<string, unknown>;
    };
    /** Gemini 3.x: opaque signature the API attaches to functionCall parts.
     *  We must round-trip it back unchanged or the next turn fails with
     *  "Function call is missing a thought_signature". */
    thoughtSignature?: string;
}
export declare function getHistory(platform: string, userId: string): Message[];
export declare function addMessage(platform: string, userId: string, message: Message): void;
export declare function clearHistory(platform: string, userId: string): void;
/** Strip imageUrls from all messages in history — call after LLM has processed them. */
export declare function stripImageUrls(platform: string, userId: string): void;
/**
 * Strip provider-specific metadata from a message history before sending it
 * to a different provider. Used by the hybrid router when a turn falls back
 * from local → cloud (or vice versa) so that, e.g., Gemini-only fields like
 * `thoughtSignature` don't end up in payloads sent to LM Studio / Groq /
 * Ollama, where they'd be silently ignored at best or cause a parse error
 * at worst.
 *
 * The sanitization is a no-op when handing history to Gemini (it produced
 * those fields and expects them round-tripped). For every other provider we
 * drop `thoughtSignature` from each tool_call.
 *
 * Returns a new array — the input messages are not mutated.
 */
export declare function sanitizeForProvider(messages: Message[], provider: string): Message[];
export declare function setSystemPrompt(platform: string, userId: string, systemPrompt: string): void;
