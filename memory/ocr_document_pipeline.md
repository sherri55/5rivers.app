---
name: OCR Document Pipeline
description: Code-driven OCR document processing — tickets, paystubs, multi-entry support
type: architecture
---

# OCR Document Pipeline

## Overview
Documents (tickets, paystubs) are processed entirely by TypeScript code — no LLM reasoning involved. The OCR vision model only extracts text; all parsing, validation, entity resolution, and tool orchestration is deterministic code.

## Files
- `5rivers.app.agent/src/ocr-parser.ts` — Parses OCR text into typed structs
- `5rivers.app.agent/src/document-processor.ts` — Orchestrates tool calls from parsed data
- `5rivers.app.agent/src/llm.ts` — `callOCRModel()` sends images, routes results

## OCR Extraction Format
The OCR model is instructed to output structured key-value data:

**Tickets:**
```
TYPE: ticket
DATE: Dec 14, 2025
TICKET_NUMBER: 4521
COMPANY: Birnam Aggregates
DISPATCHER: Wroom Inc
...
```

**Paystubs:**
```
TYPE: paystub
ISSUED_BY: Wroom Inc
LINE_ITEMS:
- DATE: Dec 5, 2025 | AMOUNT: $450.00 | REF: none
- DATE: Dec 6, 2025 | AMOUNT: $525.00 | REF: 1234
```

**Multiple entries** are separated by `---` on a line by itself.

## Types (`ocr-parser.ts`)
```typescript
type DocumentExtraction = TicketExtraction | PaystubExtraction | UnknownExtraction;
```
- `TicketExtraction` — date, ticketNumber, company, dispatcher, unit, driver, times, locations, material
- `PaystubExtraction` — issuedBy, periodFrom/To, lineItems[], datesReadable (boolean)
- `UnknownExtraction` — rawText fallthrough to LLM

### Key functions:
- `parseOCROutput(rawText)` → single `DocumentExtraction`
- `parseOCROutputMulti(rawText)` → `DocumentExtraction[]` (splits by `---`)

## Document Processor (`document-processor.ts`)

### Entry points:
- `processDocument(extraction, client, supervised)` — single extraction
- `processDocuments(extractions[], client, supervised)` — multi-entry (main entry point)

### Ticket processing:
1. Resolve entities via fuzzy match: company, dispatcher, unit, driver
2. Resolve job type from company's job types list
3. Build confirmation summary with ✓/❌ markers
4. If supervised → return `needsConfirmation` with pre-built `create_job` args
5. On confirm → execute `create_job`

### Multiple tickets:
- `EntityResolver` class caches lookups (same company resolved once across all tickets)
- All tickets summarized in numbered list before any writes
- All `create_job` writes collected into one confirmation prompt

### Paystub processing:
- **Path A (dates readable):** For each line item with date+amount → `mark_job_paid_by_date`
- **Path B (dates not readable):** Fetch unpaid jobs → match by amount (10% tolerance) → confirm → mark
- Results shown in markdown table with status: ✅ Marked, ⚠️ Flagged, ❌ Not found, 🔵 Already paid

### Entity resolution:
- Uses `list_dispatchers`, `list_companies`, etc. with fuzzy search
- Parses `USE_ID:` / `MULTIPLE_MATCHES` / `NO_MATCH` from `formatFuzzyResult()` output
- `parseUseIdFromResult()` helper extracts id+name from tool response text

### Error handling (all in code):
| OCR gap | Response |
|---------|----------|
| `issuedBy: null` | "Could not identify the issuing company." |
| Zero lineItems | "Could not extract line items. Send a clearer photo." |
| `date: null` on ticket | "Could not read the job date. Please provide it." |
| Unknown doc type | Falls through to tool-calling model |

## `formatWriteResults()` — Post-confirmation output
- Single `create_job` → "✅ Job created successfully."
- Multiple `create_job` → table: `| # | Date | Ticket | Status |`
- `mark_job_paid_by_date` → table: `| # | Date | System | Var% | Status |`
