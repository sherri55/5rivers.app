# Clean associations: how things should be linked

**Goal:** One clear way to link Job ↔ Invoice and Dispatcher ↔ Invoice, and simple rules for **invoice status** and **job status**.

---

## 1. Core idea

- **An invoice has a group of jobs.**  
  So: one Invoice, many Jobs. Each job can be on at most one invoice (for a given period/scope you define).
- **An invoice belongs to a dispatcher.**  
  So: one Dispatcher, many Invoices. One Invoice → one Dispatcher.
- **Status:**  
  - **Invoice** has its own status (CREATED, RAISED, RECEIVED).  
  - **Job** invoice status is **always derived**: from “is this job on an invoice?” and that invoice’s status (never stored on the job).

---

## 2. Clean links (associations)

### 2.1 Job – Invoice (invoice has a group of jobs)

**Single relationship:**

| Relationship   | Direction   | Meaning |
|----------------|------------|--------|
| **ON_INVOICE** | Job → Invoice | This job is a line item on this invoice. |

- **Direction:** Job points to Invoice. So “invoice has a group of jobs” = all jobs that point to that invoice: `(i:Invoice)<-[:ON_INVOICE]-(j:Job)`.
- **Relationship properties (on ON_INVOICE):**
  - **amount** (Float) – amount billed for this job on this invoice.
  - **addedAt** (DateTime or String) – when the job was added to the invoice.

**Why one name (ON_INVOICE):**  
One relationship type for “job is on this invoice.” Use it for both:
- “Which invoice is this job on?” → follow the job’s outgoing ON_INVOICE.
- “Which jobs are on this invoice?” → follow the invoice’s incoming ON_INVOICE.

No second relationship (e.g. HAS_INVOICE or INVOICED_IN). Migrate existing INVOICED_IN / HAS_INVOICE to ON_INVOICE.

---

### 2.2 Dispatcher – Invoice (invoice belongs to a dispatcher)

**Single relationship:**

| Relationship  | Direction    | Meaning |
|---------------|-------------|--------|
| **FOR_DISPATCHER** | Invoice → Dispatcher | This invoice is for / owned by this dispatcher. |

- **Direction:** Invoice points to Dispatcher. So “dispatcher’s invoices” = all invoices that point to that dispatcher: `(d:Dispatcher)<-[:FOR_DISPATCHER]-(i:Invoice)`.
- **Relationship properties:** None needed unless you add things like “role” or “commission tier” later.

**Naming:** FOR_DISPATCHER reads clearly: “invoice is for dispatcher.” You could also use **BILLED_BY** (Invoice → Dispatcher) if you prefer that wording; keep only one.

---

### 2.3 Job – Dispatcher (who managed the job)

Keep as today:

| Relationship  | Direction   | Meaning |
|---------------|------------|--------|
| **MANAGED_BY** | Job → Dispatcher | This job was managed by this dispatcher. |

So: Job → Dispatcher (job points to dispatcher). Independent of invoice: a job can be managed by a dispatcher before it’s on any invoice.

---

## 3. Status: invoice and job

Use these four statuses for both **invoice status** and **job invoice status** (job status is derived from the invoice it’s on, or PENDING if not on any invoice).

### 3.1 Status values (single set for the system)

| Status     | Meaning |
|-----------|--------|
| **PENDING**  | Not in invoice. Job is not on any invoice yet. |
| **CREATED**  | Invoice created but not shared with client. Job is on an invoice that exists internally only. |
| **RAISED**   | Invoice created and shared with client. Job is on an invoice that has been sent to the client. |
| **RECEIVED** | Invoice shared and amount received. Job is on an invoice for which payment has been received. |

Flow: **PENDING** → **CREATED** → **RAISED** → **RECEIVED**.

---

### 3.2 Invoice status (on the Invoice node)

Store on **Invoice** only. Values: **CREATED** | **RAISED** | **RECEIVED** (invoices that exist are never “PENDING”; PENDING is only for jobs not on any invoice).

| Invoice.status | Meaning |
|----------------|--------|
| **CREATED**  | Invoice created but not shared with client. |
| **RAISED**   | Invoice shared with client. |
| **RECEIVED** | Amount received for this invoice. |

Single source of truth: **Invoice.status**.

---

### 3.3 Job “invoice status” (always derived)

**Job’s invoice status is never stored on the job.** It is always derived:

- If the job has **no** `(j:Job)-[:ON_INVOICE]->(i:Invoice)` → **PENDING** (not in invoice).
- If the job has `(j:Job)-[:ON_INVOICE]->(i:Invoice)` → use that invoice’s **Invoice.status**: **CREATED**, **RAISED**, or **RECEIVED**.

So job status = **PENDING** | **CREATED** | **RAISED** | **RECEIVED**. For jobs on an invoice, it always equals the invoice’s status. Single source of truth: Invoice.status and presence/absence of ON_INVOICE.

---

### 3.4 Jobs that do not have an invoice (PENDING)

**Definition:** A job with **no** `ON_INVOICE` relationship has status **PENDING** – not in invoice.

- **In the graph:** The job has all its usual links (OF_TYPE, ASSIGNED_TO, MANAGED_BY, USES_UNIT, etc.) but **no** `(j:Job)-[:ON_INVOICE]->(i:Invoice)`.
- **Queries:**
  - All jobs not in any invoice (PENDING):  
    `MATCH (j:Job) WHERE NOT (j)-[:ON_INVOICE]->(:Invoice) RETURN j`
  - PENDING jobs for a dispatcher:  
    `MATCH (j:Job)-[:MANAGED_BY]->(d:Dispatcher {id: $dispatcherId}) WHERE NOT (j)-[:ON_INVOICE]->(:Invoice) RETURN j`
  - PENDING jobs in a date range:  
    `MATCH (j:Job) WHERE j.jobDate >= $from AND j.jobDate <= $to AND NOT (j)-[:ON_INVOICE]->(:Invoice) RETURN j`

When you create an invoice, you create an Invoice node (status **CREATED**), link it to the dispatcher with FOR_DISPATCHER, and create **ON_INVOICE** from each selected job to that invoice. Those jobs move from **PENDING** to **CREATED**. When you mark the invoice as shared with the client, set Invoice.status to **RAISED** (jobs on it become RAISED). When payment is received, set Invoice.status to **RECEIVED** (jobs on it become RECEIVED).

---

## 4. Full list of associations (simplified)

| From   | Relationship   | To        | Properties on relationship | Notes |
|--------|----------------|-----------|-----------------------------|--------|
| Company | HAS_JOB_TYPE  | JobType   | —                           | Company owns job types. |
| Job     | OF_TYPE       | JobType   | —                           | Job type (e.g. haul, hourly). |
| Job     | ASSIGNED_TO   | Driver    | —                           | Driver who did the job. |
| Job     | MANAGED_BY    | Dispatcher| —                           | Dispatcher who managed the job. |
| Job     | USES_UNIT     | Unit      | —                           | Unit (truck) used. |
| **Job** | **ON_INVOICE**| **Invoice** | **amount**, **addedAt**   | **Job is a line on this invoice.** |
| **Invoice** | **FOR_DISPATCHER** | **Dispatcher** | —       | **Invoice belongs to this dispatcher.** |
| Invoice | (none to Job)  | —         | —                           | Jobs link to invoice via ON_INVOICE. |
| Driver  | HAS_RATE      | DriverRate| —                           | Driver-specific rates. |
| JobType | RATE_FOR      | DriverRate| —                           | Links DriverRate to job type. |
| Job     | HAS_IMAGE     | StoredImage | —                         | Job attachments. |

So:

- **Job – Invoice:** one link, **ON_INVOICE** (Job → Invoice), with **amount** and **addedAt**.
- **Dispatcher – Invoice:** one link, **FOR_DISPATCHER** (Invoice → Dispatcher).
- **Status (four values):** **PENDING** (not in invoice) | **CREATED** (invoice created, not shared) | **RAISED** (invoice shared with client) | **RECEIVED** (amount received). Invoice stores CREATED | RAISED | RECEIVED; job status is PENDING if no ON_INVOICE, otherwise the invoice’s status.

---

## 5. Cypher quick reference

```text
# Invoice has a group of jobs (with line amount and when added)
(i:Invoice)<-[:ON_INVOICE {amount, addedAt}]-(j:Job)

# Which invoice is this job on?
(j:Job)-[:ON_INVOICE]->(i:Invoice)

# Jobs that do NOT have an invoice raised (uninvoiced / PENDING)
MATCH (j:Job) WHERE NOT (j)-[:ON_INVOICE]->(:Invoice) RETURN j

# Invoice is for which dispatcher?
(i:Invoice)-[:FOR_DISPATCHER]->(d:Dispatcher)

# All invoices for a dispatcher
(d:Dispatcher)<-[:FOR_DISPATCHER]-(i:Invoice)
```

---

## 6. Migration from current model

| Current | Target |
|--------|--------|
| INVOICED_IN (Job→Invoice), amount, createdAt | **ON_INVOICE** (Job→Invoice), **amount**, **addedAt** |
| HAS_INVOICE (Job→Invoice) | Remove; treat as same as ON_INVOICE (migrate then drop). |
| BILLED_BY (Invoice→Dispatcher) | **FOR_DISPATCHER** (Invoice→Dispatcher) — or keep BILLED_BY and use it as the only Dispatcher–Invoice link. |

Use one relationship name for Job–Invoice (**ON_INVOICE**) and one for Dispatcher–Invoice (**FOR_DISPATCHER** or **BILLED_BY**). Job invoice status is **always derived** from Invoice.status and the presence of ON_INVOICE (never stored on Job).

---

## 7. Driver pay (foolproof rules)

Driver pay for a job depends on a **pay type** (per job type and/or driver). Two types: **PERCENTAGE** and **PER_HOUR**.

**Definitions:**

- **Job amount (before HST)** = gross job amount from rate × hours/loads/tonnage (or fixed), i.e. the amount **before** adding HST. Use this as the base for percentage.
- **Job hours** = calculated from job’s startTime and endTime (only meaningful when job type is Hourly).

---

### 7.1 Pay type: PERCENTAGE

- **Rule:** Driver pay = **(job amount before HST)** × **(driver percentage rate / 100)**.
- Always use job amount **before** HST (subtotal), not after tax.
- Example: job amount before HST = $1,000, driver rate = 25% → driver pay = $250.

---

### 7.2 Pay type: PER_HOUR

- **If job type is Hourly (dispatchType = Hourly):**  
  Driver pay = **driver hourly rate** × **job hours**  
  (job hours from startTime/endTime).
- **If job type is not Hourly** (Load, Tonnage, Fixed):  
  Driver pay = **driver hourly rate** × **(job amount before HST / driver hourly rate)** = **job amount before HST**.  
  So for non-hourly jobs, per-hour pay gives the driver the full job amount (before HST).  
  (Equivalently: treat “equivalent hours” = job amount before HST ÷ hourly rate, then pay = hourly rate × equivalent hours.)

**Summary:**

| Pay type   | Job type is Hourly        | Job type is not Hourly (Load, Tonnage, Fixed) |
|------------|---------------------------|------------------------------------------------|
| **PERCENTAGE** | (job amount before HST) × (rate% / 100) | Same. |
| **PER_HOUR**   | hourly rate × job hours   | job amount before HST (full amount).          |

---

### 7.3 Where pay type and rates live

- **DriverRate** (or equivalent) links Driver and JobType and should store:
  - **payType:** PERCENTAGE | PER_HOUR
  - **percentageRate** (when payType = PERCENTAGE), and/or
  - **hourlyRate** (when payType = PER_HOUR or as fallback)
- For a given job, resolve the driver (ASSIGNED_TO) and job type (OF_TYPE), then look up the applicable rate and payType and apply the rules above. If no DriverRate exists for that driver+jobType, define a fallback (e.g. 0 or use driver’s default hourly rate with PER_HOUR).
