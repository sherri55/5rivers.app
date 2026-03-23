/**
 * Conversation manager — maintains per-user message history.
 * Keyed by "platform:userId" (e.g. "telegram:123456").
 */
export interface Message {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
}
export interface ToolCall {
    id?: string;
    function: {
        name: string;
        arguments: Record<string, unknown>;
    };
}
export declare function getHistory(platform: string, userId: string): Message[];
export declare function addMessage(platform: string, userId: string, message: Message): void;
export declare function clearHistory(platform: string, userId: string): void;
export declare function setSystemPrompt(platform: string, userId: string, systemPrompt: string): void;
