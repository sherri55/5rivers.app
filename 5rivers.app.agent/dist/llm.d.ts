export interface AgentResponse {
    text: string;
    toolCalls?: Array<{
        name: string;
        args: Record<string, unknown>;
        result: string;
    }>;
}
/**
 * Process a user message through the agent loop.
 * Returns the final text response.
 */
export declare function processMessage(platform: string, userId: string, userMessage: string, authToken: string): Promise<AgentResponse>;
/**
 * Force-refresh the entity context cache (e.g. after creating a new entity).
 */
export declare function invalidateEntityCache(): void;
