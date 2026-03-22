/**
 * LLM service — connects to Ollama, runs the agent loop with tool calling.
 *
 * Flow:
 * 1. Pre-load entity context (companies, drivers, etc.) on first message
 * 2. Build system prompt with entity context + instructions
 * 3. Send user message to LLM with tool definitions
 * 4. If LLM returns tool calls → execute → feed results back → repeat
 * 5. Return final text response
 */
import { Ollama } from 'ollama';
import { createRestClient } from '../../5rivers.app.mcp/dist/rest-client.js';
import { ALL_TOOLS } from '../../5rivers.app.mcp/dist/tools.js';
import { getHistory, addMessage, setSystemPrompt, } from './conversation.js';
const OLLAMA_HOST = process.env.OLLAMA_HOST ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.1';
const API_URL = process.env.FIVE_RIVERS_API_URL ?? 'http://localhost:4000/api';
const ollama = new Ollama({ host: OLLAMA_HOST });
// Entity context cache (refreshed periodically)
let entityContextCache = null;
let entityContextTimestamp = 0;
const ENTITY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
async function loadEntityContext(client) {
    const now = Date.now();
    if (entityContextCache && now - entityContextTimestamp < ENTITY_CACHE_TTL) {
        return entityContextCache;
    }
    // Fetch all entities in parallel for context
    const [companies, drivers, dispatchers, jobTypes, units, carriers, categories] = await Promise.all([
        client.companies.list({ limit: 100 }).catch(() => ({ data: [] })),
        client.drivers.list({ limit: 100 }).catch(() => ({ data: [] })),
        client.dispatchers.list({ limit: 100 }).catch(() => ({ data: [] })),
        client.jobTypes.list({ limit: 100 }).catch(() => ({ data: [] })),
        client.units.list({ limit: 100 }).catch(() => ({ data: [] })),
        client.carriers.list({ limit: 100 }).catch(() => ({ data: [] })),
        client.expenseCategories.list({ limit: 100 }).catch(() => ({ data: [] })),
    ]);
    const fmt = (items, fields) => items.map((item) => fields.map((f) => `${f}: ${item[f] ?? '—'}`).join(', ')).join('\n  ') || '(none)';
    entityContextCache = `
## Known Entities (use these IDs when creating jobs/invoices)

### Companies
  ${fmt(companies.data, ['id', 'name'])}

### Drivers
  ${fmt(drivers.data, ['id', 'name'])}

### Dispatchers
  ${fmt(dispatchers.data, ['id', 'name'])}

### Job Types
  ${fmt(jobTypes.data, ['id', 'title', 'companyId', 'rateOfJob'])}

### Units
  ${fmt(units.data, ['id', 'name'])}

### Carriers
  ${fmt(carriers.data, ['id', 'name'])}

### Expense Categories
  ${fmt(categories.data, ['id', 'name'])}
`.trim();
    entityContextTimestamp = now;
    return entityContextCache;
}
function buildSystemPrompt(entityContext) {
    return `You are a fleet operations assistant for 5Rivers. You help manage jobs, drivers, companies, dispatchers, units, carriers, invoices, and expenses.

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
// Convert our tool definitions to Ollama's tool format
function toolsForOllama() {
    return ALL_TOOLS.map((t) => ({
        type: 'function',
        function: {
            name: t.name,
            description: t.description,
            parameters: t.inputSchema,
        },
    }));
}
/**
 * Process a user message through the agent loop.
 * Returns the final text response.
 */
export async function processMessage(platform, userId, userMessage, authToken) {
    const client = createRestClient({ baseUrl: API_URL, authToken });
    const toolCalls = [];
    // Load entity context and set system prompt
    const entityContext = await loadEntityContext(client);
    const systemPrompt = buildSystemPrompt(entityContext);
    setSystemPrompt(platform, userId, systemPrompt);
    // Add user message
    addMessage(platform, userId, { role: 'user', content: userMessage });
    const MAX_ITERATIONS = 10;
    let iterations = 0;
    while (iterations < MAX_ITERATIONS) {
        iterations++;
        const history = getHistory(platform, userId);
        // Convert to Ollama message format
        const messages = history.map((m) => ({
            role: m.role,
            content: m.content,
        }));
        const response = await ollama.chat({
            model: OLLAMA_MODEL,
            messages,
            tools: toolsForOllama(),
        });
        const msg = response.message;
        // If the model wants to call tools
        if (msg.tool_calls && msg.tool_calls.length > 0) {
            // Store assistant message with tool calls
            addMessage(platform, userId, {
                role: 'assistant',
                content: msg.content || '',
                tool_calls: msg.tool_calls.map((tc) => ({
                    function: {
                        name: tc.function.name,
                        arguments: tc.function.arguments,
                    },
                })),
            });
            // Execute each tool call
            for (const tc of msg.tool_calls) {
                const toolName = tc.function.name;
                const toolArgs = tc.function.arguments;
                const toolDef = ALL_TOOLS.find((t) => t.name === toolName);
                let result;
                if (!toolDef) {
                    result = `Error: Unknown tool "${toolName}"`;
                }
                else {
                    try {
                        result = await toolDef.handler(client, toolArgs);
                    }
                    catch (err) {
                        const errMsg = err instanceof Error ? err.message : String(err);
                        result = `Error: ${errMsg}`;
                    }
                }
                toolCalls.push({ name: toolName, args: toolArgs, result });
                addMessage(platform, userId, { role: 'tool', content: result });
            }
            // Continue the loop — LLM needs to process tool results
            continue;
        }
        // No tool calls — this is the final response
        const finalText = msg.content || 'I have nothing to add.';
        addMessage(platform, userId, { role: 'assistant', content: finalText });
        return { text: finalText, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
    }
    // Safety: max iterations reached
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
