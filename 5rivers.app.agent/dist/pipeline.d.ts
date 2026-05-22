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
import { type Message } from './conversation.js';
export interface PipelineImage {
    data: string;
    mimeType: string;
}
export type Phase = 'idle' | 'validating' | 'creating';
export interface PipelineState {
    phase: Phase;
    /** Raw structured extraction returned by the parser (JSON-as-text). */
    parsedData: string;
    /** Original ticket image(s) that started this pipeline. Held until every
     *  create_job call in the creating phase has had the image attached. */
    images: PipelineImage[];
    /** When did this state last change — used for diagnostics / TTL if needed. */
    updatedAt: number;
}
export declare function getPhase(platform: string, userId: string): Phase;
export declare function getState(platform: string, userId: string): PipelineState | undefined;
export declare function setState(platform: string, userId: string, state: Omit<PipelineState, 'updatedAt'>): void;
export declare function clearState(platform: string, userId: string): void;
/** Read the original image(s) buffered for this conversation, if any. Returns
 *  an empty array when no pipeline state exists or no images were buffered. */
export declare function getImages(platform: string, userId: string): PipelineImage[];
/** Read-only tools the Validator agent may call. */
export declare const VALIDATOR_TOOLS: ReadonlySet<string>;
/** Write tools (plus list lookups) the Creator agent may call. */
export declare const CREATOR_TOOLS: ReadonlySet<string>;
export declare function getToolFilterForPhase(phase: Phase): ReadonlySet<string> | undefined;
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
export declare const PARSER_OUTPUT_SCHEMA: {
    readonly oneOf: readonly [{
        readonly type: "object";
        readonly required: readonly ["type", "date", "ticketNumber", "letterheadName", "letterheadKind", "customerName", "dispatcherHint", "unit", "driver", "foreman", "jobLocation", "startTime", "endTime", "has_breaks", "breaks", "startLocation", "endLocation", "material", "loads"];
        readonly additionalProperties: false;
        readonly properties: {
            readonly type: {
                readonly type: "string";
                readonly enum: readonly ["ticket"];
            };
            readonly date: {
                readonly type: readonly ["string", "null"];
            };
            readonly ticketNumber: {
                readonly type: readonly ["string", "null"];
            };
            readonly letterheadName: {
                readonly type: readonly ["string", "null"];
            };
            readonly letterheadKind: {
                readonly type: "string";
                readonly enum: readonly ["trucking", "construction", "unknown"];
                readonly description: string;
            };
            readonly customerName: {
                readonly type: readonly ["string", "null"];
            };
            readonly dispatcherHint: {
                readonly type: readonly ["string", "null"];
            };
            readonly unit: {
                readonly type: readonly ["string", "null"];
            };
            readonly driver: {
                readonly type: readonly ["string", "null"];
            };
            readonly foreman: {
                readonly type: readonly ["string", "null"];
                readonly description: "Value of \"Foreman\" / \"Supervisor\" / \"Site Contact\" field — informational only, NEVER an entity.";
            };
            readonly jobLocation: {
                readonly type: readonly ["string", "null"];
                readonly description: "Value of \"Job #\" / \"Job/Loc\" / \"Loc\" / \"Site\" / \"Profile #\" — a site code or location reference, NOT a customer name.";
            };
            readonly startTime: {
                readonly type: readonly ["string", "null"];
            };
            readonly endTime: {
                readonly type: readonly ["string", "null"];
            };
            readonly has_breaks: {
                readonly type: "boolean";
                readonly description: "true if any break is indicated on the document (checkbox, label, two-session time table), false if none";
            };
            readonly breaks: {
                readonly type: "array";
                readonly description: "Empty when has_breaks is false. One entry per break when has_breaks is true.";
                readonly items: {
                    readonly type: "object";
                    readonly required: readonly ["start", "end", "tag"];
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly start: {
                            readonly type: readonly ["string", "null"];
                            readonly description: "Break start HH:MM (24h), or null if not legible";
                        };
                        readonly end: {
                            readonly type: readonly ["string", "null"];
                            readonly description: "Break end   HH:MM (24h), or null if not legible";
                        };
                        readonly tag: {
                            readonly type: "string";
                            readonly description: "Label as printed, e.g. \"Lunch\", \"Coffee\", \"Break\"";
                        };
                    };
                };
            };
            readonly startLocation: {
                readonly type: readonly ["string", "null"];
            };
            readonly endLocation: {
                readonly type: readonly ["string", "null"];
            };
            readonly material: {
                readonly type: readonly ["string", "null"];
            };
            readonly loads: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly required: readonly ["from", "to", "material", "count"];
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly from: {
                            readonly type: "string";
                        };
                        readonly to: {
                            readonly type: "string";
                        };
                        readonly material: {
                            readonly type: "string";
                        };
                        readonly count: {
                            readonly type: readonly ["string", "null"];
                        };
                    };
                };
            };
        };
    }, {
        readonly type: "object";
        readonly required: readonly ["type", "issuedBy", "periodFrom", "periodTo", "lineItems"];
        readonly additionalProperties: false;
        readonly properties: {
            readonly type: {
                readonly type: "string";
                readonly enum: readonly ["paystub"];
            };
            readonly issuedBy: {
                readonly type: readonly ["string", "null"];
            };
            readonly periodFrom: {
                readonly type: readonly ["string", "null"];
            };
            readonly periodTo: {
                readonly type: readonly ["string", "null"];
            };
            readonly lineItems: {
                readonly type: "array";
                readonly items: {
                    readonly type: "object";
                    readonly required: readonly ["date", "amount", "ref"];
                    readonly additionalProperties: false;
                    readonly properties: {
                        readonly date: {
                            readonly type: readonly ["string", "null"];
                        };
                        readonly amount: {
                            readonly type: "number";
                        };
                        readonly ref: {
                            readonly type: readonly ["string", "null"];
                        };
                    };
                };
            };
        };
    }, {
        readonly type: "array";
        readonly items: {
            readonly type: "object";
            readonly required: readonly ["type", "date", "ticketNumber", "letterheadName", "letterheadKind", "customerName", "dispatcherHint", "unit", "driver", "foreman", "jobLocation", "startTime", "endTime", "has_breaks", "breaks", "startLocation", "endLocation", "material", "loads"];
            readonly additionalProperties: false;
            readonly properties: {
                readonly type: {
                    readonly type: "string";
                    readonly enum: readonly ["ticket"];
                };
                readonly date: {
                    readonly type: readonly ["string", "null"];
                };
                readonly ticketNumber: {
                    readonly type: readonly ["string", "null"];
                };
                readonly letterheadName: {
                    readonly type: readonly ["string", "null"];
                };
                readonly letterheadKind: {
                    readonly type: "string";
                    readonly enum: readonly ["trucking", "construction", "unknown"];
                    readonly description: string;
                };
                readonly customerName: {
                    readonly type: readonly ["string", "null"];
                };
                readonly dispatcherHint: {
                    readonly type: readonly ["string", "null"];
                };
                readonly unit: {
                    readonly type: readonly ["string", "null"];
                };
                readonly driver: {
                    readonly type: readonly ["string", "null"];
                };
                readonly foreman: {
                    readonly type: readonly ["string", "null"];
                    readonly description: "Value of \"Foreman\" / \"Supervisor\" / \"Site Contact\" field — informational only, NEVER an entity.";
                };
                readonly jobLocation: {
                    readonly type: readonly ["string", "null"];
                    readonly description: "Value of \"Job #\" / \"Job/Loc\" / \"Loc\" / \"Site\" / \"Profile #\" — a site code or location reference, NOT a customer name.";
                };
                readonly startTime: {
                    readonly type: readonly ["string", "null"];
                };
                readonly endTime: {
                    readonly type: readonly ["string", "null"];
                };
                readonly has_breaks: {
                    readonly type: "boolean";
                    readonly description: "true if any break is indicated on the document (checkbox, label, two-session time table), false if none";
                };
                readonly breaks: {
                    readonly type: "array";
                    readonly description: "Empty when has_breaks is false. One entry per break when has_breaks is true.";
                    readonly items: {
                        readonly type: "object";
                        readonly required: readonly ["start", "end", "tag"];
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly start: {
                                readonly type: readonly ["string", "null"];
                                readonly description: "Break start HH:MM (24h), or null if not legible";
                            };
                            readonly end: {
                                readonly type: readonly ["string", "null"];
                                readonly description: "Break end   HH:MM (24h), or null if not legible";
                            };
                            readonly tag: {
                                readonly type: "string";
                                readonly description: "Label as printed, e.g. \"Lunch\", \"Coffee\", \"Break\"";
                            };
                        };
                    };
                };
                readonly startLocation: {
                    readonly type: readonly ["string", "null"];
                };
                readonly endLocation: {
                    readonly type: readonly ["string", "null"];
                };
                readonly material: {
                    readonly type: readonly ["string", "null"];
                };
                readonly loads: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "object";
                        readonly required: readonly ["from", "to", "material", "count"];
                        readonly additionalProperties: false;
                        readonly properties: {
                            readonly from: {
                                readonly type: "string";
                            };
                            readonly to: {
                                readonly type: "string";
                            };
                            readonly material: {
                                readonly type: "string";
                            };
                            readonly count: {
                                readonly type: readonly ["string", "null"];
                            };
                        };
                    };
                };
            };
        };
    }];
};
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
export declare const HTML_PARSER_PROMPT = "You are the Parser agent for 5Rivers Trucking. Your ONLY job is to extract structured data from the HTML document below. The HTML was generated by an OCR model \u2014 it uses <u> tags for filled/handwritten fields and data-label attributes for field names. You have NO tools and take NO actions \u2014 you only produce JSON.\n\nDetermine if the document is a TICKET / TIMESHEET or a PAYSTUB / REMITTANCE, then output the matching JSON shape.\n\n\u2501\u2501 TICKET \u2501\u2501\n{\n  \"type\": \"ticket\",\n  \"date\": \"<as printed, or null>\",\n  \"ticketNumber\": \"<see TICKET # RULES, or null>\",\n  \"letterheadName\": \"<company name at the TOP of the page \u2014 the letterhead>\",\n  \"letterheadKind\": \"<trucking | construction | unknown \u2014 see LETTERHEAD KIND>\",\n  \"customerName\": \"<see ROLE FIELD RULES, or null>\",\n  \"dispatcherHint\": \"<see ROLE FIELD RULES, or null>\",\n  \"unit\": \"<truck/unit number with company tokens stripped, or null>\",\n  \"driver\": \"<see DRIVER RULES, or null>\",\n  \"foreman\": \"<value of 'Foreman' / 'Supervisor' / 'Site Contact' field, or null>\",\n  \"jobLocation\": \"<value of 'Job #' / 'Job/Loc' / 'Loc' / 'Site' / 'Profile #' field, or null \u2014 SITE CODE only, never a customer name>\",\n  \"startTime\": \"<see TIME RULES, or null>\",\n  \"endTime\": \"<see TIME RULES, or null>\",\n  \"has_breaks\": <true | false>,\n  \"breaks\": [\n    { \"start\": \"<HH:MM or null>\", \"end\": \"<HH:MM or null>\", \"tag\": \"<label, e.g. Lunch>\" }\n  ],\n  \"startLocation\": \"<haul-from of the FIRST load row (or 'Sending Site'), or null>\",\n  \"endLocation\": \"<haul-to of the FIRST load row (or 'Receiving Site'), or null>\",\n  \"material\": \"<material of the FIRST load row, or null>\",\n  \"loads\": [\n    { \"from\": \"<\u2026>\", \"to\": \"<\u2026>\", \"material\": \"<\u2026>\", \"count\": \"<as printed, or null>\" }\n  ]\n}\n\n\u2501\u2501 LETTERHEAD KIND \u2501\u2501\nletterheadKind classifies the letterhead's company TYPE. The Validator uses this\nas a tiebreaker when a name matches in both Companies AND Dispatchers tables.\n\n\"trucking\"      \u2014 letterhead name contains: Trucking, Haulage, Transport,\n                  Logistics, Carriers, Cartage, Freight  (case-insensitive)\n                  \u2192 Almost always a Dispatcher.\n\"construction\"  \u2014 letterhead name contains: Construction, Excavating, Excavation,\n                  Aggregates, Paving, Contractors, Materials, Concrete, Asphalt,\n                  Demolition, Development, Builders  (case-insensitive)\n                  \u2192 Almost always a Customer.\n\"unknown\"       \u2014 letterhead doesn't clearly match either category, OR no\n                  letterhead is present.\n\n\u2501\u2501 ROLE FIELD RULES \u2501\u2501\ncustomerName    \u2014 Populate ONLY from a data-label containing:\n                  \"Customer\", \"Bill To\", \"Bill-To\", \"Client\", \"Account\", \"Sold To\"\n                  DO NOT populate from \"Job #\", \"Job/Loc\", \"Loc\", \"Site\", \"Foreman\".\n                  Null if no such label exists.\ndispatcherHint  \u2014 Populate ONLY from a data-label containing:\n                  \"Trucking Co\", \"Trucking Company\", \"Dispatched by\",\n                  \"Carrier\", \"Hauler\", \"Haulage Co\"\n                  Null if no such label exists.\nletterheadName  \u2014 Always populate when a letterhead/logo is visible at the top.\n                  Never swap with customerName or dispatcherHint.\n\n\u2501\u2501 TICKET # RULES \u2501\u2501\n\nExactly ONE ticket number per document \u2014 almost always present. Do NOT\nleave null unless you have searched the entire HTML and found nothing.\n\nWHERE TO LOOK (in priority order):\n\n  \u2776 Top-right of the page \u2014 pre-printed number, often inside a <div> with a\n    distinct class/style or near a \"Ticket #\", \"No.\", \"Doc #\", or \"#\" label.\n        Examples: \"12815\", \"1252\", \"3074\", \"No. 3074\"\n\n  \u2777 Near or under the letterhead block \u2014 small pre-printed number in the\n    same area as the company name/address, often with leading zeros.\n        Examples: \"00254\" directly below a \"BKT EXCAVATING\" logo\n\n  \u2778 Bottom of the page \u2014 faint number near \"Trucker's Signature\" or in the\n    footer, sometimes with a \"NO\" / \"NO.\" / \"#\" prefix.\n        Examples: \"NO 54625\"\n\nVISUAL / STRUCTURAL CLUES in the OCR HTML:\n  \u2022 A <div> or <span> with no data-label, containing just a numeric string\n    in a position separate from the loads table \u2014 usually the ticket #.\n  \u2022 A data-label=\"Ticket #\" / \"No.\" / \"Doc #\" attribute \u2014 the value is the\n    ticket #, UNLESS that label appears as a COLUMN HEADER in a <tr> row\n    (see anti-patterns below).\n  \u2022 Pre-printed values (plain text) \u2014 NOT <u>\u2026</u> handwritten values.\n    Ticket numbers are almost always typed/stamped, not handwritten.\n  \u2022 Three to seven digits, occasionally with a letter prefix.\n\nNEVER use any of the following as the ticket number:\n\n  \u2717 Per-row values under a \"Ticket #\" column in a loads table.\n    On Birnam-style tickets, the load table has a \"Ticket #\" column whose\n    per-row values are tally marks like \"I\", \"II\", \"III\" or \"|\", \"||\",\n    \"|||\", \"1\", \"11\", \"111\" \u2014 these are LOAD COUNTS per row, not document\n    IDs. The real ticket # for Birnam is \"54625\" near the bottom of the\n    page, completely outside the load table.\n\n  \u2717 The \"Job #\" / \"Job/Loc\" / \"Job No.\" value \u2014 goes to jobLocation.\n\n  \u2717 The \"Truck #\" / \"Unit #\" / \"Trailer #\" \u2014 goes to unit.\n\n  \u2717 Phone numbers, postal codes, license plates, dates, times, amounts.\n\n  \u2717 Sequential row indices in load logs (1, 2, 3, \u2026).\n\nEXAMPLES of correct ticketNumber extraction:\n\n  Birnam-style:    \"54625\"  (faint, bottom-left, \"NO\" prefix in HTML)\n  Lucy's-style:    \"12815\"  (top-right, plain)\n  Wroom-style:     \"1252\"   (top-right, plain)\n  Farmers Pride:   \"3074\"   (top-right in a box, \"No.\" prefix)\n  BKT-style:       \"00254\"  (under BKT logo \u2014 KEEP leading zeros)\n\nPRESERVE leading zeros \u2014 \"00254\" must stay as \"00254\", never \"254\".\n\n\u2501\u2501 UNIT RULES \u2501\u2501\nExtract just the truck/unit identifier. Strip any company tokens:\n- \"52 (5RIVERS)\" \u2192 \"52\"\n- \"WROOM 52\"     \u2192 \"52\"\n- \"HP 52\"        \u2192 \"52\"\n\n\u2501\u2501 DRIVER RULES \u2501\u2501\nPopulate driver ONLY from a data-label \"Driver\" or \"Driver Name\".\nNEVER use \"Foreman\", \"Supervisor\", \"Site Contact\" \u2014 those go to foreman.\nIf no Driver field exists, driver is null.\n\n\u2501\u2501 TIME RULES \u2501\u2501\nTwo layouts to recognise:\nA. Single session: \"Time In\" / \"Time Out\" (or \"Start\" / \"Finish\")\n   \u2192 startTime = Time In, endTime = Time Out\nB. Two sessions (start | stop | start | stop in a row):\n   \u2192 startTime = earliest start, endTime = latest stop\n   \u2192 has_breaks = true, breaks = [{\"start\": \"<session1 end>\", \"end\": \"<session2 start>\", \"tag\": \"Lunch\"}]\n\n\u2501\u2501 LOCATION RULES \u2501\u2501\nRecognize as From / To:\n- \"From\" / \"To\"                       (Lucy's, Farmers Pride, Wroom)\n- \"Sending Site\" / \"Receiving Site\"   (BKT-style)\n- \"Pit\" / \"Job Site\"\n\nNOTE: Do NOT decide which name is the \"company\" vs \"dispatcher\" \u2014 the Validator agent resolves that by querying both tables. Always populate \"letterheadName\" when there is a letterhead. Populate \"customerName\" only when there is an explicit Customer/Bill-To label. Populate \"dispatcherHint\" only when there is an explicit Trucking Co / Dispatched by / Carrier label.\n\nThe \"loads\" array should contain one entry per <tr> row in the loads/details table. The flat \"startLocation\" / \"endLocation\" / \"material\" fields mirror the FIRST load row.\n\n\u2501\u2501 BREAKS RULES \u2501\u2501\nhas_breaks  true  when ANY break indicator exists in the HTML: a checked checkbox\n                  labelled \"Lunch\" / \"Break\" / \"Coffee\", a printed break field, a\n                  checked <input type=\"checkbox\"> near a break label, etc.\n            false when there is no break indicator at all.\n\nbreaks      []   when has_breaks is false  (REQUIRED \u2014 never omit).\n            When has_breaks is true \u2014 one object per break:\n              Times in <u> tags  \u2192 {\"start\":\"12:00\",\"end\":\"12:30\",\"tag\":\"Lunch\"}\n              Times missing/null \u2192 {\"start\":null,\"end\":null,\"tag\":\"Break\"}\n            A null-time entry signals the Validator to default to 30 minutes\n            and confirm with the user. Most tickets have at most one lunch break.\n\n\u2501\u2501 PAYSTUB \u2501\u2501\n{\n  \"type\": \"paystub\",\n  \"issuedBy\": \"<company that issued the cheque (the payer), or null>\",\n  \"periodFrom\": \"<pay period start, or null>\",\n  \"periodTo\": \"<pay period end, or null>\",\n  \"lineItems\": [\n    { \"date\": \"<as printed, or null>\", \"amount\": <number>, \"ref\": \"<ref / ticket #, or null>\" }\n  ]\n}\n\n\u2501\u2501 MULTIPLE ENTRIES \u2501\u2501\nMultiple distinct tickets \u2192 output a JSON array of ticket objects.\nMultiple paystub sections (same issuer) \u2192 merge lineItems into one paystub object.\n\n\u2501\u2501 HTML READING NOTES \u2501\u2501\n- Text inside <u> tags = filled / handwritten values \u2014 these are the actual data.\n- data-label attribute = the field name; text inside the element = field value.\n- <img> tags usually represent signatures or stamps \u2014 check adjacent text for context.\n- Stamped / pre-printed numbers (ticket #, unit #) appear as plain text near labels.\n- Tables: each <tr> row is one load entry. Read <td> cells left-to-right.\n- Ignore layout wrappers (<div> with no data-label and no text content).\n- Checkbox state: checked = true indicator; unchecked = ignored.\n\n\u2501\u2501 STRICT RULES \u2501\u2501\n- Output ONLY JSON. No prose, no markdown fences, no commentary.\n- Copy values exactly as they appear \u2014 do NOT interpret, convert, normalize, or correct.\n- Use null for any field that is not visible / not readable.\n- letterheadKind, foreman, jobLocation, has_breaks, breaks are REQUIRED in every ticket.\n- Paystub: each table row = exactly one lineItems entry. NEVER include totals, subtotals, or cheque amounts.\n- Paystub amounts MUST be numbers (no $, no commas).";
/**
 * Build a text-only Message for the HTML-parsing step (local OCR mode).
 * The OCR model has already converted the image to HTML; this message asks
 * the tool model to extract structured JSON from that HTML.
 */
export declare function buildHtmlParserMessage(html: string, userContext: string): Message;
/**
 * One-shot image-to-JSON extraction using the active cloud provider.
 * Builds a standard Message array (system prompt + user message with inline
 * images) and calls `callProvider` — same interface used by every other turn.
 */
export declare function parseImage(images: PipelineImage[], userMessage: string, callProvider: (messages: Message[]) => Promise<string>): Promise<string>;
export declare function buildValidatorPrompt(easternDate: string): string;
export declare function buildCreatorPrompt(easternDate: string): string;
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
export declare function isCreateConfirmation(userMessage: string, history: Message[]): boolean;
export interface PipelineRouting {
    /** True when the pipeline took ownership of this turn — caller must skip its
     *  default user-message handling and go straight to the agent loop. */
    handled: boolean;
    /** Phase the agent loop should run under. */
    phase: Phase;
    /** Tool filter to pass into provider.chat(). Undefined = no filtering. */
    toolFilter?: ReadonlySet<string>;
}
/**
 * Inspect the current pipeline state and the incoming message, decide which
 * phase to run under, and prepare the conversation accordingly (system prompt,
 * appended messages). Returns the tool filter the agent loop should use.
 *
 * Only invoked for the Gemini provider.
 */
export declare function routePipelineTurn(args: {
    platform: string;
    userId: string;
    userMessage: string;
    images?: PipelineImage[];
    resumingFromConfirmation: boolean;
    easternDate: string;
    /** One-shot chat function used by the Parser phase. */
    callProvider: (messages: Message[]) => Promise<string>;
}): Promise<PipelineRouting>;
/** Human-friendly description of the active phase, for logging / debug. */
export declare function describePhase(phase: Phase): string;
