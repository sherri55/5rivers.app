/**
 * Conversation manager — maintains per-user message history.
 * Keyed by "platform:userId" (e.g. "telegram:123456").
 */

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string; // required by OpenAI/Groq for tool result messages
  imageUrls?: string[];  // base64 data URIs for vision messages (current turn only)
}

export interface ToolCall {
  id?: string; // required by OpenAI/Groq
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

const MAX_HISTORY = 40; // max messages per conversation before trimming

const conversations = new Map<string, Message[]>();

function key(platform: string, userId: string): string {
  return `${platform}:${userId}`;
}

export function getHistory(platform: string, userId: string): Message[] {
  return conversations.get(key(platform, userId)) ?? [];
}

export function addMessage(platform: string, userId: string, message: Message): void {
  const k = key(platform, userId);
  const history = conversations.get(k) ?? [];
  history.push(message);

  // Trim old messages but keep the system prompt (first message)
  if (history.length > MAX_HISTORY) {
    const system = history[0]?.role === 'system' ? history[0] : null;
    const trimmed = history.slice(-MAX_HISTORY + (system ? 1 : 0));
    if (system) trimmed.unshift(system);
    conversations.set(k, trimmed);
  } else {
    conversations.set(k, history);
  }
}

export function clearHistory(platform: string, userId: string): void {
  conversations.delete(key(platform, userId));
}

/** Strip imageUrls from all messages in history — call after LLM has processed them. */
export function stripImageUrls(platform: string, userId: string): void {
  const history = conversations.get(key(platform, userId));
  if (!history) return;
  for (const msg of history) {
    delete msg.imageUrls;
  }
}

export function setSystemPrompt(platform: string, userId: string, systemPrompt: string): void {
  const k = key(platform, userId);
  const history = conversations.get(k) ?? [];
  // Replace or insert system prompt at position 0
  if (history.length > 0 && history[0].role === 'system') {
    history[0] = { role: 'system', content: systemPrompt };
  } else {
    history.unshift({ role: 'system', content: systemPrompt });
  }
  conversations.set(k, history);
}
