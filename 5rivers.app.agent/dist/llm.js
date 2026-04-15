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
import { getHistory, addMessage, setSystemPrompt, stripImageUrls, } from './conversation.js';
import { getAutoToken, clearAutoToken } from './auth.js';
import { parseOCROutput } from './ocr-parser.js';
import { processDocument, formatWriteResults } from './document-processor.js';
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
        if (!response.choices?.length) {
            console.error('[groq] Unexpected response:', JSON.stringify(response).slice(0, 300));
            return { content: '', toolCalls: [] };
        }
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
/** Fetch the list of loaded model IDs from LM Studio and log them. */
async function probeLMStudioModels(host) {
    try {
        const res = await fetch(`${host}/v1/models`, {
            headers: { Authorization: 'Bearer lm-studio' },
        });
        const data = await res.json();
        if (data.data?.length) {
            console.log('[lmstudio] Loaded models:');
            data.data.forEach((m) => console.log(`[lmstudio]   "${m.id}"`));
        }
        else {
            console.log('[lmstudio] No models reported by /v1/models');
        }
    }
    catch (err) {
        console.warn('[lmstudio] Could not probe /v1/models:', err instanceof Error ? err.message : err);
    }
}
function parseLMStudioResponse(data, label) {
    if (data.error?.message) {
        throw new Error(`LM Studio (${label}): ${data.error.message}`);
    }
    if (!data.choices?.length) {
        throw new Error(`LM Studio (${label}): response contained no choices — ${JSON.stringify(data).slice(0, 200)}`);
    }
    const msg = data.choices[0].message;
    // Log what the model actually returned so empty-response issues are visible
    const snippet = (msg.content ?? '').slice(0, 120);
    const tcCount = msg.tool_calls?.length ?? 0;
    console.log(`[lmstudio] (${label}) content="${snippet}${snippet.length === 120 ? '…' : ''}" tool_calls=${tcCount}`);
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
class LMStudioProvider {
    async chat(messages) {
        const host = process.env.LMSTUDIO_HOST ?? 'http://localhost:1234';
        const url = `${host}/v1/chat/completions`;
        const model = process.env.LMSTUDIO_TOOL_MODEL;
        if (!model)
            throw new Error('LMSTUDIO_TOOL_MODEL is not set in .env');
        const body = {
            model,
            // System messages are excluded — system prompt is managed in LM Studio's model preset.
            // Temperature, top_p, and all sampling settings are also managed there.
            // The agent only sends conversation turns and tool definitions.
            messages: messages
                .filter((m) => m.role !== 'system')
                .map((m) => {
                if (m.role === 'tool') {
                    return { role: 'tool', tool_call_id: m.tool_call_id ?? 'unknown', content: m.content };
                }
                if (m.role === 'assistant' && m.tool_calls?.length) {
                    return {
                        role: 'assistant',
                        content: m.content || null,
                        tool_calls: m.tool_calls.map((tc) => ({
                            id: tc.id ?? 'unknown',
                            type: 'function',
                            function: { name: tc.function.name, arguments: JSON.stringify(tc.function.arguments) },
                        })),
                    };
                }
                return { role: m.role, content: m.content };
            }),
            tools: getToolDefs(),
            tool_choice: 'auto',
            stream: false,
        };
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer lm-studio' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        return parseLMStudioResponse(data, `tool model: ${model ?? 'unspecified'}`);
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
        else if (name === 'lmstudio') {
            const host = process.env.LMSTUDIO_HOST ?? 'http://localhost:1234';
            const toolModel = process.env.LMSTUDIO_TOOL_MODEL;
            const visionModel = process.env.LMSTUDIO_VISION_MODEL;
            const visionHost = process.env.LMSTUDIO_VISION_HOST ?? host;
            if (!toolModel) {
                throw new Error('[lmstudio] LMSTUDIO_TOOL_MODEL is not set in .env — required when multiple models are loaded in LM Studio');
            }
            console.log('[llm] Provider: LM Studio');
            console.log(`[llm]   tool  : ${toolModel} @ ${host}`);
            console.log(`[llm]   vision: ${visionModel ?? '(unset — images will be skipped)'} @ ${visionHost}`);
            // Probe /v1/models so the log shows exact IDs LM Studio expects
            probeLMStudioModels(host).catch(() => { });
            _provider = new LMStudioProvider();
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
// ─── OCR pre-processing (vision model) ───────────────────────────────────────
/**
 * Reference prompt for the OCR/vision model (google/gemma-4-e4b).
 * Paste into LM Studio → Model Preset → System Prompt for the vision model.
 * NOT sent via the API.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * You are a document OCR engine for 5Rivers Trucking. Your ONLY job is to read
 * images and output structured data. You do NOT call tools, make decisions, or
 * take any action.
 *
 * First identify whether the image is a TICKET or a PAYSTUB, then extract:
 *
 * ━━ TICKET / TIMESHEET ━━
 * TYPE: ticket
 * DATE: <date as printed>
 * TICKET_NUMBER: <ticket or reference number, or "not visible">
 * COMPANY: <letterhead name — the organization that issued this ticket>
 * DISPATCHER: <value of "Trucking Co" / "Dispatched by" field, or "not visible">
 * UNIT: <truck number or unit ID, or "not visible">
 * DRIVER: <driver name or initials, or "not visible">
 * START_TIME: <as printed, or "not visible">
 * END_TIME: <as printed, or "not visible">
 * START_LOCATION: <haul from / origin, or "not visible">
 * END_LOCATION: <haul to / destination, or "not visible">
 * MATERIAL: <material type if shown, or "not visible">
 *
 * ━━ PAYSTUB / REMITTANCE ━━
 * TYPE: paystub
 * ISSUED_BY: <company name from the header — the company that is paying>
 * PERIOD_FROM: <pay period start date, or "not visible">
 * PERIOD_TO: <pay period end date, or "not visible">
 * LINE_ITEMS:
 * - DATE: <date as printed> | AMOUNT: <dollar amount for THAT ROW ONLY> | REF: <ref or ticket number, or "none">
 *
 * ━━ CRITICAL PAYSTUB RULES ━━
 * - Each row in the table = exactly one LINE_ITEMS entry. 20 rows → 20 entries.
 * - NEVER output the cheque total, grand total, or subtotal as a line item.
 * - NEVER combine multiple rows into one entry.
 * - Copy every date and amount exactly as printed — do not convert or reformat.
 * - Ignore rows labelled "Total", "Subtotal", "Grand Total", "Cheque Amount".
 *
 * ━━ GENERAL RULES ━━
 * - Copy all values exactly as printed — do not interpret, convert, or correct.
 * - If a field is not visible write "not visible".
 * - Output ONLY the structured data — no explanations, no commentary.
 * ─────────────────────────────────────────────────────────────────────────────
 */
/**
 * Send images to the dedicated OCR/vision model via the OpenAI-compatible
 * /v1/chat/completions endpoint.
 * System prompt is managed entirely in LM Studio's model preset — not sent here.
 * Only the user turn (text + images) is sent.
 */
async function callOCRModel(userMessage, images) {
    const host = process.env.LMSTUDIO_VISION_HOST ?? process.env.LMSTUDIO_HOST ?? 'http://localhost:1234';
    const model = process.env.LMSTUDIO_VISION_MODEL;
    if (!model) {
        console.warn('[ocr] LMSTUDIO_VISION_MODEL is not set — skipping OCR');
        return '[OCR skipped: LMSTUDIO_VISION_MODEL not configured]';
    }
    // Send the full extraction format as the user message so OCR output is
    // deterministic regardless of LM Studio preset configuration.
    const extractionInstruction = `Read this image carefully. Output ONLY structured data — no commentary.

Determine if this is a TICKET or PAYSTUB.

TICKET — output exactly:
TYPE: ticket
DATE: <date as printed>
TICKET_NUMBER: <number or "not visible">
COMPANY: <letterhead name>
DISPATCHER: <"Trucking Co" / "Dispatched by" field, or "not visible">
UNIT: <truck/unit number, or "not visible">
DRIVER: <name or initials, or "not visible">
START_TIME: <as printed, or "not visible">
END_TIME: <as printed, or "not visible">
START_LOCATION: <origin, or "not visible">
END_LOCATION: <destination, or "not visible">
MATERIAL: <type, or "not visible">

PAYSTUB — output exactly:
TYPE: paystub
ISSUED_BY: <company from header — the payer>
PERIOD_FROM: <start date, or "not visible">
PERIOD_TO: <end date, or "not visible">
LINE_ITEMS:
- DATE: <date as printed> | AMOUNT: <dollar amount for THIS ROW ONLY> | REF: <ref or "none">

CRITICAL RULES:
- Each table row = one LINE_ITEMS entry. 20 rows → 20 entries.
- NEVER include totals, subtotals, or cheque amounts as line items.
- Copy dates and amounts exactly as printed.
- "not visible" for anything unreadable.`;
    const userContent = [
        { type: 'text', text: extractionInstruction },
        ...images.map((img) => ({
            type: 'image_url',
            image_url: { url: `data:${img.mimeType};base64,${img.data}` },
        })),
    ];
    const body = {
        model,
        messages: [
            { role: 'user', content: userContent },
        ],
        stream: false,
    };
    const url = `${host}/v1/chat/completions`;
    console.log(`[ocr] Sending ${images.length} image(s) to ${model} @ ${url}`);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer lm-studio' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        const result = parseLMStudioResponse(data, `ocr: ${model}`);
        console.log(`[ocr] Full extraction (${result.content.length} chars):\n${result.content}`);
        return result.content || '[OCR model returned no content]';
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[ocr] Error: ${msg}`);
        return `[OCR failed: ${msg}]`;
    }
}
// ─── Supervision mode ────────────────────────────────────────────────────────
/** Returns true when the tool name represents a mutating (write) operation. */
function isWriteTool(name) {
    return /^(create|update|delete|mark|set|add|remove)_/.test(name);
}
/** In-memory store of pending confirmations, keyed by "platform:userId". */
const pendingConfirmations = new Map();
/** Pending confirmations from the code-driven document processor. */
const pendingDocConfirmations = new Map();
function supervisionKey(platform, userId) {
    return `${platform}:${userId}`;
}
/**
 * Supervision mode is ON by default.
 * Set SUPERVISION_MODE=false in .env to disable.
 */
function isSupervisionEnabled() {
    const v = (process.env.SUPERVISION_MODE ?? 'true').toLowerCase();
    return v !== 'false' && v !== '0' && v !== 'off';
}
function buildConfirmationText(writeCalls) {
    const items = writeCalls.map((tc, i) => {
        const argLines = Object.entries(tc.arguments)
            .map(([k, v]) => `  - **${k}**: \`${JSON.stringify(v)}\``)
            .join('\n');
        return `${i + 1}. **${tc.name}**\n${argLines || '  *(no arguments)*'}`;
    }).join('\n\n');
    const plural = writeCalls.length > 1 ? 's' : '';
    return `⚠️ **Supervision mode** — I want to make the following change${plural}:\n\n${items}\n\nReply **yes** to confirm or **no** to cancel.`;
}
const CONFIRM_RE = /^\s*(yes|confirm|go\s*ahead|proceed|do\s*it|ok(?:ay)?|sure|yep|yeah|👍|y)\s*[.!]?\s*$/i;
const CANCEL_RE = /^\s*(no|cancel|stop|abort|nope|nah|👎|n)\s*[.!]?\s*$/i;
// ─── System prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt() {
    const easternDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
    const provider = (process.env.LLM_PROVIDER ?? 'ollama').toLowerCase();
    if (provider === 'lmstudio') {
        return buildSimplifiedPrompt(easternDate);
    }
    return buildFullPrompt(easternDate);
}
/**
 * Simplified prompt for LM Studio (~15 lines).
 * Document processing (tickets, paystubs) is handled entirely by code in
 * document-processor.ts — the model only handles free-form conversation.
 */
function buildSimplifiedPrompt(easternDate) {
    return `You are a 5Rivers Trucking fleet assistant. Today: ${easternDate}.
Tools: jobs, drivers, dispatchers, companies, units, invoices, expenses.

━━ RULES ━━
1. TOOL FIRST. Call the tool before showing any data.
2. COPY VERBATIM. Show values exactly as tools return them.
3. NO INVENTED DATES. Say "Here are the jobs:" — never invent a date.
4. ANSWER THEN STOP. No "Would you like more details?" unprompted.
5. YOU CALL THE TOOLS. Never ask the user to provide tool results.
6. NO PLACEHOLDER TEXT. Never write [Date], [Amount], $X,XXX or template values.

━━ ID RESOLUTION ━━
list_dispatchers / list_companies / list_drivers / list_units return:
  USE_ID: <uuid>      → use it directly in the next call
  MULTIPLE_MATCHES    → use the first listed id
  NO_MATCH            → show the full list, ask user which is correct
Never invent a UUID.

Company = ticket letterhead (companyId). Dispatcher = "Trucking Co" field (dispatcherId).`;
}
/**
 * Full prompt for Groq / Ollama providers.
 * These larger models handle document workflows via prompt instructions.
 */
function buildFullPrompt(easternDate) {
    return `You are a 5Rivers Trucking fleet assistant. Today: ${easternDate}.
Tools: jobs, drivers, dispatchers, companies, units, invoices, expenses.

━━ ABSOLUTE RULES ━━
A1. TOOL FIRST. Never show a job, date, amount, name, or ID without calling the tool that returns it.
A2. COPY VERBATIM. Show every value exactly as the tool returned it. Never rephrase or fill gaps.
A3. NO INVENTED DATES. Jobs span different dates — never invent a single date for your intro.
    WRONG: "I found jobs on 2025-12-14:"   RIGHT: "Here are the jobs:"
A4. ANSWER THEN STOP. Show the result and stop. Never ask "Would you like more details?" unprompted.
A5. NOTHING FROM MEMORY. Tool returned nothing → say "No results found." Never guess.
A6. NO PLACEHOLDER TEXT. Never write [Date], [Amount], [ID], $X,XXX or any template value.
A7. YOU CALL THE TOOLS. The user cannot run tools or provide tool results. If you need data, call the tool yourself — right now, in this response. Never say "please provide the results" or "please run the tool" or "I need you to call". Just call it.

━━ ID RESOLUTION ━━
Use list_dispatchers / list_companies / list_drivers / list_units with search="<name>".
Read the response keyword and act immediately — no extra questions:
  USE_ID: <uuid>    → use that uuid in the next call right away
  MULTIPLE_MATCHES  → use the first listed id
  NO_MATCH          → show the user the full name list, ask which is correct
Never invent a UUID.

━━ COMPANY vs DISPATCHER ━━
Company    = letterhead / issuing org on the ticket (e.g. Birnam, GIP)  → companyId
Dispatcher = "Trucking Co" / dispatch line (e.g. Wroom, 5Rivers)        → dispatcherId
Never swap them.

━━ WRITE CONFIRMATION ━━
Before any create / update / delete / mark:
1. List exactly what you will do (tool name + key arguments, real values only).
2. Ask "Shall I proceed?"
3. Execute only after the user confirms yes.

━━ WORKFLOW: Text job entry ━━
Parse date, company, dispatcher, route, start/end time, driver from the message.
Resolve all names to IDs via tools → confirm summary → create_job.

━━ WORKFLOW: Ticket image ━━
1. Read: date, ticket#, unit#, company (letterhead), dispatcher ("Trucking Co" field), times, locations.
2. Resolve names: list_companies / list_dispatchers / list_units / list_job_types → follow ID RESOLUTION.
3. Show resolved fields: "Company: Birnam ✓ | Dispatcher: Wroom ✓ | Unit: 12 ✓"
   Flag only NO_MATCH items. Ask user to correct those only.
4. User confirms → create_job.

━━ WORKFLOW: Paystub image — PATH A (dates readable) ━━
Use this path when the OCR extraction contains actual dates for the line items.

Step 1 — Resolve dispatcher.
  list_dispatchers(search="<ISSUED_BY from OCR>") → follow ID RESOLUTION → store dispatcherId.

Step 2 — Mark each line item.
  For EACH row: mark_job_paid_by_date(date="<DATE from OCR>", dispatcherId, paidAmount=<AMOUNT from OCR>)
  One call per row. Wait for each response before calling the next.

Step 3 — Show results table after ALL rows are processed.
  Columns: Date | Paid Amount | System Amount | Variance | Status
  Status: ✅ Marked | ⚠️ Flagged (>10% variance) | ❌ Not found
  End with: "X marked, Y flagged, Z not found."

━━ WORKFLOW: Paystub image — PATH B (dates not readable) ━━
Use this path when OCR returns "not visible" for dates — DO NOT ask the user to type in the dates.

Step 1 — Resolve dispatcher (same as PATH A Step 1).

Step 2 — Fetch all unpaid jobs for this dispatcher.
  list_jobs(dispatcherId="<id>", jobPaid=false)
  This gives you the real job dates and amounts from the system.

Step 3 — Match by amount.
  For each line item amount from the OCR:
    Find the unpaid job whose amount is closest to the paystub amount (within 10%).
    If a confident match is found → mark_job_paid_by_date using that job's date.
    If no close match → flag it as ❌ Not matched.

Step 4 — Show a confirmation table BEFORE marking anything.
  Columns: Paystub Amount | Matched Job Date | System Amount | Variance | Action
  Ask: "I matched X of Y line items by amount. Shall I proceed with marking these as paid?"
  Only mark after user confirms.

Step 5 — Show final results table (same format as PATH A Step 3).

━━ REQUIRED FIELDS ━━
create_job: jobDate (required), jobTypeId (required).
create_job_type: companyId (required), title format "Company - Route - Rate" (required).`;
}
/**
 * Process a user message through the agent loop.
 * Returns the final text response.
 *
 * When SUPERVISION_MODE=true (default), any write tool calls are held and the
 * user is shown a confirmation prompt before they are executed.
 */
export async function processMessage(platform, userId, userMessage, authToken, images) {
    const resolvedToken = authToken?.trim() || (await getAutoToken());
    if (!resolvedToken) {
        return {
            text: 'No authentication token found. Set FIVE_RIVERS_EMAIL, FIVE_RIVERS_PASSWORD, and FIVE_RIVERS_ORG_SLUG in .env, or register your token with /register <token>.',
        };
    }
    const client = createRestClient({ baseUrl: API_URL, authToken: resolvedToken });
    const toolCalls = [];
    const provider = getProvider();
    // ── Supervision mode: handle a pending confirmation ───────────────────────
    let resumingFromConfirmation = false;
    if (isSupervisionEnabled()) {
        const sKey = supervisionKey(platform, userId);
        const pending = pendingConfirmations.get(sKey);
        if (pending) {
            const trimmed = userMessage.trim();
            if (CONFIRM_RE.test(trimmed)) {
                // ── User confirmed — execute the held tool calls ──────────────────
                pendingConfirmations.delete(sKey);
                resumingFromConfirmation = true;
                // Re-insert the assistant's original tool-call intent into history
                addMessage(platform, userId, {
                    role: 'assistant',
                    content: pending.assistantContent,
                    tool_calls: pending.toolCalls.map((tc) => ({
                        id: tc.id,
                        function: { name: tc.name, arguments: tc.arguments },
                    })),
                });
                // Execute each held tool call
                for (const tc of pending.toolCalls) {
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
                                return { text: 'Session expired. Clearing cached token — please send your message again to re-authenticate automatically.' };
                            }
                            if (stack)
                                console.error(`[tool] ${tc.name} stack: ${stack}`);
                            result = `Error: ${errMsg}`;
                        }
                    }
                    console.log(`[tool] ${tc.name} → ${result.slice(0, 200)}${result.length > 200 ? '...' : ''}`);
                    toolCalls.push({ name: tc.name, args: tc.arguments, result });
                    addMessage(platform, userId, { role: 'tool', content: result, tool_call_id: tc.id });
                }
                // Fall through to the agent loop — it will see the tool results in
                // history and generate a final summary (no new user message needed).
            }
            else if (CANCEL_RE.test(trimmed)) {
                // ── User cancelled ────────────────────────────────────────────────
                pendingConfirmations.delete(sKey);
                const cancelText = '❌ Cancelled. What else can I help you with?';
                addMessage(platform, userId, { role: 'user', content: trimmed });
                addMessage(platform, userId, { role: 'assistant', content: cancelText });
                return { text: cancelText };
            }
            else {
                // ── User said something else — remind them of the pending action ──
                return {
                    text: `⚠️ There's a pending action waiting for your confirmation:\n\n${pending.confirmationText}\n\nReply **yes** to confirm or **no** to cancel it first.`,
                };
            }
        }
        // ── Document processor pending confirmations ─────────────────────────────
        const pendingDoc = pendingDocConfirmations.get(sKey);
        if (pendingDoc) {
            const trimmed = userMessage.trim();
            if (CONFIRM_RE.test(trimmed)) {
                pendingDocConfirmations.delete(sKey);
                // Execute each pre-built write operation
                const writeResults = [];
                for (const w of pendingDoc.writes) {
                    const toolDef = ALL_TOOLS.find((t) => t.name === w.tool);
                    let result;
                    console.log(`[doc-confirm] ${w.tool} args: ${JSON.stringify(w.args)}`);
                    if (!toolDef) {
                        result = `Error: Unknown tool "${w.tool}"`;
                    }
                    else {
                        try {
                            result = await toolDef.handler(client, w.args);
                        }
                        catch (err) {
                            const errMsg = err instanceof Error ? err.message : String(err);
                            if (errMsg.includes('401') || errMsg.toLowerCase().includes('unauthorized')) {
                                clearAutoToken();
                                return { text: 'Session expired. Please send your message again.' };
                            }
                            result = `Error: ${errMsg}`;
                        }
                    }
                    console.log(`[doc-confirm] ${w.tool} → ${result.slice(0, 200)}`);
                    writeResults.push({ name: w.tool, args: w.args, result });
                }
                const summaryText = formatWriteResults(writeResults);
                addMessage(platform, userId, { role: 'user', content: trimmed });
                addMessage(platform, userId, { role: 'assistant', content: summaryText });
                return { text: summaryText, toolCalls: writeResults };
            }
            else if (CANCEL_RE.test(trimmed)) {
                pendingDocConfirmations.delete(sKey);
                const cancelText = '❌ Cancelled.';
                addMessage(platform, userId, { role: 'user', content: trimmed });
                addMessage(platform, userId, { role: 'assistant', content: cancelText });
                return { text: cancelText };
            }
            else {
                return {
                    text: `⚠️ Pending action:\n\n${pendingDoc.confirmationText}\n\nReply **yes** to confirm or **no** to cancel.`,
                };
            }
        }
    }
    // ── Normal flow: add user message ─────────────────────────────────────────
    // System prompt is injected for Groq/Ollama; for LM Studio it lives in the
    // model preset and is intentionally not sent via the API.
    if ((process.env.LLM_PROVIDER ?? 'ollama').toLowerCase() !== 'lmstudio') {
        setSystemPrompt(platform, userId, buildSystemPrompt());
    }
    if (!resumingFromConfirmation) {
        if (images && images.length > 0 && process.env.LLM_PROVIDER === 'lmstudio') {
            // ── Code-driven document pipeline ──────────────────────────────────────
            // OCR → parse → validate → orchestrate tool calls → format output.
            // No LLM involved unless the document type is unknown.
            const ocrText = await callOCRModel(userMessage, images);
            const extraction = parseOCROutput(ocrText);
            console.log(`[doc-pipeline] Detected document type: ${extraction.type}`);
            if (extraction.type !== 'unknown') {
                const result = await processDocument(extraction, client, isSupervisionEnabled());
                if (result) {
                    // Record in conversation history for context
                    addMessage(platform, userId, { role: 'user', content: `${userMessage}\n\n[OCR]\n${ocrText}` });
                    if (result.needsConfirmation) {
                        const sKey = supervisionKey(platform, userId);
                        pendingDocConfirmations.set(sKey, result.needsConfirmation);
                        addMessage(platform, userId, { role: 'assistant', content: result.text });
                        return { text: result.text };
                    }
                    addMessage(platform, userId, { role: 'assistant', content: result.text });
                    return {
                        text: result.text,
                        toolCalls: result.actions
                            .filter((a) => a.status === 'success')
                            .map((a) => ({ name: a.tool, args: a.args, result: a.result })),
                    };
                }
            }
            // Unknown document or processor returned null → fall through to tool-calling model
            const augmented = `${userMessage ? userMessage + '\n\n' : ''}[Image content extracted by OCR model]\n${ocrText}`;
            addMessage(platform, userId, { role: 'user', content: augmented });
        }
        else {
            // Single-model mode (Groq / Ollama / LM Studio with a unified model):
            // attach images directly and let the model handle vision itself.
            const imageUrls = images?.map((img) => `data:${img.mimeType};base64,${img.data}`);
            addMessage(platform, userId, { role: 'user', content: userMessage, imageUrls });
        }
    }
    // ── Agent loop ────────────────────────────────────────────────────────────
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
            // Free image data from history after the first LLM call.
            // Only relevant for single-model mode where images were attached directly.
            if (iterations === 1 && !resumingFromConfirmation)
                stripImageUrls(platform, userId);
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
            // ── Supervision mode: intercept write operations ────────────────────
            if (isSupervisionEnabled()) {
                const writeCalls = response.toolCalls.filter((tc) => isWriteTool(tc.name));
                if (writeCalls.length > 0) {
                    const sKey = supervisionKey(platform, userId);
                    const confirmationText = buildConfirmationText(writeCalls);
                    // Store ALL tool calls from this turn (reads + writes) so they are
                    // executed together in the correct order when the user confirms.
                    pendingConfirmations.set(sKey, {
                        toolCalls: response.toolCalls,
                        assistantContent: response.content,
                        confirmationText,
                    });
                    // Return the confirmation prompt — do NOT add anything to history yet.
                    const preamble = response.content ? `${response.content}\n\n` : '';
                    return {
                        text: preamble + confirmationText,
                        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                    };
                }
            }
            // Store assistant message with tool calls (include IDs for Groq/OpenAI)
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
        // Model returned no content and no tool calls — nudge it
        if (!response.content.trim()) {
            console.warn(`[llm] Empty response on iteration ${iterations} — nudging model`);
            if (iterations < MAX_ITERATIONS - 1) {
                addMessage(platform, userId, {
                    role: 'user',
                    content: 'Please respond to my last message.',
                });
                continue;
            }
            const emptyFallback = 'The model returned an empty response. Try rephrasing, or check the agent logs for the raw output.';
            addMessage(platform, userId, { role: 'assistant', content: emptyFallback });
            return { text: emptyFallback, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
        }
        // Detect when the model asks the user to provide tool results instead of calling
        // the tool itself — a common failure mode for small models.
        const CONFUSED_MODEL_RE = /please\s+provide\s+the\s+(results?|data|output)|please\s+run\s+the\s+tool|i\s+need\s+you\s+to\s+(call|run|execute)|can\s+you\s+(provide|give\s+me|share)\s+the\s+(results?|tool\s+output|data)/i;
        if (CONFUSED_MODEL_RE.test(response.content) && iterations < MAX_ITERATIONS - 1) {
            console.warn(`[llm] Model asked user to provide tool results — correcting (iteration ${iterations})`);
            addMessage(platform, userId, { role: 'assistant', content: response.content });
            addMessage(platform, userId, {
                role: 'user',
                content: 'You have tools available. Call the tool yourself — do not ask me to provide the results. Make the tool call now.',
            });
            continue;
        }
        // Final response
        addMessage(platform, userId, { role: 'assistant', content: response.content });
        return { text: response.content, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
    }
    const fallback = 'I ran into too many steps processing your request. Could you try simplifying it?';
    addMessage(platform, userId, { role: 'assistant', content: fallback });
    return { text: fallback, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
}
