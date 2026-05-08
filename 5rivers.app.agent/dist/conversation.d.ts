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
export declare function setSystemPrompt(platform: string, userId: string, systemPrompt: string): void;
