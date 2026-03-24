/**
 * LLM service — provider-agnostic agent loop with tool calling.
 *
 * Supported providers (set LLM_PROVIDER in .env):
 *   ollama  — local Ollama instance (default)
 *   groq    — Groq cloud API (fast, free tier)
 *
 * Flow:
 * 1. Pre-load entity context (companies, drivers, etc.) on first message
 * 2. Build system prompt with entity context + instructions
 * 3. Send user message to LLM with tool definitions
 * 4. If LLM returns tool calls → execute → feed results back → repeat
 * 5. Return final text response
 */
import { setGlobalDispatcher, Agent } from 'undici';
import { Ollama } from 'ollama';
import Groq from 'groq-sdk';
// Increase undici's default headersTimeout (30s) so remote Ollama calls don't abort
// before the model starts generating tokens.
const _timeoutMs = parseInt(process.env.OLLAMA_TIMEOUT_MS ?? '300000');
setGlobalDispatcher(new Agent({ headersTimeout: _timeoutMs, bodyTimeout: _timeoutMs }));
import { createRestClient } from '../../5rivers.app.mcp/dist/rest-client.js';
import { ALL_TOOLS } from '../../5rivers.app.mcp/dist/tools.js';
import { getHistory, addMessage, setSystemPrompt, } from './conversation.js';
import { getAutoToken, clearAutoToken } from './auth.js';
const API_URL = process.env.FIVE_RIVERS_API_URL ?? 'http://localhost:4000/api';
// ─── Tool definitions (same format for both providers) ───────────────────────
// Tools the agent should never call — auth is handled internally
const AGENT_EXCLUDED_TOOLS = new Set(['login']);
function getToolDefs() {
    return ALL_TOOLS
        .filter((t) => !AGENT_EXCLUDED_TOOLS.has(t.name))
        .map((t) => ({
        type: 'function',
        function: {
            name: t.name,
            description: t.description,
            parameters: t.inputSchema,
        },
    }));
}
// ─── Ollama provider ──────────────────────────────────────────────────────────
let _ollama = null;
class OllamaProvider {
    getClient() {
        if (!_ollama) {
            // Strip any path suffix (e.g. system env may have /api/generate appended)
            const rawHost = process.env.OLLAMA_HOST ?? 'http://localhost:11434';
            const host = new URL(rawHost).origin;
            const timeoutMs = parseInt(process.env.OLLAMA_TIMEOUT_MS ?? '300000');
            _ollama = new Ollama({
                host,
                fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) }),
            });
        }
        return _ollama;
    }
    async chat(messages) {
        const model = process.env.OLLAMA_MODEL ?? 'llama3.1';
        const response = await this.getClient().chat({
            model,
            messages: messages.map((m) => ({
                role: m.role,
                content: m.content,
                tool_calls: m.tool_calls?.map((tc) => ({
                    function: { name: tc.function.name, arguments: tc.function.arguments },
                })),
            })),
            tools: getToolDefs(),
            options: {
                temperature: 0.1,
                num_ctx: parseInt(process.env.OLLAMA_NUM_CTX ?? '16384'),
            },
        });
        const msg = response.message;
        const toolCalls = msg.tool_calls?.map((tc, i) => ({
            id: `ollama-${Date.now()}-${i}`,
            name: tc.function.name,
            arguments: tc.function.arguments,
        }));
        return { content: msg.content || '', toolCalls };
    }
}
// ─── Groq provider ────────────────────────────────────────────────────────────
let _groq = null;
class GroqProvider {
    getClient() {
        if (!_groq) {
            _groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        }
        return _groq;
    }
    async chat(messages) {
        const model = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';
        // Convert to Groq message format (OpenAI-compatible)
        const groqMessages = messages.map((m) => {
            if (m.role === 'tool') {
                return {
                    role: 'tool',
                    tool_call_id: m.tool_call_id ?? 'unknown',
                    content: m.content,
                };
            }
            if (m.role === 'assistant' && m.tool_calls?.length) {
                return {
                    role: 'assistant',
                    content: m.content || null,
                    tool_calls: m.tool_calls.map((tc) => ({
                        id: tc.id ?? 'unknown',
                        type: 'function',
                        function: {
                            name: tc.function.name,
                            arguments: JSON.stringify(tc.function.arguments),
                        },
                    })),
                };
            }
            return { role: m.role, content: m.content };
        });
        const response = await this.getClient().chat.completions.create({
            model,
            messages: groqMessages,
            tools: getToolDefs(),
            tool_choice: 'auto',
        });
        const msg = response.choices[0].message;
        const toolCalls = msg.tool_calls?.map((tc) => ({
            id: tc.id,
            name: tc.function.name,
            arguments: (() => {
                try {
                    const parsed = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
                    return (parsed !== null && typeof parsed === 'object') ? parsed : {};
                }
                catch {
                    return {};
                }
            })(),
        }));
        return { content: msg.content || '', toolCalls };
    }
}
// ─── Provider factory ─────────────────────────────────────────────────────────
let _provider = null;
function getProvider() {
    if (!_provider) {
        const name = (process.env.LLM_PROVIDER ?? 'ollama').toLowerCase();
        if (name === 'groq') {
            console.log(`[llm] Provider: Groq (${process.env.GROQ_MODEL ?? 'llama-3.1-70b-versatile'})`);
            _provider = new GroqProvider();
        }
        else {
            const _rawHost = process.env.OLLAMA_HOST ?? 'http://localhost:11434';
            const _cleanHost = new URL(_rawHost).origin;
            console.log(`[llm] Provider: Ollama (${process.env.OLLAMA_MODEL ?? 'llama3.1'} @ ${_cleanHost})`);
            _provider = new OllamaProvider();
        }
    }
    return _provider;
}
// ─── Entity context ───────────────────────────────────────────────────────────
let entityContextCache = null;
let entityContextTimestamp = 0;
const ENTITY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
async function loadEntityContext(client) {
    const now = Date.now();
    if (entityContextCache && now - entityContextTimestamp < ENTITY_CACHE_TTL) {
        return entityContextCache;
    }
    const [companies, drivers, dispatchers, jobTypes, units, carriers, categories] = await Promise.all([
        client.companies.list({ limit: 100 }).catch(() => ({ data: [] })),
        client.drivers.list({ limit: 100 }).catch(() => ({ data: [] })),
        client.dispatchers.list({ limit: 100 }).catch(() => ({ data: [] })),
        client.jobTypes.list({ limit: 100 }).catch(() => ({ data: [] })),
        client.units.list({ limit: 100 }).catch(() => ({ data: [] })),
        client.carriers.list({ limit: 100 }).catch(() => ({ data: [] })),
        client.expenseCategories.list({ limit: 100 }).catch(() => ({ data: [] })),
    ]);
    // Compact format: "id | name" — keeps token count low
    const fmtPairs = (items, nameField = 'name') => items.map((item) => `${item['id']} | ${item[nameField] ?? '—'}`).join('\n  ') || '(none)';
    // Job types: group by company name to avoid repeating UUIDs; only show title + rate
    const fmtJobTypes = (items) => items.map((jt) => `${jt['id']} | ${jt['title']} ($${jt['rateOfJob'] ?? '?'})`).join('\n  ') || '(none)';
    entityContextCache = `
## Known Entities (use IDs when calling tools)

### Companies
  ${fmtPairs(companies.data)}

### Drivers
  ${fmtPairs(drivers.data)}

### Dispatchers
  ${fmtPairs(dispatchers.data)}

### Job Types
  ${fmtJobTypes(jobTypes.data)}

### Units
  ${fmtPairs(units.data)}

### Carriers
  ${fmtPairs(carriers.data)}

### Expense Categories
  ${fmtPairs(categories.data)}
`.trim();
    entityContextTimestamp = now;
    return entityContextCache;
}
// ─── System prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt(entityContext) {
    const easternNow = new Date().toLocaleString('en-US', {
        timeZone: 'America/Toronto',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
    const easternDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
    return `You are a fleet operations assistant for 5Rivers. You help manage jobs, drivers, companies, dispatchers, units, carriers, invoices, and expenses.

## Timezone
All dates and times are in **Eastern Time** (America/Toronto — EDT in summer, EST in winter).
Current date/time: **${easternNow}** (${easternDate}).
When the user says "today", "tomorrow", "this week", "last month", etc., interpret it relative to this Eastern Time date.
All startTime/endTime values are in Eastern Time. All jobDate values are calendar dates in Eastern Time.

## How to interpret user messages

Users often send casual, unstructured messages — especially from mobile. Examples:

"28th November
Wrooms dispatching
Birnam to St Thomas
7am to 4pm
MH 6:30am to 4:30pm"

This means: Create a job on Nov 28, for company/dispatcher "Wrooms dispatching", from Birnam to St Thomas, job hours 7am-4pm, driver with initials "MH" working 6:30am-4:30pm.

Parse these messages by extracting:
- **Date** — any date reference (tomorrow, Friday, March 15, etc.)
- **Company/Dispatcher** — match against the known entities below
- **Locations** — origin → destination
- **Job hours** — the time range for the job (startTime, endTime)
- **Driver** — match by full name, partial name, or initials against known drivers
- **Driver hours** — sometimes different from job hours
- **Job type** — "hourly", "flat rate", "tonnage", etc.
- **Multiple jobs** — users may list several jobs in one message

## Fuzzy matching rules
- Match company/driver/dispatcher names loosely: "Wrooms" → "Wrooms Dispatching", "MH" → match initials of driver names
- If multiple matches exist, ask which one the user means
- If no match, suggest the closest options from the entity list

## Required fields reference
- **Job**: jobDate (required), jobTypeId (required). Optional: driverId, dispatcherId, unitId, carrierId, startTime, endTime, weight, loads, amount
- **Job Type**: companyId (required), title (required). Optional: rateOfJob, dispatchType
- **Expense**: description (required), amount (required), expenseDate (required). Optional: categoryId, vendor, paymentMethod, recurring, recurringFrequency
- **Invoice**: invoiceDate (required), plus dispatcherId OR companyId
- **Driver/Company/Dispatcher/Unit/Carrier**: name (required)

## How to search for jobs
When the user mentions a company, dispatcher, or driver name TOGETHER with a date:
- **ALWAYS pass BOTH the date AND the search parameter in a single list_jobs call.**
- Example: "Wroom job on Oct 3" → list_jobs(date="2025-10-03", search="Wroom")
- Example: "Bre-Ex jobs in October" → list_jobs(dateFrom="2025-10-01", dateTo="2025-10-31", search="Bre-Ex")
- NEVER call list_jobs with only search (no date) or only date (no search) when the user specified both.
- The search parameter searches across company name, dispatcher name, driver name, job type title, locations, and ticket IDs.
- Each job in the response contains: companyName, dispatcherName, driverName, unitName, startTime, endTime, amount, jobPaid, driverPaid.

## Behavior rules
1. **Ask for missing required fields** — never guess company, driver, or amounts
2. **Confirm before creating** — summarize what you understood and ask "Should I create this?"
3. **After user confirms** — execute the tool call and report the result
4. **On error** — explain what went wrong in simple terms and suggest how to fix it
5. **On ambiguity** — present options and ask the user to choose
6. **Multiple items** — handle batch requests (e.g. "2 jobs on Friday") by parsing each and confirming all before creating
7. **Gibberish or unclear input** — respond with: "I didn't understand that. You can ask me things like 'show today's jobs', 'add an expense', or 'create a job for tomorrow'. Type /help for all commands."

${entityContext}`;
}
/**
 * Process a user message through the agent loop.
 * Returns the final text response.
 */
export async function processMessage(platform, userId, userMessage, authToken) {
    const resolvedToken = authToken?.trim() || (await getAutoToken());
    if (!resolvedToken) {
        return {
            text: 'No authentication token found. Set FIVE_RIVERS_EMAIL, FIVE_RIVERS_PASSWORD, and FIVE_RIVERS_ORG_SLUG in .env, or register your token with /register <token>.',
        };
    }
    const client = createRestClient({ baseUrl: API_URL, authToken: resolvedToken });
    const toolCalls = [];
    const provider = getProvider();
    console.log('[llm] Loading entity context...');
    const entityContext = await loadEntityContext(client);
    const systemPrompt = buildSystemPrompt(entityContext);
    setSystemPrompt(platform, userId, systemPrompt);
    addMessage(platform, userId, { role: 'user', content: userMessage });
    const MAX_ITERATIONS = 10;
    let iterations = 0;
    while (iterations < MAX_ITERATIONS) {
        iterations++;
        console.log(`[llm] Sending to ${process.env.LLM_PROVIDER ?? 'ollama'} (iteration ${iterations})...`);
        // Strip excluded tool calls (e.g. login) from history before sending to LLM
        const rawHistory = getHistory(platform, userId);
        const excludedIds = new Set(rawHistory
            .flatMap((m) => m.tool_calls ?? [])
            .filter((tc) => AGENT_EXCLUDED_TOOLS.has(tc.function.name))
            .map((tc) => tc.id)
            .filter(Boolean));
        const history = rawHistory
            .map((m) => {
            if (m.role === 'tool' && m.tool_call_id && excludedIds.has(m.tool_call_id))
                return null;
            if (m.role === 'assistant' && m.tool_calls?.length) {
                const filtered = m.tool_calls.filter((tc) => !AGENT_EXCLUDED_TOOLS.has(tc.function.name));
                if (filtered.length === 0 && !m.content)
                    return null;
                return { ...m, tool_calls: filtered.length > 0 ? filtered : undefined };
            }
            return m;
        })
            .filter(Boolean);
        let response;
        try {
            response = await provider.chat(history);
        }
        catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            // Rate limit
            const rateLimitMatch = errMsg.match(/try again in (\d+m[\d.]+s)/i);
            if (errMsg.includes('429') || errMsg.toLowerCase().includes('rate_limit')) {
                const wait = rateLimitMatch ? ` Please try again in ${rateLimitMatch[1]}.` : '';
                return { text: `Rate limit reached for the AI provider.${wait}` };
            }
            throw err;
        }
        // LLM wants to call tools
        if (response.toolCalls && response.toolCalls.length > 0) {
            // Store assistant message with tool calls (include IDs for Groq)
            addMessage(platform, userId, {
                role: 'assistant',
                content: response.content,
                tool_calls: response.toolCalls.map((tc) => ({
                    id: tc.id,
                    function: { name: tc.name, arguments: tc.arguments },
                })),
            });
            // Execute each tool and store result
            for (const tc of response.toolCalls) {
                const toolDef = ALL_TOOLS.find((t) => t.name === tc.name);
                let result;
                console.log(`[tool] ${tc.name} args: ${JSON.stringify(tc.arguments)}`);
                if (!toolDef) {
                    result = `Error: Unknown tool "${tc.name}"`;
                }
                else {
                    try {
                        result = await toolDef.handler(client, tc.arguments);
                    }
                    catch (err) {
                        const errMsg = err instanceof Error ? err.message : String(err);
                        const stack = err instanceof Error ? err.stack : undefined;
                        if (errMsg.includes('401') || errMsg.toLowerCase().includes('unauthorized') || errMsg.toLowerCase().includes('invalid or expired')) {
                            clearAutoToken();
                            return {
                                text: 'Session expired. Clearing cached token — please send your message again to re-authenticate automatically.',
                                toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                            };
                        }
                        if (stack)
                            console.error(`[tool] ${tc.name} stack: ${stack}`);
                        result = `Error: ${errMsg}`;
                    }
                }
                console.log(`[tool] ${tc.name} → ${result.slice(0, 200)}${result.length > 200 ? '...' : ''}`);
                toolCalls.push({ name: tc.name, args: tc.arguments, result });
                // Store tool result — include tool_call_id for Groq/OpenAI compatibility
                addMessage(platform, userId, {
                    role: 'tool',
                    content: result,
                    tool_call_id: tc.id,
                });
            }
            continue;
        }
        // Final response
        const finalText = response.content || 'I have nothing to add.';
        addMessage(platform, userId, { role: 'assistant', content: finalText });
        return { text: finalText, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
    }
    const fallback = 'I ran into too many steps processing your request. Could you try simplifying it?';
    addMessage(platform, userId, { role: 'assistant', content: fallback });
    return { text: fallback, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
}
/**
 * Force-refresh the entity context cache (e.g. after creating a new entity).
 */
export function invalidateEntityCache() {
    entityContextCache = null;
    entityContextTimestamp = 0;
}
