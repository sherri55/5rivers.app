/**
 * Conversation manager — maintains per-user message history.
 * Keyed by "platform:userId" (e.g. "telegram:123456").
 */
const MAX_HISTORY = 40; // max messages per conversation before trimming
const conversations = new Map();
function key(platform, userId) {
    return `${platform}:${userId}`;
}
export function getHistory(platform, userId) {
    return conversations.get(key(platform, userId)) ?? [];
}
export function addMessage(platform, userId, message) {
    const k = key(platform, userId);
    const history = conversations.get(k) ?? [];
    history.push(message);
    // Trim old messages but keep the system prompt (first message)
    if (history.length > MAX_HISTORY) {
        const system = history[0]?.role === 'system' ? history[0] : null;
        const trimmed = history.slice(-MAX_HISTORY + (system ? 1 : 0));
        if (system)
            trimmed.unshift(system);
        conversations.set(k, trimmed);
    }
    else {
        conversations.set(k, history);
    }
}
export function clearHistory(platform, userId) {
    conversations.delete(key(platform, userId));
}
/** Strip imageUrls from all messages in history — call after LLM has processed them. */
export function stripImageUrls(platform, userId) {
    const history = conversations.get(key(platform, userId));
    if (!history)
        return;
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
export function sanitizeForProvider(messages, provider) {
    if (provider === 'gemini')
        return messages;
    return messages.map((m) => {
        if (!m.tool_calls?.length)
            return m;
        return {
            ...m,
            tool_calls: m.tool_calls.map(({ thoughtSignature: _ts, ...rest }) => rest),
        };
    });
}
export function setSystemPrompt(platform, userId, systemPrompt) {
    const k = key(platform, userId);
    const history = conversations.get(k) ?? [];
    // Replace or insert system prompt at position 0
    if (history.length > 0 && history[0].role === 'system') {
        history[0] = { role: 'system', content: systemPrompt };
    }
    else {
        history.unshift({ role: 'system', content: systemPrompt });
    }
    conversations.set(k, history);
}
