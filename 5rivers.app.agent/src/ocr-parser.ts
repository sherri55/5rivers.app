/**
 * OCR Output Parser
 *
 * Converts free-text OCR output from the vision model (gemma-4-e4b) into
 * strongly-typed, machine-parseable structures that the document processor
 * can operate on deterministically.
 */

// ─── Public types ────────────────────────────────────────────────────────────

export type DocumentExtraction =
  | TicketExtraction
  | PaystubExtraction
  | UnknownExtraction;

export interface TicketExtraction {
  type: 'ticket';
  date: string | null;
  ticketNumber: string | null;
  company: string | null;       // letterhead — maps to companyId
  dispatcher: string | null;    // "Trucking Co" field — maps to dispatcherId
  unit: string | null;
  driver: string | null;
  startTime: string | null;
  endTime: string | null;
  startLocation: string | null;
  endLocation: string | null;
  material: string | null;
}

export interface PaystubLineItem {
  date: string | null;          // null = OCR could not read it
  amount: number | null;
  ref: string | null;
}

export interface PaystubExtraction {
  type: 'paystub';
  issuedBy: string | null;      // dispatcher who issued the cheque
  periodFrom: string | null;
  periodTo: string | null;
  lineItems: PaystubLineItem[];
  /** true when ≥50% of lineItems have a non-null date */
  datesReadable: boolean;
}

export interface UnknownExtraction {
  type: 'unknown';
  rawText: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalise a raw OCR value: "not visible", "none", "n/a", "" → null */
function norm(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^(not\s+visible|none|n\/?a|unknown|-)$/i.test(trimmed)) return null;
  return trimmed;
}

/** Extract a field value from text:  "FIELD_NAME: <value>" */
function extractField(text: string, fieldName: string): string | null {
  const re = new RegExp(`^${fieldName}\\s*:\\s*(.+)$`, 'mi');
  const m = text.match(re);
  return norm(m?.[1]);
}

/** Parse a dollar string like "$1,234.56" or "1234.56" into a number */
function parseDollar(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

// ─── Document type detection ─────────────────────────────────────────────────

type DocType = 'ticket' | 'paystub' | 'unknown';

function detectType(text: string): DocType {
  // Explicit TYPE: line takes priority
  const typeMatch = text.match(/^TYPE\s*:\s*(\S+)/mi);
  if (typeMatch) {
    const val = typeMatch[1].toLowerCase();
    if (val === 'ticket' || val === 'timesheet') return 'ticket';
    if (val === 'paystub' || val === 'remittance') return 'paystub';
  }

  // Heuristic fallback: look for distinctive markers
  if (/LINE_ITEMS\s*:/i.test(text) || /ISSUED_BY\s*:/i.test(text)) return 'paystub';
  if (/TICKET_NUMBER\s*:/i.test(text) && /COMPANY\s*:/i.test(text)) return 'ticket';

  return 'unknown';
}

// ─── Ticket parser ───────────────────────────────────────────────────────────

function parseTicket(text: string): TicketExtraction {
  return {
    type: 'ticket',
    date:          extractField(text, 'DATE'),
    ticketNumber:  extractField(text, 'TICKET_NUMBER'),
    company:       extractField(text, 'COMPANY'),
    dispatcher:    extractField(text, 'DISPATCHER'),
    unit:          extractField(text, 'UNIT'),
    driver:        extractField(text, 'DRIVER'),
    startTime:     extractField(text, 'START_TIME'),
    endTime:       extractField(text, 'END_TIME'),
    startLocation: extractField(text, 'START_LOCATION'),
    endLocation:   extractField(text, 'END_LOCATION'),
    material:      extractField(text, 'MATERIAL'),
  };
}

// ─── Paystub parser ──────────────────────────────────────────────────────────

/**
 * Parse a single line item line.
 * Expected format:  - DATE: <date> | AMOUNT: <amount> | REF: <ref>
 * Also handles partial formats where fields may be missing.
 */
function parseLineItem(line: string): PaystubLineItem | null {
  // Try structured format first: DATE: ... | AMOUNT: ... | REF: ...
  const dateMatch   = line.match(/DATE\s*:\s*([^|]+)/i);
  const amountMatch = line.match(/AMOUNT\s*:\s*([^|]+)/i);
  const refMatch    = line.match(/REF\s*:\s*(.+)/i);

  // If we can't find at least an amount, skip this line
  if (!dateMatch && !amountMatch) return null;

  const rawDate   = norm(dateMatch?.[1]);
  const rawAmount = amountMatch?.[1]?.trim();
  const rawRef    = norm(refMatch?.[1]);

  return {
    date:   rawDate,
    amount: rawAmount ? parseDollar(rawAmount) : null,
    ref:    rawRef,
  };
}

function parsePaystub(text: string): PaystubExtraction {
  const issuedBy   = extractField(text, 'ISSUED_BY');
  const periodFrom = extractField(text, 'PERIOD_FROM');
  const periodTo   = extractField(text, 'PERIOD_TO');

  // Find LINE_ITEMS section and parse each "- " prefixed line
  const lineItems: PaystubLineItem[] = [];
  const lineItemsIdx = text.search(/LINE_ITEMS\s*:/i);

  if (lineItemsIdx !== -1) {
    const after = text.slice(lineItemsIdx);
    const lines = after.split('\n');
    for (const line of lines) {
      // Each line item starts with "- " or "• " or a number "1."
      if (/^\s*[-•]\s/.test(line) || /^\s*\d+\.\s/.test(line)) {
        const item = parseLineItem(line);
        if (item) lineItems.push(item);
      }
    }
  }

  const withDate = lineItems.filter((li) => li.date !== null).length;
  const datesReadable = lineItems.length > 0 && withDate >= lineItems.length * 0.5;

  return {
    type: 'paystub',
    issuedBy,
    periodFrom,
    periodTo,
    lineItems,
    datesReadable,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse raw OCR text into a typed extraction.
 * Returns an `UnknownExtraction` when the text cannot be identified as
 * a ticket or paystub — the caller should fall through to the LLM.
 */
export function parseOCROutput(rawText: string): DocumentExtraction {
  if (!rawText?.trim()) {
    return { type: 'unknown', rawText: rawText ?? '' };
  }

  const docType = detectType(rawText);

  switch (docType) {
    case 'ticket':
      return parseTicket(rawText);
    case 'paystub':
      return parsePaystub(rawText);
    default:
      return { type: 'unknown', rawText };
  }
}

/**
 * Parse raw OCR text that may contain multiple entries separated by `---`.
 *
 * A single document image might have multiple tickets, loads, or entries.
 * The OCR instruction tells the model to separate them with `---`.
 * Returns an array of extractions — one per entry found.
 */
export function parseOCROutputMulti(rawText: string): DocumentExtraction[] {
  if (!rawText?.trim()) {
    return [{ type: 'unknown', rawText: rawText ?? '' }];
  }

  // Split on separator lines: 3+ dashes alone on a line
  const sections = rawText
    .split(/\n-{3,}\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sections.length <= 1) {
    return [parseOCROutput(rawText)];
  }

  return sections.map((section) => parseOCROutput(section));
}
