# Current Neo4j Relationships – Reference List

Use this as the base list. You can add more relationships or attributes on top.

---

## 1. All relationships (current codebase)

| # | Relationship type | From → To | Direction (Cypher) | Relationship properties | Created by | Read by |
|---|-------------------|-----------|--------------------|--------------------------|------------|---------|
| 1 | **HAS_JOB_TYPE** | Company → JobType | `(c:Company)-[:HAS_JOB_TYPE]->(jt:JobType)` | — | createJobType, updateJobType, migrations | Company.jobTypes, JobType.company, jobs filter (companyId), dashboard topCompanies |
| 2 | **OF_TYPE** | Job → JobType | `(j:Job)-[:OF_TYPE]->(jt:JobType)` | — | createJob, updateJob | Job.jobType, jobs list, calculations |
| 3 | **ASSIGNED_TO** | Job → Driver | `(j:Job)-[:ASSIGNED_TO]->(d:Driver)` | — | createJob, updateJob, assignJobToDriver | Job.driver, Driver.jobs |
| 4 | **MANAGED_BY** | Job → Dispatcher | `(j:Job)-[:MANAGED_BY]->(d:Dispatcher)` | — | createJob, updateJob, assignJobToDispatcher | Job.dispatcher, Dispatcher.jobs |
| 5 | **USES_UNIT** | Job → Unit | `(j:Job)-[:USES_UNIT]->(u:Unit)` | — | createJob, updateJob, assignJobToUnit | Job.unit, Unit.jobs |
| 6 | **INVOICED_IN** | Job → Invoice | `(j:Job)-[:INVOICED_IN]->(i:Invoice)` | **amount**, **createdAt** (string) | createInvoice, updateInvoice (main app) | Invoice.jobs (returns job + amount + invoicedAt), PDF, calculations, validation |
| 7 | **HAS_INVOICE** | Job → Invoice | `(j:Job)-[:HAS_INVOICE]->(i:Invoice)` | **amount**, **invoicedAt** (in old migration) | Only old migration (migrate-job-invoice-relationships) | **Job.invoice** resolver only; app never creates it |
| 8 | **BILLED_BY** | Invoice → Dispatcher | `(i:Invoice)-[:BILLED_BY]->(d:Dispatcher)` | — | createInvoice, updateInvoice | Invoice.dispatcher, Dispatcher.invoices |
| 9 | **HAS_RATE** | Driver → DriverRate | `(d:Driver)-[:HAS_RATE]->(dr:DriverRate)` | — | (DriverRate creation in resolvers) | Driver.driverRates |
| 10 | **RATE_FOR** | JobType → DriverRate | `(jt:JobType)-[:RATE_FOR]->(dr:DriverRate)` | — | (DriverRate creation) | JobType.driverRates |
| 11 | **HAS_IMAGE** | Job → StoredImage | `(j:Job)-[:HAS_IMAGE]->(s:StoredImage)` | — | imageStorageService (link after upload), migrate-images | Image display, validation script |

---

## 2. Invoice-related relationships (detail)

These are the ones that touch **Invoice** and often have **attributes** on the relationship. Use this section to extend or add new attributes.

### 2.1 Job ↔ Invoice (job is included on an invoice)

| Relationship | Direction | Meaning | Relationship properties | Where created | Where read |
|--------------|-----------|--------|---------------------------|---------------|------------|
| **INVOICED_IN** | Job → Invoice | “This job is line-item on this invoice.” | **amount** (Float) – amount billed for this job on this invoice<br>**createdAt** (String, e.g. `toString(datetime())`) | createInvoice, updateInvoice | Invoice.jobs (GraphQL: JobInvoiceRelation with job, amount, invoicedAt), PDF, calculationService, jobAmountValidationService |
| **HAS_INVOICE** | Job → Invoice | Same meaning (legacy). “This job has this invoice.” | **amount**, **invoicedAt** (in SQLite migration script) | Only `migrate-job-invoice-relationships.ts` | **Job.invoice** resolver only (so “which invoice is this job on?”). Main app does **not** create HAS_INVOICE. |

**Current confusion:** The app creates only **INVOICED_IN**. The resolver for **Job.invoice** looks for **HAS_INVOICE**. So in an app-only DB, `job.invoice` is always null unless you ran the old migration that created HAS_INVOICE.

**Recommendation (for new solution):** Use **one** relationship for “job on invoice”: e.g. keep **INVOICED_IN** with attributes **amount**, **invoicedAt** (and any you add). Have both “invoice’s jobs” and “job’s invoice” read/write this same relationship.

### 2.2 Invoice → Dispatcher (who the invoice is billed by)

| Relationship | Direction | Meaning | Relationship properties | Where created | Where read |
|--------------|-----------|--------|---------------------------|---------------|------------|
| **BILLED_BY** | Invoice → Dispatcher | “This invoice is billed by this dispatcher.” | — | createInvoice, updateInvoice | Invoice.dispatcher, calculationService (commission), PDF |

---

## 3. Relationship attributes (for your extensions)

If you want to add more attributes, here’s what exists today so you can extend consistently.

### INVOICED_IN (Job → Invoice)

| Attribute   | Type   | Set when | Used for |
|------------|--------|----------|----------|
| **amount** | Float  | createInvoice / updateInvoice (from job’s calculatedAmount) | Line amount for this job on this invoice; Invoice.jobs, PDF, totals |
| **createdAt** | String | createInvoice / updateInvoice (`toString(datetime())`) | Displayed as **invoicedAt** in GraphQL JobInvoiceRelation |

You could add e.g.: **currency**, **taxAmount**, **discount**, **lineNumber**, **description**, **quantity**, **unitPrice**, etc.

### HAS_INVOICE (Job → Invoice) – legacy

| Attribute   | Type   | Set when | Used for |
|------------|--------|----------|----------|
| **amount** | Float  | Old migration (from SQLite InvoiceLine) | Same as INVOICED_IN.amount |
| **invoicedAt** | DateTime | Old migration | Same as INVOICED_IN.createdAt |

---

## 4. Relationships that are used in code but never created (inconsistencies)

| Relationship | Direction (as used in MATCH) | Used in | Created by |
|--------------|------------------------------|--------|------------|
| **BELONGS_TO** | JobType → Company | jobs filter (companyId), dashboard recentJobs | Nothing in main app (only HAS_JOB_TYPE exists) |
| **DISPATCHED** | Dispatcher → Job | dashboardStats (dispatcher count) | Nothing |
| **DROVE** | Driver → Job | dashboardStats (driver count) | Nothing |

So “current relationships” that are **actually created** by the app are the 11 in the first table; INVOICED_IN is the only Invoice–Job relationship the app creates, and it carries **amount** and **createdAt**. You can build your improved structure (and any new attributes) on top of this list.
