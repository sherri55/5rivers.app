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
// ─── Phase 1: Parser — output schema ────────────────────────────────────────
//
// Single authoritative definition. Used in:
//   • PARSER_PROMPT     (image → JSON, cloud / LM Studio tool model)
//   • HTML_PARSER_PROMPT (HTML → JSON, local tool model)
//   • callLMStudioParser (response_format → enforces schema at API level)
const BREAK_ENTRY_SCHEMA = {
    type: 'object',
    required: ['start', 'end', 'tag'],
    additionalProperties: false,
    properties: {
        start: { type: ['string', 'null'], description: 'Break start HH:MM (24h), or null if not legible' },
        end: { type: ['string', 'null'], description: 'Break end   HH:MM (24h), or null if not legible' },
        tag: { type: 'string', description: 'Label as printed, e.g. "Lunch", "Coffee", "Break"' },
    },
};
const LOAD_ENTRY_SCHEMA = {
    type: 'object',
    required: ['from', 'to', 'material', 'count'],
    additionalProperties: false,
    properties: {
        from: { type: 'string' },
        to: { type: 'string' },
        material: { type: 'string' },
        count: { type: ['string', 'null'] },
    },
};
const TICKET_SCHEMA = {
    type: 'object',
    required: [
        'type', 'date', 'ticketNumber', 'letterheadName', 'letterheadKind',
        'customerName', 'dispatcherHint', 'unit', 'driver', 'foreman',
        'jobLocation', 'startTime', 'endTime',
        'has_breaks', 'breaks', 'startLocation', 'endLocation', 'material', 'loads',
    ],
    additionalProperties: false,
    properties: {
        type: { type: 'string', enum: ['ticket'] },
        date: { type: ['string', 'null'] },
        ticketNumber: { type: ['string', 'null'] },
        letterheadName: { type: ['string', 'null'] },
        letterheadKind: {
            type: 'string',
            enum: ['trucking', 'construction', 'unknown'],
            description: '"trucking" when the letterhead name contains Trucking / Haulage / Transport / Logistics / Carriers / Inc-style trucking words; ' +
                '"construction" when it contains Construction / Excavating / Aggregates / Paving / Contractors / Materials / Ltd-style customer words; ' +
                '"unknown" otherwise. Drives the Validator role tiebreaker.',
        },
        customerName: { type: ['string', 'null'] },
        dispatcherHint: { type: ['string', 'null'] },
        unit: { type: ['string', 'null'] },
        driver: { type: ['string', 'null'] },
        foreman: {
            type: ['string', 'null'],
            description: 'Value of "Foreman" / "Supervisor" / "Site Contact" field — informational only, NEVER an entity.',
        },
        jobLocation: {
            type: ['string', 'null'],
            description: 'Value of "Job #" / "Job/Loc" / "Loc" / "Site" / "Profile #" — a site code or location reference, NOT a customer name.',
        },
        startTime: { type: ['string', 'null'] },
        endTime: { type: ['string', 'null'] },
        has_breaks: {
            type: 'boolean',
            description: 'true if any break is indicated on the document (checkbox, label, two-session time table), false if none',
        },
        breaks: {
            type: 'array',
            description: 'Empty when has_breaks is false. One entry per break when has_breaks is true.',
            items: BREAK_ENTRY_SCHEMA,
        },
        startLocation: { type: ['string', 'null'] },
        endLocation: { type: ['string', 'null'] },
        material: { type: ['string', 'null'] },
        loads: {
            type: 'array',
            items: LOAD_ENTRY_SCHEMA,
        },
    },
};
const PAYSTUB_SCHEMA = {
    type: 'object',
    required: ['type', 'issuedBy', 'periodFrom', 'periodTo', 'lineItems'],
    additionalProperties: false,
    properties: {
        type: { type: 'string', enum: ['paystub'] },
        issuedBy: { type: ['string', 'null'] },
        periodFrom: { type: ['string', 'null'] },
        periodTo: { type: ['string', 'null'] },
        lineItems: {
            type: 'array',
            items: {
                type: 'object',
                required: ['date', 'amount', 'ref'],
                additionalProperties: false,
                properties: {
                    date: { type: ['string', 'null'] },
                    amount: { type: 'number' },
                    ref: { type: ['string', 'null'] },
                },
            },
        },
    },
};
/**
 * JSON Schema for the parser output. Exported so `callLMStudioParser` can
 * pass it as `response_format.json_schema.schema` to enforce structure at the
 * API level (no markdown fences, no extra prose, correct field names).
 *
 * Top-level is `oneOf`:
 *   • single ticket object
 *   • single paystub object
 *   • array of ticket objects (multi-ticket document)
 */
export const PARSER_OUTPUT_SCHEMA = {
    oneOf: [
        TICKET_SCHEMA,
        PAYSTUB_SCHEMA,
        { type: 'array', items: TICKET_SCHEMA },
    ],
};
// ─── Phase 1: Parser prompt (image → JSON, cloud / LM Studio tool-model) ─────
const PARSER_PROMPT = `You are the Parser agent for 5Rivers Trucking. Your ONLY job is to extract structured data from the uploaded document image. You have NO tools and take NO actions — you only produce JSON.

Determine if the image is a TICKET / TIMESHEET or a PAYSTUB / REMITTANCE, then output the matching JSON shape.

━━ TICKET ━━
{
  "type": "ticket",
  "date": "<as printed, or null>",
  "ticketNumber": "<see TICKET # RULES, or null>",
  "letterheadName": "<company name at the TOP of the page — the letterhead>",
  "letterheadKind": "<trucking | construction | unknown — see LETTERHEAD KIND>",
  "customerName": "<see ROLE FIELD RULES, or null>",
  "dispatcherHint": "<see ROLE FIELD RULES, or null>",
  "unit": "<truck/unit number with company tokens stripped, or null>",
  "driver": "<see DRIVER RULES, or null>",
  "foreman": "<value of 'Foreman' / 'Supervisor' / 'Site Contact' field, or null>",
  "jobLocation": "<value of 'Job #' / 'Job/Loc' / 'Loc' / 'Site' / 'Profile #' field, or null — this is a SITE CODE, never a customer name>",
  "startTime": "<see TIME RULES, or null>",
  "endTime": "<see TIME RULES, or null>",
  "has_breaks": <true | false>,
  "breaks": [
    { "start": "<HH:MM or null>", "end": "<HH:MM or null>", "tag": "<label, e.g. Lunch>" }
  ],
  "startLocation": "<haul-from of the FIRST load row (or 'Sending Site'), or null>",
  "endLocation": "<haul-to of the FIRST load row (or 'Receiving Site'), or null>",
  "material": "<material of the FIRST load row, or null>",
  "loads": [
    { "from": "<…>", "to": "<…>", "material": "<…>", "count": "<as printed, or null>" }
  ]
}

━━ LETTERHEAD KIND ━━
letterheadKind classifies the letterhead's company TYPE. The Validator uses this
as a tiebreaker when a name matches in both Companies AND Dispatchers tables.

"trucking"      — letterhead name contains: Trucking, Haulage, Transport,
                  Logistics, Carriers, Cartage, Freight  (case-insensitive)
                  Examples: "Lucy's Trucking Ltd", "Farmers Pride Haulage",
                  "Wroom Logistics Inc."
                  → Almost always a Dispatcher.

"construction"  — letterhead name contains: Construction, Excavating, Excavation,
                  Aggregates, Paving, Contractors, Materials, Concrete, Asphalt,
                  Demolition, Development, Builders  (case-insensitive)
                  Examples: "Birnam", "BKT Excavating Ltd",
                  "Capital Paving Inc.", "Rand Development"
                  → Almost always a Customer.

"unknown"       — letterhead doesn't clearly match either category, OR no
                  letterhead is visible. Examples: "Birnam" alone (no suffix
                  word), generic names. The Validator will query both tables.

━━ ROLE FIELD RULES ━━
customerName    — Populate ONLY when a field is explicitly labelled:
                  "Customer", "Bill To", "Bill-To", "Client", "Account", "Sold To"
                  DO NOT populate from "Job #", "Job/Loc", "Loc", "Site",
                  "Foreman" — those are different concepts (use jobLocation/foreman).
                  Null if no such explicit label exists.

dispatcherHint  — Populate ONLY when a field is explicitly labelled:
                  "Trucking Co", "Trucking Company", "Dispatched by",
                  "Carrier", "Hauler", "Haulage Co"
                  Null if no such explicit label exists.

letterheadName  — Always populate when a letterhead/logo is visible at the top
                  of the page. This is the company name printed by the document
                  itself. NEVER swap with customerName or dispatcherHint.

━━ TICKET # RULES ━━

The ticket number is a SINGLE unique document identifier — there is exactly
ONE per ticket. It is the number an office worker would write down to track
this specific document. Almost every ticket has one. Do NOT leave it null
unless you have genuinely searched the entire page and found nothing.

WHERE TO LOOK (in priority order):

  ❶ Top-right corner — most common location. Usually in a BOX, in LARGER /
    BOLDER font than surrounding text, sometimes in red ink. Pre-printed by
    the document, not handwritten.
        Examples: "12815", "1252", "3074", "No. 3074"

  ❷ Top-left, directly under the letterhead/logo — often a smaller pre-printed
    number stamped or printed in the same block as the company name/address.
        Examples: "00254" (under "BKT EXCAVATING"), the number above a horizontal rule

  ❸ Bottom of the page, often FAINT — near "Trucker's Signature" or a footer.
    Easy to miss but always check. May have a "NO" / "NO." / "#" prefix.
        Examples: "NO 54625" at bottom-left of Birnam-style tickets

VISUAL CLUES that something IS the ticket number:
  • Larger or bolder font than surrounding text
  • Inside a printed box or framed area
  • Red ink (common on Farmers Pride / similar layouts)
  • Pre-printed (typed), NOT handwritten in pen
  • A "Ticket #", "No.", "Doc #", or "#" label nearby
  • 3–7 digits long (occasionally with a letter prefix)

NEVER use any of the following as the ticket number:

  ✗ Tally marks in a per-row "Ticket #" COLUMN of a load table.
    The COLUMN HEADER may say "Ticket #" but the per-row values like
    "I", "II", "III", "|", "||", "|||", "1", "11", "111" are load
    COUNTS, not document IDs. Real ticket numbers are NOT confined to
    a table row — they appear once, prominently, near the page edge.
    Birnam example: the "Ticket #" column shows "II", "II", "III" (load
    counts per row) — IGNORE THESE. The real ticket # is "54625" at
    the bottom of the page.

  ✗ The "Job #" / "Job/Loc" / "Job No." value — that's a customer-side
    project code, goes to jobLocation. (Birnam: "ELEANOR", BKT: "25011")

  ✗ The "Truck #" / "Unit #" / "Trailer #" value — goes to unit.

  ✗ Phone numbers, postal codes, license-plate numbers, addresses,
    dates, times, or amounts.

  ✗ Per-row sequential indices (1, 2, 3, …) in a load log.

EXAMPLES of correct ticketNumber extraction (real layouts):

  Birnam-style:    "54625"   (faint, bottom-left, "NO" prefix)
  Lucy's-style:    "12815"   (top-right, no prefix)
  Wroom-style:     "1252"    (top-right, plain)
  Farmers Pride:   "3074"    (top-right, in a red box, "No." prefix)
  BKT-style:       "00254"   (under the BKT logo, leading zeros preserved)

When multiple candidate numbers are visible, prefer in this order:
  1. The one in a box / distinct font / red ink
  2. The one explicitly labelled "Ticket #" / "No." / "#"
  3. The one in the top-right corner
  4. The one at the bottom of the page
PRESERVE leading zeros ("00254" stays "00254", not "254").

━━ UNIT RULES ━━
Extract just the truck/unit identifier. Strip any company tokens:
- "52 (5RIVERS)"  → "52"
- "WROOM 52"      → "52"
- "HP 52"         → "52"
- "Truck #52"     → "52"
The parenthetical or prefix word is a trucking-company tag, not part of the unit.

━━ DRIVER RULES ━━
Populate driver ONLY from a field explicitly labelled "Driver" or "Driver Name".
NEVER use any of these as the driver:
- "Foreman" — that's a site supervisor, goes to foreman field.
- "Supervisor" / "Site Contact" — same, goes to foreman.
- The signature image alone.
If no Driver field exists, driver is null.

━━ TIME RULES ━━
Two layouts to recognise:

Layout A — Single session:
  "Time In: 6:30 AM" / "Time Out: 2:30 PM"  → startTime="6:30 AM", endTime="2:30 PM"
  "Start: 7:30" / "Finish: 4:30"             → startTime="7:30", endTime="4:30"

Layout B — Two sessions split by a break (e.g. "Start | Stop | Start | Stop" table):
  Row: 7:00 AM | 12:00 PM | 12:30 PM | 5:00 PM
  → startTime = "7:00 AM" (earliest start)
  → endTime   = "5:00 PM" (latest stop)
  → has_breaks = true
  → breaks    = [{"start":"12:00","end":"12:30","tag":"Lunch"}]
  (The gap between session 1 end and session 2 start is the break.)

━━ BREAKS RULES ━━
has_breaks  true when ANY of:
              • A checkbox "Lunch ½ Hr: Y/N" or similar is checked Y
              • A two-session time table exists (Layout B above)
              • A "Break" / "Lunch" entry is in the time/notes area
            false otherwise.

breaks      [] when has_breaks is false (REQUIRED — never omit).
            When has_breaks is true — one object per break:
              Times legible      → {"start":"12:00","end":"12:30","tag":"Lunch"}
              "Y" checkbox only  → {"start":null,"end":null,"tag":"Lunch"}
              Two-session gap    → use the gap times directly.
            A null-time entry signals the Validator to default to 30 minutes
            and confirm with the user. Most tickets have at most one lunch break.

━━ LOCATION RULES ━━
Recognize these label pairs as From / To:
- "From" / "To"                             (Lucy's, Farmers Pride, Wroom layout)
- "Sending Site" / "Receiving Site"          (BKT-style soil-hauling layout)
- "Pickup" / "Delivery" / "Dropoff"
- "Pit" / "Job Site"                         (sometimes used standalone)
The flat startLocation / endLocation / material fields mirror the FIRST load row.

━━ PAYSTUB ━━
{
  "type": "paystub",
  "issuedBy": "<company that issued the cheque, or null>",
  "periodFrom": "<pay period start, or null>",
  "periodTo": "<pay period end, or null>",
  "lineItems": [
    { "date": "<as printed, or null>", "amount": <number>, "ref": "<ref / ticket #, or null>" }
  ]
}

━━ MULTIPLE ENTRIES ━━
Multiple distinct tickets → output a JSON array of ticket objects.
Multiple paystub sections (same issuer) → merge lineItems into one paystub object.

━━ STRICT RULES ━━
- Output ONLY JSON. No prose, no markdown fences, no commentary.
- Copy values exactly as printed — do NOT interpret, convert, normalize, or correct.
- Use null for any field that is not visible / not readable.
- letterheadKind, foreman, jobLocation, has_breaks, breaks are REQUIRED in every ticket.
- Paystub: each table row = exactly one lineItems entry. NEVER include totals, subtotals, or cheque amounts.
- Paystub amounts MUST be numbers (no $, no commas).`;
/**
 * HTML-aware parser prompt — used in local mode after the OCR model
 * (chandra-ocr-2) has converted the image to structured HTML.
 *
 * The OCR HTML uses:
 *   <u>…</u>              → filled / handwritten values
 *   data-label="…"        → field name
 *   plain text near label → stamp-printed values (ticket #, unit #)
 *   <img>                 → signature / stamp image (use surrounding text)
 *   <tr> rows             → one load/entry per row in a table
 */
export const HTML_PARSER_PROMPT = `You are the Parser agent for 5Rivers Trucking. Your ONLY job is to extract structured data from the HTML document below. The HTML was generated by an OCR model — it uses <u> tags for filled/handwritten fields and data-label attributes for field names. You have NO tools and take NO actions — you only produce JSON.

Determine if the document is a TICKET / TIMESHEET or a PAYSTUB / REMITTANCE, then output the matching JSON shape.

━━ TICKET ━━
{
  "type": "ticket",
  "date": "<as printed, or null>",
  "ticketNumber": "<see TICKET # RULES, or null>",
  "letterheadName": "<company name at the TOP of the page — the letterhead>",
  "letterheadKind": "<trucking | construction | unknown — see LETTERHEAD KIND>",
  "customerName": "<see ROLE FIELD RULES, or null>",
  "dispatcherHint": "<see ROLE FIELD RULES, or null>",
  "unit": "<truck/unit number with company tokens stripped, or null>",
  "driver": "<see DRIVER RULES, or null>",
  "foreman": "<value of 'Foreman' / 'Supervisor' / 'Site Contact' field, or null>",
  "jobLocation": "<value of 'Job #' / 'Job/Loc' / 'Loc' / 'Site' / 'Profile #' field, or null — SITE CODE only, never a customer name>",
  "startTime": "<see TIME RULES, or null>",
  "endTime": "<see TIME RULES, or null>",
  "has_breaks": <true | false>,
  "breaks": [
    { "start": "<HH:MM or null>", "end": "<HH:MM or null>", "tag": "<label, e.g. Lunch>" }
  ],
  "startLocation": "<haul-from of the FIRST load row (or 'Sending Site'), or null>",
  "endLocation": "<haul-to of the FIRST load row (or 'Receiving Site'), or null>",
  "material": "<material of the FIRST load row, or null>",
  "loads": [
    { "from": "<…>", "to": "<…>", "material": "<…>", "count": "<as printed, or null>" }
  ]
}

━━ LETTERHEAD KIND ━━
letterheadKind classifies the letterhead's company TYPE. The Validator uses this
as a tiebreaker when a name matches in both Companies AND Dispatchers tables.

"trucking"      — letterhead name contains: Trucking, Haulage, Transport,
                  Logistics, Carriers, Cartage, Freight  (case-insensitive)
                  → Almost always a Dispatcher.
"construction"  — letterhead name contains: Construction, Excavating, Excavation,
                  Aggregates, Paving, Contractors, Materials, Concrete, Asphalt,
                  Demolition, Development, Builders  (case-insensitive)
                  → Almost always a Customer.
"unknown"       — letterhead doesn't clearly match either category, OR no
                  letterhead is present.

━━ ROLE FIELD RULES ━━
customerName    — Populate ONLY from a data-label containing:
                  "Customer", "Bill To", "Bill-To", "Client", "Account", "Sold To"
                  DO NOT populate from "Job #", "Job/Loc", "Loc", "Site", "Foreman".
                  Null if no such label exists.
dispatcherHint  — Populate ONLY from a data-label containing:
                  "Trucking Co", "Trucking Company", "Dispatched by",
                  "Carrier", "Hauler", "Haulage Co"
                  Null if no such label exists.
letterheadName  — Always populate when a letterhead/logo is visible at the top.
                  Never swap with customerName or dispatcherHint.

━━ TICKET # RULES ━━

Exactly ONE ticket number per document — almost always present. Do NOT
leave null unless you have searched the entire HTML and found nothing.

WHERE TO LOOK (in priority order):

  ❶ Top-right of the page — pre-printed number, often inside a <div> with a
    distinct class/style or near a "Ticket #", "No.", "Doc #", or "#" label.
        Examples: "12815", "1252", "3074", "No. 3074"

  ❷ Near or under the letterhead block — small pre-printed number in the
    same area as the company name/address, often with leading zeros.
        Examples: "00254" directly below a "BKT EXCAVATING" logo

  ❸ Bottom of the page — faint number near "Trucker's Signature" or in the
    footer, sometimes with a "NO" / "NO." / "#" prefix.
        Examples: "NO 54625"

VISUAL / STRUCTURAL CLUES in the OCR HTML:
  • A <div> or <span> with no data-label, containing just a numeric string
    in a position separate from the loads table — usually the ticket #.
  • A data-label="Ticket #" / "No." / "Doc #" attribute — the value is the
    ticket #, UNLESS that label appears as a COLUMN HEADER in a <tr> row
    (see anti-patterns below).
  • Pre-printed values (plain text) — NOT <u>…</u> handwritten values.
    Ticket numbers are almost always typed/stamped, not handwritten.
  • Three to seven digits, occasionally with a letter prefix.

NEVER use any of the following as the ticket number:

  ✗ Per-row values under a "Ticket #" column in a loads table.
    On Birnam-style tickets, the load table has a "Ticket #" column whose
    per-row values are tally marks like "I", "II", "III" or "|", "||",
    "|||", "1", "11", "111" — these are LOAD COUNTS per row, not document
    IDs. The real ticket # for Birnam is "54625" near the bottom of the
    page, completely outside the load table.

  ✗ The "Job #" / "Job/Loc" / "Job No." value — goes to jobLocation.

  ✗ The "Truck #" / "Unit #" / "Trailer #" — goes to unit.

  ✗ Phone numbers, postal codes, license plates, dates, times, amounts.

  ✗ Sequential row indices in load logs (1, 2, 3, …).

EXAMPLES of correct ticketNumber extraction:

  Birnam-style:    "54625"  (faint, bottom-left, "NO" prefix in HTML)
  Lucy's-style:    "12815"  (top-right, plain)
  Wroom-style:     "1252"   (top-right, plain)
  Farmers Pride:   "3074"   (top-right in a box, "No." prefix)
  BKT-style:       "00254"  (under BKT logo — KEEP leading zeros)

PRESERVE leading zeros — "00254" must stay as "00254", never "254".

━━ UNIT RULES ━━
Extract just the truck/unit identifier. Strip any company tokens:
- "52 (5RIVERS)" → "52"
- "WROOM 52"     → "52"
- "HP 52"        → "52"

━━ DRIVER RULES ━━
Populate driver ONLY from a data-label "Driver" or "Driver Name".
NEVER use "Foreman", "Supervisor", "Site Contact" — those go to foreman.
If no Driver field exists, driver is null.

━━ TIME RULES ━━
Two layouts to recognise:
A. Single session: "Time In" / "Time Out" (or "Start" / "Finish")
   → startTime = Time In, endTime = Time Out
B. Two sessions (start | stop | start | stop in a row):
   → startTime = earliest start, endTime = latest stop
   → has_breaks = true, breaks = [{"start": "<session1 end>", "end": "<session2 start>", "tag": "Lunch"}]

━━ LOCATION RULES ━━
Recognize as From / To:
- "From" / "To"                       (Lucy's, Farmers Pride, Wroom)
- "Sending Site" / "Receiving Site"   (BKT-style)
- "Pit" / "Job Site"

NOTE: Do NOT decide which name is the "company" vs "dispatcher" — the Validator agent resolves that by querying both tables. Always populate "letterheadName" when there is a letterhead. Populate "customerName" only when there is an explicit Customer/Bill-To label. Populate "dispatcherHint" only when there is an explicit Trucking Co / Dispatched by / Carrier label.

The "loads" array should contain one entry per <tr> row in the loads/details table. The flat "startLocation" / "endLocation" / "material" fields mirror the FIRST load row.

━━ BREAKS RULES ━━
has_breaks  true  when ANY break indicator exists in the HTML: a checked checkbox
                  labelled "Lunch" / "Break" / "Coffee", a printed break field, a
                  checked <input type="checkbox"> near a break label, etc.
            false when there is no break indicator at all.

breaks      []   when has_breaks is false  (REQUIRED — never omit).
            When has_breaks is true — one object per break:
              Times in <u> tags  → {"start":"12:00","end":"12:30","tag":"Lunch"}
              Times missing/null → {"start":null,"end":null,"tag":"Break"}
            A null-time entry signals the Validator to default to 30 minutes
            and confirm with the user. Most tickets have at most one lunch break.

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
Multiple distinct tickets → output a JSON array of ticket objects.
Multiple paystub sections (same issuer) → merge lineItems into one paystub object.

━━ HTML READING NOTES ━━
- Text inside <u> tags = filled / handwritten values — these are the actual data.
- data-label attribute = the field name; text inside the element = field value.
- <img> tags usually represent signatures or stamps — check adjacent text for context.
- Stamped / pre-printed numbers (ticket #, unit #) appear as plain text near labels.
- Tables: each <tr> row is one load entry. Read <td> cells left-to-right.
- Ignore layout wrappers (<div> with no data-label and no text content).
- Checkbox state: checked = true indicator; unchecked = ignored.

━━ STRICT RULES ━━
- Output ONLY JSON. No prose, no markdown fences, no commentary.
- Copy values exactly as they appear — do NOT interpret, convert, normalize, or correct.
- Use null for any field that is not visible / not readable.
- letterheadKind, foreman, jobLocation, has_breaks, breaks are REQUIRED in every ticket.
- Paystub: each table row = exactly one lineItems entry. NEVER include totals, subtotals, or cheque amounts.
- Paystub amounts MUST be numbers (no $, no commas).`;
/**
 * Build a text-only Message for the HTML-parsing step (local OCR mode).
 * The OCR model has already converted the image to HTML; this message asks
 * the tool model to extract structured JSON from that HTML.
 */
export function buildHtmlParserMessage(html, userContext) {
    const userText = userContext.trim() || 'Extract the document.';
    return {
        role: 'user',
        content: `${HTML_PARSER_PROMPT}\n\nDocument HTML:\n${html}\n\n---\n\n${userText}`,
    };
}
/**
 * One-shot image-to-JSON extraction using the active cloud provider.
 * Builds a standard Message array (system prompt + user message with inline
 * images) and calls `callProvider` — same interface used by every other turn.
 */
export async function parseImage(images, userMessage, callProvider) {
    const userText = userMessage?.trim()
        ? `Extract the document. User note: ${userMessage.trim()}`
        : 'Extract the document.';
    // The parser instructions are embedded in the user message rather than sent
    // as a system role — this works uniformly across every provider, including
    // LM Studio which strips system messages (its system prompt lives in the
    // model preset).
    const messages = [
        {
            role: 'user',
            content: `${PARSER_PROMPT}\n\n---\n\n${userText}`,
            imageUrls: images.map((img) => `data:${img.mimeType};base64,${img.data}`),
        },
    ];
    const provider = (process.env.LLM_PROVIDER ?? 'lmstudio').toLowerCase();
    const modeLabel = provider === 'lmstudio' ? 'OCR → HTML → JSON (local)' : 'image → JSON (cloud)';
    console.log(`[pipeline:parser] ${images.length} image(s), mode: ${modeLabel}`);
    const raw = await callProvider(messages);
    const text = stripJsonFences(raw);
    const wasFenced = text.length !== raw.trim().length;
    console.log(`[pipeline:parser] extraction (${text.length} chars${wasFenced ? ', fences stripped' : ''}):\n${text.slice(0, 600)}${text.length > 600 ? '…' : ''}`);
    return text;
}
/**
 * Strip markdown code fences from a model's JSON output.
 *
 * Cloud models (especially Gemini) routinely wrap JSON in ```json … ```
 * despite the prompt forbidding it. If we then embed that wrapped text
 * inside our own ```json block in the Validator seed message, the next
 * model sees nested fences and either fails to parse or claims "the JSON
 * data is missing".
 */
function stripJsonFences(text) {
    const trimmed = text.trim();
    const fenced = trimmed.match(/^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?\s*```$/);
    return fenced ? fenced[1].trim() : trimmed;
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

The parsed JSON gives you up to three company-like names (letterheadName,
customerName, dispatcherHint) PLUS a letterheadKind hint. Your job is to figure
out which name is the Company (customer) and which is the Dispatcher (trucking
co) by querying the database — NOT by guessing from field names.

STEP 1 — Cross-search EVERY name against BOTH tables (no exceptions).

  Build a set of unique non-null names from { letterheadName, customerName,
  dispatcherHint }. For EACH name in this set, call IN PARALLEL:
      list_companies(search="<name>")
      list_dispatchers(search="<name>")

  This is a HARD RULE. Even when a name came from a "Customer" field, you
  MUST still search list_dispatchers — and vice versa. Many tickets have
  the customer on the letterhead and the dispatcher in a "Trucking Co"
  field, while other tickets reverse this. The database matches are the
  source of truth, not the field names on the document.

STEP 2 — Assign roles from the search results.

  For each name, look at both search results:
    • USE_ID in companies only        → that name is the COMPANY.
    • USE_ID in dispatchers only      → that name is the DISPATCHER.
    • USE_ID in both                  → use letterheadKind as tiebreaker:
          "trucking"     ⇒ Dispatcher
          "construction" ⇒ Company
          "unknown"      ⇒ ask the user which role this name plays.
    • NO_MATCH in both                → unresolved ❌ (will need creation
                                        or user clarification — see STEP 5).

  After processing all names, you should have at most one Company and one
  Dispatcher resolved. If two different names both resolved as Company (or
  both as Dispatcher), pick the one with the higher fuzzy match score and
  flag the other for user review.

STEP 3 — Resolve unit and driver.
     unit   → list_units(search="<unit>")
     driver:
       • If parsed driver is non-null → list_drivers(search="<driver>")
       • If parsed driver IS null (no Driver field on the ticket) → FALLBACK to
         the default driver: call list_drivers(search="Amritinder Cheema").
         Note in the summary: "Driver: Amritinder Cheema (default — ticket had
         no driver field)" so the user can override if needed.
       • NEVER use the foreman value as the driver, regardless of null state.

STEP 4 — Resolve job type (route).
  Once the Company is identified (matched OR confirmed-for-creation), ALWAYS
  call list_job_types(companyId="<id>"). Try to match the parsed start/end
  locations, material, OR jobLocation to a job type title.
    • Match found  → show "Job Type: <title> ✓" in the summary.
    • No match     → show "Job Type: ❌ none found — will need to create one."
    • No companyId yet → note "Job Type: ❌ pending company."

STEP 5 — Present a markdown summary with ✓ / ❌ for every role:
     **Ticket #<num>** — <date>
     Company:    Birnam ✓ (id: …)                  ← from letterheadName (construction)
     Dispatcher: Wroom Inc. ✓ (id: …)              ← from dispatcherHint "WROOM"
     Unit: 52 ✓                                    | Driver: Amrit ✓
     Job Type: Birnam — Eleanor site ✓ (id: …)
     Job location: ELEANOR  (informational)
     Foreman: TOM           (informational, not stored)
     Times: 7:00 AM – 5:00 PM
     Breaks: Lunch 12:00–12:30 ✓  — OR —  Lunch break indicated, times unknown
              (will default to 30 min — please confirm start time)

  Indicate the source field next to each role on first mention so the user
  can sanity-check your decision.

STEP 6 — For every ❌, ask ONE focused question.
  Examples:
    "Unit 52 was not found. Want me to create it, or did you mean one of:
     Unit 5, Unit 25, Unit 502?"
    "I couldn't find 'Eleanor' as a company or dispatcher. It looks like a
     job-site code — should I treat it as the job location?"

  For breaks with null start/end times (has_breaks: true, breaks have nulls):
     Ask: "A break was marked on the ticket but the times weren't readable.
           What time did the break start? (I'll default to 30 minutes, e.g. 12:00–12:30)"
     Once the user provides a start time, compute end = start + 30 min.
     If the user says "skip" or "none", clear has_breaks and use [].

STEP 7 — When every role is resolved (matched OR confirmed-for-creation),
  end your turn with exactly:
     "All entities validated. **Shall I proceed with creating the job?**
      (reply yes to confirm)"

━━ PARSED FIELD INTERPRETATION ━━
letterheadName  — Company name printed at the top. Role decided by STEP 1+2.
letterheadKind  — "trucking" / "construction" / "unknown" tiebreaker (see STEP 2).
customerName    — Only set when the doc has an explicit Customer/Bill-To field.
                  Treat as a CANDIDATE name — cross-search like any other.
dispatcherHint  — Only set when the doc has an explicit Trucking Co field.
                  Treat as a CANDIDATE name — cross-search like any other.
jobLocation     — A site code or job number ("ELEANOR", "25011"). NEVER an
                  entity to validate — pass it to list_job_types as a search
                  hint, and show it as informational in the summary.
foreman         — Site supervisor name. NEVER an entity to validate. Show
                  informational only.

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
    startLocation, endLocation, ticketIds, weight, loads, amount,
    breaks ─ Hourly-job unpaid breaks. MUST pass when has_breaks was true.
            Format: an array of {"start":"HH:MM","end":"HH:MM","tag":"Lunch"} objects,
                    times in 24-hour. Example for a half-hour lunch:
                      [{"start":"12:00","end":"12:30","tag":"Lunch"}]
            Omit (or pass []) when has_breaks was false.
            The job's paid hours are computed as (endTime − startTime) minus the
            total break duration, so dropping this field on an hourly job
            silently overcharges the customer.

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
  • If NO and the parsed ticket HAD a driver name → call list_drivers(search="<name>")
    first. Still no match → ask the user, collect fields, call create_driver.
  • If NO and the parsed ticket had NO driver field (parsed driver was null) →
    DEFAULT: call list_drivers(search="Amritinder Cheema") and use that
    driverId. Do NOT prompt the user — this is the configured fallback driver.

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
  • BREAKS: If the parser set has_breaks=true (or the user confirmed a default
    break), you MUST include the breaks array in the create_job call:
      breaks: [{"start":"12:00","end":"12:30","tag":"Lunch"}]
    Use the times from parsed.breaks (or the user's confirmed times). Skipping
    this on an hourly job silently overcharges — the job amount won't deduct
    the unpaid break minutes.
  • Report: ✅ Job created — <date> — <job type> (id: <uuid>)
            ✅ Created: <any newly-created entities>
            🕑 Paid hours: <hours> (after deducting <break_minutes> min of breaks)

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
            parsed = await parseImage(llmImages, userMessage, args.callProvider);
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
            content: `Below is the structured data already extracted from the uploaded document. Use this as your input — do NOT ask me to provide it again, it is right here:\n\n` +
                '```json\n' + parsed + '\n```\n\n' +
                `Now validate every entity in this JSON against the database by calling list_companies / list_dispatchers / list_drivers / list_units / list_job_types (and list_jobs for paystubs). After all lookups complete, present the markdown summary with ✓ / ❌ for each role and ask one focused question for any ❌.${seedNote}`,
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
