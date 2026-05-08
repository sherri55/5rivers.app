/**
 * pipeline.ts — Three-phase Gemini document-processing pipeline.
 *
 * Phase 1 (Parser):    Gemini vision extracts structured JSON from a ticket
 *                      or paystub image. No tools. Single call.
 * Phase 2 (Validator): Gemini with list_* tools validates each entity from
 *                      the parsed data against the system database. Asks the
 *                      user to resolve discrepancies. Cannot create or modify.
 * Phase 3 (Creator):   Gemini with create_* tools (and mark_job_paid_by_date
 *                      for paystubs) creates missing entities and the job,
 *                      asking focused questions for any missing required field.
 *
 * The conversation history carries naturally across phases — only the system
 * prompt and available tool set change. Phase transitions are triggered by
 * either an explicit user confirmation (validating → creating) or by sending
 * a new image (anything → validating, restarting the pipeline).
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { addMessage, clearHistory, getHistory, setSystemPrompt, } from './conversation.js';
import { resizeAllForLLM } from './image-utils.js';
const states = new Map();
const stateKey = (p, u) => `${p}:${u}`;
export function getPhase(platform, userId) {
    return states.get(stateKey(platform, userId))?.phase ?? 'idle';
}
export function getState(platform, userId) {
    return states.get(stateKey(platform, userId));
}
export function setState(platform, userId, state) {
    states.set(stateKey(platform, userId), { ...state, updatedAt: Date.now() });
}
export function clearState(platform, userId) {
    states.delete(stateKey(platform, userId));
}
/** Read the original image(s) buffered for this conversation, if any. Returns
 *  an empty array when no pipeline state exists or no images were buffered. */
export function getImages(platform, userId) {
    return states.get(stateKey(platform, userId))?.images ?? [];
}
// ─── Tool sets per phase ────────────────────────────────────────────────────
/** Read-only tools the Validator agent may call. */
export const VALIDATOR_TOOLS = new Set([
    'list_companies',
    'list_dispatchers',
    'list_drivers',
    'list_units',
    'list_job_types',
    'list_jobs',
    'list_carriers',
    'search_jobs',
    'get_job',
]);
/** Write tools (plus list lookups) the Creator agent may call. */
export const CREATOR_TOOLS = new Set([
    // Create
    'create_company',
    'create_dispatcher',
    'create_driver',
    'create_unit',
    'create_job_type',
    'create_job',
    'create_carrier',
    // Update / payment
    'update_job',
    'mark_job_paid',
    'mark_job_paid_by_date',
    // Lookups (so the creator can re-resolve / verify)
    'list_companies',
    'list_dispatchers',
    'list_drivers',
    'list_units',
    'list_job_types',
    'list_jobs',
]);
export function getToolFilterForPhase(phase) {
    switch (phase) {
        case 'validating': return VALIDATOR_TOOLS;
        case 'creating': return CREATOR_TOOLS;
        default: return undefined; // idle = no filtering (regular agent)
    }
}
// ─── Phase 1: Parser ────────────────────────────────────────────────────────
const PARSER_PROMPT = `You are the Parser agent for 5Rivers Trucking. Your ONLY job is to extract structured data from the uploaded document image. You have NO tools and take NO actions — you only produce JSON.

Determine if the image is a TICKET / TIMESHEET or a PAYSTUB / REMITTANCE, then output the matching JSON shape.

━━ TICKET ━━
{
  "type": "ticket",
  "date": "<as printed, or null>",
  "ticketNumber": "<number or null>",
  "letterheadName": "<the company name printed at the TOP of the page (the letterhead). Often the trucking company doing the work.>",
  "customerName": "<value of the 'Customer' / 'Bill To' / 'Account' / 'Client' column or field. Often the company being billed. null if absent.>",
  "dispatcherHint": "<value of an EXPLICIT 'Trucking Co' / 'Dispatched by' / 'Carrier' / 'Hauler' field if one exists, else null>",
  "unit": "<truck or unit number, or null>",
  "driver": "<driver name or initials, or null>",
  "startTime": "<as printed, or null>",
  "endTime": "<as printed, or null>",
  "startLocation": "<haul-from / origin / 'From' value of the FIRST load row, or null>",
  "endLocation": "<haul-to / destination / 'To' value of the FIRST load row, or null>",
  "material": "<material type from the first load row, or null>",
  "loads": [
    { "from": "<…>", "to": "<…>", "material": "<…>", "count": "<as printed, or null>" }
  ]
}

NOTE: Do NOT decide which name is the "company" vs "dispatcher" in the system —
the Validator agent will resolve that by querying both tables. Just extract the
names exactly where they appear on the document. Always populate "letterheadName"
when there is a letterhead. Populate "customerName" when there is a Customer/
Bill-To column or field. Populate "dispatcherHint" ONLY when there is an
explicit Trucking Co / Dispatched by / Carrier field — never guess.

The "loads" array should contain one entry per row in the loads/details table.
If there is only a single load, "loads" may be a single-element array. The flat
"startLocation" / "endLocation" / "material" fields should mirror the FIRST load
row for backwards-compatible consumers.

━━ PAYSTUB ━━
{
  "type": "paystub",
  "issuedBy": "<company that issued the cheque (the payer), or null>",
  "periodFrom": "<pay period start, or null>",
  "periodTo": "<pay period end, or null>",
  "lineItems": [
    { "date": "<as printed, or null>", "amount": <number>, "ref": "<ref / ticket #, or null>" }
  ]
}

━━ MULTIPLE ENTRIES ━━
If the document contains multiple distinct tickets, output an array of ticket objects. If the document contains multiple paystub sections that share an issuer, merge their lineItems into a single paystub object.

━━ STRICT RULES ━━
- Output ONLY JSON. No prose, no markdown fences, no commentary.
- Copy values exactly as printed — do NOT interpret, convert, normalize, or correct.
- Use null for any field that is not visible / not readable.
- Paystub: each table row = exactly one lineItems entry. NEVER include totals, subtotals, or cheque amounts.
- Paystub amounts MUST be numbers (no $, no commas).`;
export async function parseImage(images, userMessage) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey)
        throw new Error('GEMINI_API_KEY is not set');
    const modelName = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: { role: 'user', parts: [{ text: PARSER_PROMPT }] },
    });
    const userText = userMessage?.trim()
        ? `Extract the document. User note: ${userMessage.trim()}`
        : 'Extract the document.';
    const parts = [
        { text: userText },
        ...images.map((img) => ({
            inlineData: { mimeType: img.mimeType, data: img.data },
        })),
    ];
    console.log(`[pipeline:parser] sending ${images.length} image(s) to ${modelName}`);
    const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
    const text = result.response.text() ?? '';
    console.log(`[pipeline:parser] extraction (${text.length} chars):\n${text.slice(0, 600)}${text.length > 600 ? '…' : ''}`);
    return text;
}
// ─── Phase 2 prompt: Validator ──────────────────────────────────────────────
export function buildValidatorPrompt(easternDate) {
    return `You are the Validator agent for 5Rivers Trucking. Today: ${easternDate}.

You receive structured ticket or paystub data from the Parser agent. Your job is to verify every named entity against the system database.

━━ ABSOLUTE RULES ━━
V1. READ-ONLY for now. You only have list_* / get_* tools — do NOT attempt
    create/update/delete tool calls; they aren't loaded for you. BUT this
    constraint is internal — never tell the user you "can't" or "have
    reached a limit". When the user asks you to create / make / add / set up
    anything, treat that as the cue that validation is DONE: end your turn
    with the handoff line ("Shall I proceed with creating the job? — reply
    yes to confirm" or, if you flagged entities for creation, the equivalent
    invitation). The system will hand off to the Creator agent who has the
    create tools. You never need to apologise or refuse.
V2. TOOL FIRST. Never claim an entity exists without calling its list_* tool.
V3. COPY VERBATIM. Show entity names exactly as the tool returns them. Never invent IDs.
V4. ONE QUESTION AT A TIME for any unresolved entity.
V5. NEVER ask the user to run a tool — call it yourself in this same turn.
V6. NO META TALK. Never mention "READ-ONLY", "capability limits", "Validator
    agent", "Creator agent", phases, or other internal machinery to the user.
    Just do the validation and emit the standard handoff line when done.

━━ ID RESOLUTION ━━
Each list_* tool returns one of:
  USE_ID: <uuid> + NAME: <name>   → resolved ✓ — note the UUID
  MULTIPLE_MATCHES <list>          → take the first match ✓
  NO_MATCH <full list>             → unresolved ❌

━━ WORKFLOW: TICKET ━━

The parsed data gives you up to three company-like names — letterheadName,
customerName, dispatcherHint — WITHOUT pre-deciding which is the "company"
(Customer / Bill-To) and which is the "dispatcher" (Trucking Co / Carrier).
Your first job is to figure that out by querying BOTH tables.

1. For each NON-NULL company-like name, in parallel, call:
     list_companies(search="<that name>")
     list_dispatchers(search="<that name>")
   Reading the two results decides the role:
     • Matched in dispatchers only          → it is a Dispatcher
     • Matched in companies only            → it is a Company (customer)
     • Matched in both                      → prefer the table whose match
       has the higher score / is an exact match. If still ambiguous, ask
       the user.
     • Matched in neither                   → unresolved ❌ — see step 4.

   Heuristics when the parsed JSON gives you multiple candidates:
     • dispatcherHint, when populated, is almost always the dispatcher.
     • A trucking-style letterhead (name contains "Trucking", "Haulage",
       "Transport", "Logistics", "Carriers" — case-insensitive) is usually
       the dispatcher. Search list_dispatchers FIRST for those.
     • The customerName field is usually the Company. Search list_companies
       FIRST for that.
     • These are heuristics — ALWAYS confirm by querying both tables.

2. Resolve unit and driver as before:
     unit   → list_units(search="<unit>")
     driver → list_drivers(search="<driver>")

3. Once the Company is identified (or determined to need creation), ALWAYS call
   list_job_types(companyId="<id>") — even when the company is found ✓. Try to
   match the parsed start/end locations or material to a job type title.
   • Match found  → show "Job Type: <title> ✓" in the summary.
   • No match     → show "Job Type: ❌ none found — will need to create one."
   • No companyId yet (company also ❌) → note "Job Type: ❌ pending company."

4. Present a markdown summary with ✓ / ❌ for every resolved role:
     **Ticket #<num>** — <date>
     Company:    Van-Bree Enterprises ✓ (id: …)        ← from customerName
     Dispatcher: Lucy's Trucking Ltd ✓ (id: …)         ← from letterheadName
     Unit: 52 ❌ NOT FOUND                              | Driver: Amrit ✓
     Job Type: Van-Bree — Richmond ⇄ Talbot ✓ (id: …)
   Indicate the source field next to each role on first mention so the user
   can sanity-check your decision.

5. For every ❌ ask ONE focused question, e.g.
     "Unit 52 was not found. Want me to create it, or did you mean one of:
      Unit 5, Unit 25, Unit 502?"

6. After every role is resolved (matched OR confirmed-for-creation), end with
   exactly:
     "All entities validated. **Shall I proceed with creating the job?**
      (reply yes to confirm)"

━━ WORKFLOW: PAYSTUB ━━
1. Resolve the issuer as a dispatcher: list_dispatchers(search="<issuedBy>").
2. Pull unpaid jobs for that dispatcher: list_jobs(dispatcherId="<id>", jobPaid=false).
3. For each line item, find the unpaid job whose date and amount match best (within 10%).
4. Present a matching table:
     | # | Paystub Date | Paystub Amt | Job Date | System Amt | Var% | Match |
5. End with exactly:
     "**Shall I proceed with marking these jobs as paid?** (reply yes to confirm)"

━━ STYLE ━━
- Be concise and structured. Use markdown tables and bullet points.
- Never write placeholder values like [Date] or $X.XX.
- If a parsed field is null, skip its validation; do not fabricate a search term.`;
}
// ─── Phase 3 prompt: Creator ────────────────────────────────────────────────
export function buildCreatorPrompt(easternDate) {
    return `You are the Creator agent for 5Rivers Trucking. Today: ${easternDate}.

The Validator agent has already resolved which entities exist and which need to be created. The full validation conversation is above in the history — read it for context before acting.

━━ ABSOLUTE RULES ━━
C1. WRITE-ENABLED but DELIBERATE. You can call create_* / update_* / mark_* tools.
C2. ONE FOCUSED QUESTION AT A TIME for any missing required field.
C3. REUSE IDS from the validation conversation; do NOT re-resolve unless absolutely necessary.
C4. STRICT DEPENDENCY ORDER: company → dispatcher → driver → job_type → job.
    Never call create_job without a confirmed jobTypeId. Never call
    create_job_type without a confirmed companyId. See TICKET WORKFLOW.
C5. Never invent a UUID. If the validator did not produce one, call the appropriate list_* tool.

━━ FIELD-COLLECTION RULE ━━
When creating ANY entity, walk through EVERY field the tool's schema exposes
and ask the user for it — one focused question at a time. Skip a field only if:
  (a) you already know the answer from the validation conversation above, or
  (b) the user explicitly says they don't have / don't want to set that field.
Never silently leave optional fields blank — ask first, accept "skip" second.

━━ FIELDS PER ENTITY (ask the user for every one) ━━
• Company (create_company)
    name (req), description, website, industry, location, size, founded
    (year, number), email, phone

• Dispatcher (create_dispatcher)
    name (req), description, email, phone, commissionPercent

• Driver (create_driver)
    name (req), description, email, phone,
    payType ∈ {HOURLY, PERCENTAGE, CUSTOM},
    hourlyRate     — ask only when payType = HOURLY
    percentageRate — ask only when payType = PERCENTAGE

• Unit (create_unit)
    name (req), description, color, plateNumber, vin,
    status ∈ {ACTIVE, INACTIVE, MAINTENANCE, RETIRED} (default ACTIVE),
    year, make, model, mileage,
    insuranceExpiry, lastMaintenanceDate, nextMaintenanceDate
    (all dates YYYY-MM-DD)

• Carrier (create_carrier)
    name (req), description, contactPerson, email, phone,
    rateType ∈ {PERCENTAGE, FLAT_PER_JOB, FLAT_PER_LOAD, FLAT_PER_TON, HOURLY},
    rate, status ∈ {ACTIVE, INACTIVE}

• Job Type (create_job_type) — ALL six fields are required:
    companyId, title, startLocation, endLocation, dispatchType, rateOfJob
      · title format: "Company - Start → End - Rate"
        e.g. "Van-Bree - Richmond ⇄ Talbot - $85/hr"
      · dispatchType ∈ {hourly, load, tonnage, fixed}
          hourly  — ticket has Total Hours
          load    — ticket has Loads count
          tonnage — ticket has Weight/Tons
          fixed   — flat $ per job
        If ambiguous, ASK the user before calling create_job_type.
      · rateOfJob is dollars PER UNIT implied by dispatchType
        (so 85 for hourly means $85/hr). Only pass null if the user
        explicitly says rate-pending.

• Job (create_job)
    jobDate (req, YYYY-MM-DD), jobTypeId (req),
    dispatcherId, driverId, unitId, startTime, endTime,
    startLocation, endLocation, ticketIds, weight, loads, amount

• mark_job_paid_by_date
    date (req, YYYY-MM-DD), dispatcherId (req), paidAmount (req)

━━ TICKET WORKFLOW ━━
Work through the following checklist IN ORDER. Do NOT skip to the next step
until the current one is fully resolved.

Step 1 — Company
  • Do you have a companyId from the validation summary? (USE_ID line or confirmed ✓)
  • If YES → continue.
  • If NO  → call list_companies(search="<name>") first. Still no match → ask
             the user if they want to create it (collect all required fields
             via focused Q&A), then call create_company.

Step 2 — Dispatcher
  • Do you have a dispatcherId from the validation summary?
  • If YES → continue.
  • If NO  → call list_dispatchers(search="<name>") first. Still no match →
             ask the user, collect fields, call create_dispatcher.

Step 3 — Driver
  • Do you have a driverId from the validation summary?
  • If YES → continue.
  • If NO  → call list_drivers(search="<name>") first. Still no match → ask
             the user, collect fields, call create_driver.

Step 4 — Job Type  ← THIS STEP IS MANDATORY even if the validator didn't flag it ❌
  • Call list_job_types(companyId="<companyId from step 1>").
  • If exactly one job type exists → use it.
  • If multiple exist → pick the one whose title / startLocation / endLocation
    best matches the ticket's route. If still ambiguous, ask the user.
  • If NONE exist → you MUST create one before the job. Ask:
      "No job type found for <Company>. What is the rate and dispatch type
       (hourly / load / tonnage / fixed) for this route?"
    Then call create_job_type with all six required fields:
      companyId, title ("Company - Start → End - Rate"), startLocation,
      endLocation, dispatchType, rateOfJob.

Step 5 — Job
  • Only call create_job after steps 1–4 are all resolved.
  • Build the args from the resolved IDs + parsed ticket fields.
  • Report: ✅ Job created — <date> — <job type> (id: <uuid>)
            ✅ Created: <any newly-created entities>

━━ PAYSTUB WORKFLOW ━━
1. For each matched line item from the validator's table, call:
     mark_job_paid_by_date(date=<date>, dispatcherId=<id>, paidAmount=<amount>)
2. After processing all line items, report a final markdown table:
     | # | Date | Paid | System | Var% | Status |

━━ STYLE ━━
- After a successful create, briefly confirm and immediately proceed to the next step.
- Never ask the user to "provide the result" of a tool call — you have the tools.
- Stop when the workflow is complete; do not invite further conversation unprompted.`;
}
// ─── Phase transition ───────────────────────────────────────────────────────
/** Plain affirmative — a single-word "yes". */
const CONFIRM_RE = /^\s*(yes|y|confirm|go\s*ahead|proceed|do\s*it|ok(?:ay)?|sure|yep|yeah|👍)\s*[.!]?\s*$/i;
/**
 * Explicit create directive — user is telling us to make something.
 * Examples that match:
 *   "create company"                        "create the company and job type"
 *   "make Eleanor a company"                "add this dispatcher and proceed"
 *   "go ahead and create the job"           "set up the company"
 * Examples that DON'T match (stay in validating):
 *   "did you mean Eleanor's Trucking?"      "no"
 *   "Eleanor is correct"                    "Birnam Aggregates"
 */
const CREATE_DIRECTIVE_RE = /\b(create|make|add|set\s*up|register|build|establish)\b[\s\S]{0,80}\b(compan(y|ies)|dispatcher|driver|unit|carrier|job|entit|all|them|these|those|it)\b/i;
/** Match the validator's final invitation to move to creation. */
const READY_FOR_CREATION_RE = /shall\s+i\s+(proceed|create)|ready\s+to\s+(create|proceed)|proceed\s+with\s+(creat|marking)|reply\s+yes\s+to\s+confirm|needs?\s+creation/i;
/**
 * Decide whether a user message in the validating phase is the green light to
 * advance to the creating phase.
 *
 * Two ways to qualify:
 *   (a) The user issues an explicit create directive ("create company", "make
 *       Eleanor", "go ahead and create the job"). This works regardless of
 *       what the assistant said last — the user's intent is unambiguous.
 *   (b) The user sends a plain affirmation (yes/proceed/ok) AND the most
 *       recent assistant message ended with a "Shall I proceed?" invitation
 *       or flagged something as needing creation. This guards against
 *       transitioning when the user is simply saying "yes" to a
 *       disambiguation question like "Did you mean Birnam Aggregates?".
 */
export function isCreateConfirmation(userMessage, history) {
    // (a) Explicit create directive — always a green light.
    if (CREATE_DIRECTIVE_RE.test(userMessage))
        return true;
    // (b) Plain affirmation — needs context.
    if (!CONFIRM_RE.test(userMessage))
        return false;
    const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant' && m.content);
    if (!lastAssistant)
        return false;
    return READY_FOR_CREATION_RE.test(lastAssistant.content);
}
/**
 * Inspect the current pipeline state and the incoming message, decide which
 * phase to run under, and prepare the conversation accordingly (system prompt,
 * appended messages). Returns the tool filter the agent loop should use.
 *
 * Only invoked for the Gemini provider.
 */
export async function routePipelineTurn(args) {
    const { platform, userId, userMessage, images, resumingFromConfirmation, easternDate } = args;
    // Mid-supervision-confirmation turns must not re-route — they are continuing
    // an existing phase. Just hand back the right tool filter.
    if (resumingFromConfirmation) {
        const phase = getPhase(platform, userId);
        return { handled: true, phase, toolFilter: getToolFilterForPhase(phase) };
    }
    // 1) New image always (re)starts the pipeline at the validator phase.
    if (images && images.length > 0) {
        // Resize for the LLM only — smaller images = fewer tokens (~258 vs 5000+).
        // We keep the originals separate so the job attachment retains full quality.
        const llmImages = await resizeAllForLLM(images);
        let parsed;
        try {
            parsed = await parseImage(llmImages, userMessage);
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[pipeline:parser] error: ${msg}`);
            // Fall back: treat as a non-pipeline image turn.
            clearState(platform, userId);
            return { handled: false, phase: 'idle' };
        }
        // Store the ORIGINAL (unresized) images — these are what get attached to
        // the created job. The LLM-resized copies are only used for the parser call
        // above and are not stored.
        setState(platform, userId, { phase: 'validating', parsedData: parsed, images });
        // Fresh slate for the validator — the previous conversation isn't relevant.
        clearHistory(platform, userId);
        setSystemPrompt(platform, userId, buildValidatorPrompt(easternDate));
        const seedNote = userMessage?.trim() ? `\n\nUser note: ${userMessage.trim()}` : '';
        addMessage(platform, userId, {
            role: 'user',
            content: `The Parser agent extracted this from the uploaded document:\n\n` +
                '```json\n' + parsed + '\n```\n' +
                `Validate every entity against the database now, then ask me about anything that did not match.${seedNote}`,
        });
        return { handled: true, phase: 'validating', toolFilter: VALIDATOR_TOOLS };
    }
    const currentPhase = getPhase(platform, userId);
    // 2) Validating phase — text-only follow-up.
    if (currentPhase === 'validating') {
        const history = getHistory(platform, userId);
        if (isCreateConfirmation(userMessage, history)) {
            // Hand off to the creator. Keep the conversation history (it carries the
            // validation context naturally) and only swap the system prompt.
            const state = getState(platform, userId);
            if (state)
                setState(platform, userId, {
                    phase: 'creating',
                    parsedData: state.parsedData,
                    images: state.images, // carry images forward so create_job can attach them
                });
            setSystemPrompt(platform, userId, buildCreatorPrompt(easternDate));
            addMessage(platform, userId, {
                role: 'user',
                content: 'Confirmed — please proceed. Use the resolved IDs from the validation summary above. ' +
                    'Create any missing entities first (asking me one focused question at a time for any required field that is unknown), then complete the workflow.',
            });
            console.log(`[pipeline] transition validating → creating for ${platform}:${userId}`);
            return { handled: true, phase: 'creating', toolFilter: CREATOR_TOOLS };
        }
        // Continue validating.
        addMessage(platform, userId, { role: 'user', content: userMessage });
        return { handled: true, phase: 'validating', toolFilter: VALIDATOR_TOOLS };
    }
    // 3) Creating phase — keep going until the user clears state or sends a new image.
    if (currentPhase === 'creating') {
        addMessage(platform, userId, { role: 'user', content: userMessage });
        return { handled: true, phase: 'creating', toolFilter: CREATOR_TOOLS };
    }
    // 4) Idle, no image → not a pipeline turn.
    return { handled: false, phase: 'idle' };
}
/** Human-friendly description of the active phase, for logging / debug. */
export function describePhase(phase) {
    switch (phase) {
        case 'validating': return 'Validator (read-only)';
        case 'creating': return 'Creator (write-enabled)';
        case 'idle': return 'Idle (no pipeline)';
    }
}
