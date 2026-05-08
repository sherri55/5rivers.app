/**
 * Conversation manager — maintains per-user message history.
 * Keyed by "platform:userId" (e.g. "telegram:123456").
 */

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string; // required by OpenAI/Groq for tool result messages
  tool_call_name?: string; // function name for tool results (used by Gemini)
  imageUrls?: string[];  // base64 data URIs for vision messages (current turn only)
}

export interface ToolCall {
  id?: string; // required by OpenAI/Groq
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
  /** Gemini 3.x: opaque signature the API attaches to functionCall parts.
   *  We must round-trip it back unchanged or the next turn fails with
   *  "Function call is missing a thought_signature". */
  thoughtSignature?: string;
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
export function sanitizeForProvider(messages: Message[], provider: string): Message[] {
  if (provider === 'gemini') return messages;
  return messages.map((m) => {
    if (!m.tool_calls?.length) return m;
    return {
      ...m,
      tool_calls: m.tool_calls.map(({ thoughtSignature: _ts, ...rest }) => rest),
    };
  });
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
