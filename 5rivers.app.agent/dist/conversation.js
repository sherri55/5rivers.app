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
