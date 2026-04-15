/**
 * OCR Output Parser
 *
 * Converts free-text OCR output from the vision model (gemma-4-e4b) into
 * strongly-typed, machine-parseable structures that the document processor
 * can operate on deterministically.
 */
// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Normalise a raw OCR value: "not visible", "none", "n/a", "" → null */
function norm(raw) {
    if (!raw)
        return null;
    const trimmed = raw.trim();
    if (!trimmed)
        return null;
    if (/^(not\s+visible|none|n\/?a|unknown|-)$/i.test(trimmed))
        return null;
    return trimmed;
}
/** Extract a field value from text:  "FIELD_NAME: <value>" */
function extractField(text, fieldName) {
    const re = new RegExp(`^${fieldName}\\s*:\\s*(.+)$`, 'mi');
    const m = text.match(re);
    return norm(m?.[1]);
}
/** Parse a dollar string like "$1,234.56" or "1234.56" into a number */
function parseDollar(raw) {
    const cleaned = raw.replace(/[$,\s]/g, '');
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
}
function detectType(text) {
    // Explicit TYPE: line takes priority
    const typeMatch = text.match(/^TYPE\s*:\s*(\S+)/mi);
    if (typeMatch) {
        const val = typeMatch[1].toLowerCase();
        if (val === 'ticket' || val === 'timesheet')
            return 'ticket';
        if (val === 'paystub' || val === 'remittance')
            return 'paystub';
    }
    // Heuristic fallback: look for distinctive markers
    if (/LINE_ITEMS\s*:/i.test(text) || /ISSUED_BY\s*:/i.test(text))
        return 'paystub';
    if (/TICKET_NUMBER\s*:/i.test(text) && /COMPANY\s*:/i.test(text))
        return 'ticket';
    return 'unknown';
}
// ─── Ticket parser ───────────────────────────────────────────────────────────
function parseTicket(text) {
    return {
        type: 'ticket',
        date: extractField(text, 'DATE'),
        ticketNumber: extractField(text, 'TICKET_NUMBER'),
        company: extractField(text, 'COMPANY'),
        dispatcher: extractField(text, 'DISPATCHER'),
        unit: extractField(text, 'UNIT'),
        driver: extractField(text, 'DRIVER'),
        startTime: extractField(text, 'START_TIME'),
        endTime: extractField(text, 'END_TIME'),
        startLocation: extractField(text, 'START_LOCATION'),
        endLocation: extractField(text, 'END_LOCATION'),
        material: extractField(text, 'MATERIAL'),
    };
}
// ─── Paystub parser ──────────────────────────────────────────────────────────
/**
 * Parse a single line item line.
 * Expected format:  - DATE: <date> | AMOUNT: <amount> | REF: <ref>
 * Also handles partial formats where fields may be missing.
 */
function parseLineItem(line) {
    // Try structured format first: DATE: ... | AMOUNT: ... | REF: ...
    const dateMatch = line.match(/DATE\s*:\s*([^|]+)/i);
    const amountMatch = line.match(/AMOUNT\s*:\s*([^|]+)/i);
    const refMatch = line.match(/REF\s*:\s*(.+)/i);
    // If we can't find at least an amount, skip this line
    if (!dateMatch && !amountMatch)
        return null;
    const rawDate = norm(dateMatch?.[1]);
    const rawAmount = amountMatch?.[1]?.trim();
    const rawRef = norm(refMatch?.[1]);
    return {
        date: rawDate,
        amount: rawAmount ? parseDollar(rawAmount) : null,
        ref: rawRef,
    };
}
function parsePaystub(text) {
    const issuedBy = extractField(text, 'ISSUED_BY');
    const periodFrom = extractField(text, 'PERIOD_FROM');
    const periodTo = extractField(text, 'PERIOD_TO');
    // Find LINE_ITEMS section and parse each "- " prefixed line
    const lineItems = [];
    const lineItemsIdx = text.search(/LINE_ITEMS\s*:/i);
    if (lineItemsIdx !== -1) {
        const after = text.slice(lineItemsIdx);
        const lines = after.split('\n');
        for (const line of lines) {
            // Each line item starts with "- " or "• " or a number "1."
            if (/^\s*[-•]\s/.test(line) || /^\s*\d+\.\s/.test(line)) {
                const item = parseLineItem(line);
                if (item)
                    lineItems.push(item);
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
export function parseOCROutput(rawText) {
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
