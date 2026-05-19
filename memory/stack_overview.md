---
name: Stack Overview
description: Monorepo structure, packages, and tech stack for the 5Rivers fleet management app
type: architecture
---

# Stack Overview

## Monorepo Structure

```
5rivers.app/
  5rivers.server/        — Express API server (Node/TypeScript)
  5rivers.app.ui/        — React frontend (Vite, TypeScript, Tailwind)
  5rivers.app.agent/     — LLM agent (chat interface, tool orchestration)
  5rivers.app.mcp/       — MCP tool definitions + REST client (shared by agent)
```

## Server (`5rivers.server`)
- **Runtime:** Node.js + Express + TypeScript
- **Database:** SQL Server (Azure SQL / local), accessed via `mssql` package
- **Auth:** JWT-based, org-scoped
- **Key services:** `job.service.ts`, `driverPay.service.ts`, `pdf.service.ts`, `invoice.service.ts`
- **Timezone util:** `src/utils/timezone.ts` — `nowUTC()`, `parseTimeInputToUTC()`, `formatTimeEastern()`
- **Schema:** `scripts/schema.sql` — canonical DDL
- **Migrations:** `scripts/migrations/` — numbered SQL files (001–005+)

## UI (`5rivers.app.ui`)
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Key pages:** `src/pages/jobs/JobsListPage.tsx`, `JobFormPage.tsx`
- **Format lib:** `src/lib/format.ts` — `formatDate()`, `formatTime()`, `extractTimeForInput()`, `formatCurrency()`, `parseTimeMinutesET()`
- **All dates displayed in Eastern Time** (America/Toronto)

## Agent (`5rivers.app.agent`)
- **Entry:** `src/llm.ts` — `processMessage()` is the main entry point
- **Providers:** LM Studio (primary), Ollama, Groq
- **OCR parser:** `src/ocr-parser.ts` — typed extraction from OCR text
- **Doc processor:** `src/document-processor.ts` — code-driven orchestration (no LLM)
- **Conversation:** `src/conversation.ts` — per-user message history
- **CLI:** `npm run cli` for local testing

## MCP (`5rivers.app.mcp`)
- **Tools:** `src/tools.ts` — `ALL_TOOLS` array with handler functions
- **REST client:** `src/rest-client.ts` — typed HTTP client for the server API
- **Formatters:** `fmtDate()`, `fmtTime()`, `fmtMoney()`, `formatJobDetail()`, `formatJobTable()`
- **Fuzzy matching:** `normaliseName()`, `fuzzyScore()`, `fuzzyResolve()`, `formatFuzzyResult()`
- **Key tools:** `list_jobs`, `get_job`, `create_job`, `search_jobs`, `mark_job_paid_by_date`, `list_dispatchers`, `list_companies`, `list_drivers`, `list_units`, `list_job_types`

## Database Entities
- **Jobs** — date, times (DATETIME2 UTC), company, dispatcher, driver, unit, jobType, amount, paid status
- **Companies** — letterhead companies (ticket source)
- **Dispatchers** — trucking companies that dispatch work
- **Drivers** — truck drivers
- **Units** — trucks/equipment
- **JobTypes** — company-specific route/rate templates
- **Invoices, Expenses** — financial records
