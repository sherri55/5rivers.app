---
name: Key Decisions
description: Important architectural decisions and their rationale
type: decisions
---

# Key Decisions

## 1. Code-driven document processing (not LLM-driven)
**Decision:** All document processing (tickets, paystubs) is handled by deterministic TypeScript code, not by the tool-calling LLM.
**Why:** The 4B tool-calling model is too small to reliably parse OCR output, decide workflows, resolve entities, and execute multi-step tool call sequences. It hallucinates dates, grabs wrong amounts, and asks users to provide tool results.
**How:** OCR model extracts → `parseOCROutput()` → `processDocument()` → direct tool handler calls → formatted output. The tool-calling model only handles free-form conversation.

## 2. Multi-entry document analysis
**Decision:** Analyze the entire document and extract ALL entries before making any changes.
**Why:** A single document page can contain multiple tickets, loads, or entries for different jobs. Processing one at a time would miss entries or require multiple image sends.
**How:** OCR instruction tells model to separate entries with `---`. `parseOCROutputMulti()` splits into array. `processDocuments()` presents unified summary, collects all writes into one confirmation.

## 3. UTC storage, Eastern display
**Decision:** Store all times as UTC in the database, display in Eastern Time everywhere.
**Why:** Avoids timezone bugs at date boundaries (e.g., 8pm ET = next day UTC). SQL Server `AT TIME ZONE` handles EST/EDT automatically. Future: make timezone configurable per user profile.
**Migration:** 005 converted legacy NVARCHAR time strings → DATETIME2 UTC.

## 4. Fuzzy entity matching in MCP tools
**Decision:** Entity resolution (companies, dispatchers, drivers, units) uses fuzzy string matching with scored results.
**Why:** OCR output and user input have typos, abbreviations, partial names. Fuzzy matching with `USE_ID:` / `MULTIPLE_MATCHES` / `NO_MATCH` response format lets both the LLM and code-driven pipeline handle results consistently.

## 5. Supervision mode as default
**Decision:** All write operations (create, update, delete, mark-paid) require user confirmation before execution.
**Why:** Small LLMs make mistakes. Users need to verify what the system extracted before it writes to the database. Two separate confirmation maps: `pendingConfirmations` (LLM writes) and `pendingDocConfirmations` (code-driven writes).

## 6. Tool output formatting in MCP layer
**Decision:** Tools return human-readable formatted text (markdown tables, formatted dates/times) instead of raw JSON.
**Why:** The 4B model would dump raw JSON to users. By formatting in the tool layer, the model just passes through the response. Uses `formatJobTable()`, `formatJobDetail()`, `fmtDate()`, `fmtTime()`, `fmtMoney()`.
**Caveat:** `document-processor.ts` Path B calls `client.jobs.list()` directly (not through formatted tool output) because it needs machine-parseable data for amount matching.

## 7. EntityResolver caching for multi-ticket
**Decision:** Cache entity resolution results when processing multiple tickets from one document.
**Why:** Multiple tickets on one page often share the same company, dispatcher, unit, driver. Caching avoids duplicate API calls (e.g., resolving "Birnam Aggregates" once instead of 5 times).

## Future Plans
- Make timezone configurable in user profile settings (currently hardcoded to America/Toronto)
- Telegram integration for image/document processing
