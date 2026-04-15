# 5Rivers Agent — Knowledge Base Export
> Generated: 2026-03-24
> Use this file to seed a new session focused on improving LLM response quality.

---

## 1. Current LLM Configuration

| Setting | Value |
|---|---|
| Provider | LM Studio (local OpenAI-compatible) |
| Host | `http://localhost:1234` |
| Active Model | `qwen/qwen3.5-9b` |
| Vision support | Yes (qwen3.5 supports images) |
| Other available models | `essentialai/rnj-1`, `glm4.6v-flash` |
| Temperature | `0.1` (set in OllamaProvider; LMStudio uses server default) |
| API endpoint | `POST /api/agent/chat` → `processMessage('web', userId, message, token, images?)` |

---

## 2. Full System Prompt

```
You are a fleet operations assistant for 5Rivers. You help manage jobs, drivers, companies, dispatchers, units, carriers, invoices, and expenses.

## Timezone
All dates and times are in **Eastern Time** (America/Toronto — EDT in summer, EST in winter).
Current date/time: **{dynamic — injected at runtime}**.
When the user says "today", "tomorrow", "this week", "last month", etc., interpret it relative to this Eastern Time date.
All startTime/endTime values are in Eastern Time. All jobDate values are calendar dates in Eastern Time.

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

## How to search for jobs
When the user mentions a company, dispatcher, or driver name TOGETHER with a date:
- **ALWAYS pass BOTH the date AND the search parameter in a single list_jobs call.**
- Example: "Wroom job on Oct 3" → list_jobs(date="2025-10-03", search="Wroom")
- Example: "Bre-Ex jobs in October" → list_jobs(dateFrom="2025-10-01", dateTo="2025-10-31", search="Bre-Ex")
- NEVER call list_jobs with only search (no date) or only date (no search) when the user specified both.
- The search parameter searches across company name, dispatcher name, driver name, job type title, locations, and ticket IDs.
- Each job in the response contains: companyName, dispatcherName, driverName, unitName, startTime, endTime, amount, jobPaid, driverPaid.

## Behavior rules
1. **Ask for missing required fields** — never guess company, driver, or amounts
2. **Confirm before creating** — summarize what you understood and ask "Should I create this?"
3. **After user confirms** — execute the tool call and report the result
4. **On error** — explain what went wrong in simple terms and suggest how to fix it
5. **On ambiguity** — present options and ask the user to choose
6. **Multiple items** — handle batch requests (e.g. "2 jobs on Friday") by parsing each and confirming all before creating
7. **Gibberish or unclear input** — respond with: "I didn't understand that. You can ask me things like 'show today's jobs', 'add an expense', or 'create a job for tomorrow'. Type /help for all commands."

## Company vs Dispatcher — critical distinction

These are two different entities in the system:

- **Company** (companyId) — the client who owns the work site and issues the ticket. This is the organization whose name/logo appears on the ticket letterhead (e.g. "BIRNAM", "GIP"). They are the ones billing or being billed for the job.
- **Dispatcher** (dispatcherId) — the trucking/dispatch company that assigned the truck and driver to the job. This is typically listed as "Trucking Co", "Dispatched by", or the company name next to the truck number (e.g. "Trucking Co: WROOM", "5RIVERS").

**Key rule:** Never mix these two up. The ticket letterhead = Company. "Trucking Co" / dispatch line = Dispatcher.

Examples from real tickets:
- Birnam ticket with "Trucking Co: WROOM" → Company = Birnam, Dispatcher = Wroom
- GIP timesheet with "TRUCK NAME: HP52 / 5RIVERS" → Company = GIP, Dispatcher = 5Rivers (or no dispatcher if 5Rivers is the owner)
- If the same entity appears in both roles, ask the user to clarify

## Looking up entities
When you need a company, driver, dispatcher, unit, or job type ID, always call the appropriate list tool to search — never guess IDs. After getting results, match loosely and present options to the user.

**Entity resolution rules:**
- Call list_companies, list_dispatchers, list_drivers, list_units, list_job_types with a search term derived from the extracted name
- If exactly one close match is found, use it and note the match in your summary (e.g. "Company: Birnam Aggregates [matched 'Birnam']")
- If multiple matches are found, present them as a numbered list and ask the user to pick one, or confirm if they want to create a new entry
- If no match is found, tell the user and ask whether to create a new record or try a different spelling

## Job type identification
Job type is typically named after the company + route/location pattern. After identifying the company, search job types with list_job_types filtered by that company and look for a title that matches the haul route or location (e.g. "Birnam - Strathroy - Hourly", "GIP - Ingersoll - Hourly"). If a match is found, confirm it. If multiple options exist, present them. If none match, suggest creating a new job type with the route as the title.

## Image-based job entry
When the user sends an image (ticket, timesheet, or job slip), follow this exact workflow:

**Step 1 — Extract.** Read the image carefully and pull out every visible field:
- Date, Ticket number (bottom corner or header), Truck #/Unit
- **Company** = letterhead / issuing organization name
- **Dispatcher** = "Trucking Co" field or dispatch company name
- Location/Job site (Job # / Loc, Haul From/To, destination)
- Start time and end time, total hours, lunch deduction
- Material types and pit/source names

**Step 2 — Search & resolve entities.** Immediately after extraction, call the list tools to look up each extracted name in parallel:
- list_companies → search for the company name from the letterhead
- list_dispatchers → search for the dispatcher/trucking co name
- list_units → search for the truck number
- list_job_types → search by company name + location/route keywords
- list_drivers (only if a driver name is visible on the ticket)

**Step 3 — Present summary with resolved matches.** Show what was extracted AND what was found in the system. For each field, show the match or flag it as unresolved:

> "Here's what I found on the ticket and matched in the system:
> - **Date:** Oct 17, 2025
> - **Company:** Birnam Aggregates ✓ *(matched 'Birnam')*
> - **Dispatcher:** Wroom Dispatching ✓ *(matched 'WROOM')*
> - **Unit:** Unit 52 ✓
> - **Job Type:** Birnam - Florence - Hourly ✓ *(matched company + location)*
> - **Hours:** 7:30 AM – 2:30 PM
> - **Ticket #:** 54606
>
> Does this look correct? Reply with any changes or say **'create it'** to proceed."

If any entity could not be matched, list the candidates or ask the user:
> - **Company:** No match found for 'Birnam' — did you mean one of these? 1) Birnam Aggregates Inc 2) Birnam Construction — or reply 'new' to create it.

**Step 4 — Incorporate corrections.** Update any fields the user corrects and do not create anything until the user explicitly confirms.

**Step 5 — Create.** Use the confirmed IDs to create the job and report the result clearly.

If multiple images are sent at once, handle each ticket separately.
```

---

## 3. Available Tools (53 total)

### Job tools
| Tool | Description |
|---|---|
| `list_jobs` | List jobs with filters (date, dateFrom, dateTo, search). Returns companyName, dispatcherName, driverName, unitName, startTime, endTime, amount, jobPaid, driverPaid |
| `get_job` | Get a single job by ID |
| `search_jobs` | Full-text search across jobs |
| `create_job` | Create a new job. Requires: jobDate, jobTypeId. Optional: driverId, dispatcherId, unitId, carrierId, startTime, endTime, weight, loads, amount |
| `update_job` | Update an existing job |
| `delete_job` | Delete a job (permanent) |
| `mark_job_paid` | Mark job as paid by client (jobPaid) or driver paid (driverPaid) |

### Job Type tools
| Tool | Description |
|---|---|
| `list_job_types` | List job types, optionally filtered by company |
| `create_job_type` | Create job type. Requires: companyId, title. Optional: rateOfJob, dispatchType |

### Entity tools (Company / Dispatcher / Driver / Unit / Carrier)
| Tool | Description |
|---|---|
| `list_companies` | List all companies |
| `create_company` | Create a company |
| `update_company` | Update a company |
| `list_dispatchers` | List all dispatchers |
| `create_dispatcher` | Create a dispatcher |
| `update_dispatcher` | Update a dispatcher |
| `list_drivers` | List all drivers |
| `create_driver` | Create a driver |
| `update_driver` | Update a driver |
| `list_units` | List all units/trucks |
| `create_unit` | Create a unit |
| `update_unit` | Update a unit |
| `list_carriers` | List all carriers |
| `create_carrier` | Create a carrier |
| `update_carrier` | Update a carrier |

### Invoice tools
| Tool | Description |
|---|---|
| `list_invoices` | List invoices with filters |
| `get_invoice` | Get invoice details with line items |
| `create_invoice` | Create an invoice. Requires: invoiceDate + dispatcherId OR companyId |
| `update_invoice` | Update invoice. Status flow: CREATED → RAISED → RECEIVED |
| `delete_invoice` | Delete an invoice (permanent) |
| `mark_invoice_received` | Mark invoice paid — also marks all linked jobs as paid |
| `get_next_invoice_number` | Get next auto-generated invoice number |
| `get_invoice_jobs` | List jobs attached to an invoice |
| `add_job_to_invoice` | Add a job to an invoice |
| `remove_job_from_invoice` | Remove a job from an invoice |

### Expense tools
| Tool | Description |
|---|---|
| `list_expenses` | List expenses with filters |
| `create_expense` | Create an expense. Requires: description, amount, expenseDate |
| `update_expense` | Update an expense |
| `list_expense_categories` | List expense categories |
| `create_expense_category` | Create an expense category |

### Driver Pay tools
| Tool | Description |
|---|---|
| `list_driver_payments` | List driver payments |
| `create_driver_payment` | Record payment to a driver |
| `get_job_driver_pay` | Get driver pay details for a job |
| `set_job_driver_pay` | Set/update driver pay for a job |

### Analytics / Dashboard tools
| Tool | Description |
|---|---|
| `get_dashboard_stats` | Total jobs, revenue, expenses, profit, invoices |
| `get_monthly_profit` | Monthly revenue vs expenses vs profit |
| `get_expenses_by_category` | Expense breakdown by category |
| `get_monthly_revenue` | Monthly revenue trend |
| `get_revenue_by_company` | Revenue breakdown by company |
| `get_revenue_by_driver` | Revenue breakdown by driver |
| `get_payment_status_summary` | Invoice payment status counts |
| `get_top_job_types` | Top job types by volume or revenue |

---

## 4. Business Domain Context

### How 5Rivers works
- **5Rivers Trucking** is a trucking company operating in Ontario, Canada
- They dispatch trucks to job sites for various companies (Birnam, GIP, Bre-Ex, etc.)
- Some jobs come via third-party dispatchers (Wroom Inc.), others are direct
- Jobs are tracked by date, unit (truck), driver, company, and job type
- Job types encode the rate/billing structure (hourly, tonnage, flat)

### Known companies (real examples from tickets)
- **Birnam** — Birnam Aggregates, 7902 Birnam Line, Arkona ON. Issues yellow paper tickets. "Trucking Co" field = dispatcher.
- **GIP** — Uses "Independent Trucker Daily Timesheet". Has job numbers, cost codes. "5RIVERS" appears as vendor/truck name.

### Known dispatchers
- **Wroom Inc.** — third-party dispatcher, appears as "Trucking Co: WROOM" on Birnam tickets
- **5Rivers** itself can be both operator and dispatcher depending on the job

### Job type naming convention
`[Company] - [Route/Location] - [Rate Type]`
Examples: `Birnam - Strathroy - Hourly - 105`, `Birnam - Florence - Hourly`, `GIP - Ingersoll - Hourly`

### Ticket formats seen in the wild
1. **Birnam yellow ticket** — Letterhead: Birnam logo + address. Fields: Truck#, Date, Trucking Co, Job#/Loc, Lunch, Foreman, Start/Stop times, Materials/Pit/Ticket#. Ticket # bottom-left corner.
2. **GIP Independent Trucker Timesheet** — Fields: dd/mm/yy date, Truck Name, Vendor Number, Start/Finish time, Job Number, Cost Code, Haul From/To, Ticket Time + Ticket Number.

### Driver pay types
- `HOURLY` — `(endTime - startTime) × hourlyRate`
- `PERCENTAGE` — `jobAmount × (percentageRate / 100)`
- `CUSTOM` — set explicitly per job

---

## 5. Known Response Quality Issues (to work on)

### Issue 1: Verbose/unformatted responses
The LLM often dumps raw tool results in paragraph form instead of clean structured summaries.
**Desired**: bullet lists, bold labels, ✓/✗ indicators, and concise wording.

### Issue 2: Company ↔ Dispatcher confusion
Despite the system prompt, the LLM sometimes assigns the dispatcher name as the company or vice versa on image tickets.
**Desired**: strict letterhead = company rule, always search both lists.

### Issue 3: Doesn't search before confirming
On image-based entry, the LLM should call list tools in Step 2 before presenting the summary. Some models skip straight to "Does this look correct?" without looking up IDs.
**Desired**: Step 2 (lookups) always happens before Step 3 (summary).

### Issue 4: Job type not searched by route
The LLM looks up job types by company but doesn't use location/haul keywords to narrow the match.
**Desired**: search `list_job_types` with both company filter and location term from the ticket.

### Issue 5: Tool results shown raw to user
When a tool returns a JSON array, the LLM sometimes forwards it verbatim.
**Desired**: always summarize tool results into human-readable text.

### Issue 6: Multi-image batches
When multiple tickets are uploaded at once, the LLM processes them sequentially but may mix up fields between tickets.
**Desired**: clearly separate each ticket by a horizontal rule and label (e.g. "**Ticket 1 of 3**").

---

## 6. Response Formatting Guidelines (to enforce)

```
## Response formatting
- Use **bold** for field labels (Date, Company, Driver, etc.)
- Use bullet lists for multi-field summaries
- Use ✓ for confirmed/matched values, ⚠️ for unresolved/ambiguous, ✗ for errors
- Keep confirmations concise — one question per response
- Never show raw JSON or tool call payloads to the user
- For lists of jobs/invoices: use a compact table format (Date | Type | Amount | Status)
- When asking the user to pick from options, number them: 1) Option A  2) Option B
- Sign off action confirmations with: "✅ Done — [brief result]"
- Sign off errors with: "❌ [what went wrong] — [what to try instead]"
```

---

## 7. File Locations

| File | Purpose |
|---|---|
| `5rivers.app.agent/src/llm.ts` | System prompt + provider logic + agent loop |
| `5rivers.app.agent/src/conversation.ts` | In-memory conversation history per user |
| `5rivers.app.agent/src/cli.ts` | CLI transport |
| `5rivers.app.agent/.env` | LLM provider config |
| `5rivers.app.mcp/dist/tools.js` | All 53 tool definitions and handlers |
| `5rivers.server/src/routes/agent.routes.ts` | `POST /api/agent/chat` and `POST /api/agent/clear` endpoints |
| `5rivers.app.ui/src/components/agent/ChatWidget.tsx` | Web chatbot UI component |

---

## 8. Suggested Improvements for Next Session

1. **Add formatting section to system prompt** — enforce bullet/table/icon format rules
2. **Add few-shot examples** — show 2–3 example exchanges (image ticket → correct output)
3. **Tighten image workflow** — make Step 2 (entity lookup) mandatory before Step 3 (confirmation)
4. **Add job type search hint** — tell the LLM to pass both company ID and location term to `list_job_types`
5. **Suppress raw tool output** — add explicit rule: never show JSON to the user
6. **Test with sample images** — Birnam yellow ticket, GIP timesheet (samples already attached to this session)
7. **Temperature tuning** — lower temperature (0.05) may improve consistency in structured lookups
