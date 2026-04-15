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
