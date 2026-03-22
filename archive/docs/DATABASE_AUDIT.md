# Neo4j Database Structure Audit

**Purpose:** Audit of the current 5rivers.app Neo4j schema for the new solution (approach 3: clean codebase from scratch). Use this to fix inconsistencies, add optimizations, and migrate one module at a time from database → backend → frontend.

**Sources:** `5rivers.app.backend` (schema, resolvers, services, scripts).

---

## 1. Current Graph Model Summary

### 1.1 Node Labels & Properties

| Label        | Key properties | Notes |
|-------------|----------------|--------|
| **Company** | id, name, description, website, industry, location, size, founded, logo, email, phone, createdAt, updatedAt | id is UUID; createdAt/updatedAt stored as Neo4j datetime or string. |
| **Driver**  | id, name, description, email, phone, hourlyRate, createdAt, updatedAt | |
| **Dispatcher** | id, name, description, email, phone, commissionPercent, createdAt, updatedAt | |
| **Unit**    | id, name, description, color, plateNumber, vin, createdAt, updatedAt | |
| **JobType** | id, title, startLocation, endLocation, dispatchType, rateOfJob, createdAt, updatedAt | dispatchType: Hourly, Load, Tonnage, Fixed. |
| **Job**     | id, jobDate, invoiceStatus, weight, loads, startTime, endTime, amount, ticketIds, driverPaid, imageUrls, images, createdAt, updatedAt, calculatedAmount (sometimes stored) | jobDate as string (YYYY-MM-DD); weight can be array; ticketIds string or array; images array of StoredImage ids. |
| **Invoice** | id, invoiceNumber, invoiceDate, status, billedTo, billedEmail, createdAt, updatedAt | |
| **DriverRate** | id, hourlyRate, percentageRate, createdAt, updatedAt | Links Driver ↔ JobType (per-driver, per-job-type rates). |
| **StoredImage** | id, mimeType, data (base64), originalName, createdAt | Images stored in graph; Job links via HAS_IMAGE. |

### 1.2 Relationship Types (As Actually Used)

| Relationship   | From → To    | Direction in CREATE/MERGE | Properties | Used by |
|----------------|-------------|----------------------------|------------|---------|
| **HAS_JOB_TYPE** | Company → JobType | (c)-[:HAS_JOB_TYPE]->(jt) | — | Company.jobTypes, JobType.company, jobs filter by companyId |
| **OF_TYPE**    | Job → JobType | (j)-[:OF_TYPE]->(jt) | — | Job.jobType, jobs by jobTypeId |
| **ASSIGNED_TO** | Job → Driver | (j)-[:ASSIGNED_TO]->(d) | — | Job.driver, Driver.jobs |
| **MANAGED_BY** | Job → Dispatcher | (j)-[:MANAGED_BY]->(d) | — | Job.dispatcher, Dispatcher.jobs |
| **USES_UNIT**  | Job → Unit   | (j)-[:USES_UNIT]->(u) | — | Job.unit, Unit.jobs |
| **INVOICED_IN** | Job → Invoice | (j)-[:INVOICED_IN]->(i) | amount, createdAt | createInvoice, updateInvoice, Invoice.jobs |
| **HAS_INVOICE** | Job → Invoice | (j)-[:HAS_INVOICE]->(i) | amount, invoicedAt (in migration) | **Only** Job.invoice resolver; **not** created by current app |
| **BILLED_BY**  | Invoice → Dispatcher | (i)-[:BILLED_BY]->(d) | — | Invoice.dispatcher |
| **HAS_RATE**   | Driver → DriverRate | (d)-[:HAS_RATE]->(dr) | — | Driver.driverRates |
| **RATE_FOR**   | JobType → DriverRate | (jt)-[:RATE_FOR]->(dr) | — | JobType.driverRates |
| **HAS_IMAGE**  | Job → StoredImage | (j)-[:HAS_IMAGE]->(s) | — | imageStorageService (link after upload) |

**Inconsistencies found:**

- **BELONGS_TO (JobType → Company):** Used in resolvers (jobs filter by companyId, dashboard recentJobs) as `(jt)-[:BELONGS_TO]->(c:Company)`. **Never created** by createCompany/createJobType or migrations; only **HAS_JOB_TYPE** (Company → JobType) is created. So company-scoped job queries that use BELONGS_TO may return no results. **Fix:** Use `(jt)<-[:HAS_JOB_TYPE]-(c:Company)` everywhere instead of BELONGS_TO.
- **HAS_INVOICE vs INVOICED_IN:** createInvoice/updateInvoice only create **INVOICED_IN** (Job→Invoice with amount, createdAt). **Job.invoice** resolver reads **HAS_INVOICE**. So in an app-only DB, `job.invoice` is always null. Old SQLite migration created HAS_INVOICE. **Fix:** Use a single relationship: **INVOICED_IN** only; change Job.invoice to query INVOICED_IN.
- **DISPATCHED / DROVE:** dashboardStats uses `(d)-[:DISPATCHED]->(j:Job)` and `(dr)-[:DROVE]->(j:Job)`. The rest of the app uses **MANAGED_BY** (Job→Dispatcher) and **ASSIGNED_TO** (Job→Driver). DISPATCHED/DROVE are never created. **Fix:** Use `(d)<-[:MANAGED_BY]-(j:Job)` and `(dr)<-[:ASSIGNED_TO]-(j:Job)` in dashboard queries.

---

## 2. Indexes (Current)

**Location:** `backend/src/database/ensureIndexes.ts` + `companyService.createIndexes()`.

| Label        | Indexed property(ies) |
|-------------|------------------------|
| Company     | id, name, industry, location |
| Job         | id, jobDate, invoiceStatus |
| Invoice     | id, invoiceNumber |
| Driver      | id |
| Dispatcher  | id |
| Unit        | id |
| JobType     | id |
| StoredImage | id |

**Gaps:**

- No composite indexes for common filters (e.g. Job by jobDate + invoiceStatus).
- No index on **Invoice.invoiceDate** (dashboard and reports filter by date).
- No index on **Job.driverPaid** if filtered often.
- Company: `ensureIndexes` and `companyService` both create same Company indexes (idempotent but redundant).

---

## 3. Query & Performance Issues

### 3.1 N+1 and List Load Cost

- **jobs list:** Root `jobs` query returns a page of Job nodes (with SKIP/LIMIT). Then for **each** job, GraphQL resolvers run:
  - Job.jobType → 1 query per job
  - Job.driver → 1 query per job
  - Job.dispatcher → 1 query per job
  - Job.unit → 1 query per job
  - Job.invoice → 1 query per job
  - Job.calculatedAmount → 1 CalculationService call (Neo4j) per job
  - Job.calculatedHours → in-memory from parent
  - Job.driverPay → 1 CalculationService call per job  
  So for a page of 50 jobs: **1 + 1 (count) + 50×6 ≈ 302** DB/calculation round-trips. With frontend requesting limit 500, this becomes thousands of round-trips and causes slowness.

### 3.2 Missing Constraints

- No uniqueness constraint on **Company.id**, **Job.id**, **Invoice.invoiceNumber**, etc. Duplicate ids are possible at the application level if not enforced in code.
- **Recommendation:** Add `CREATE CONSTRAINT ... FOR (n:Label) REQUIRE n.id IS UNIQUE` (or equivalent) for id and invoiceNumber where uniqueness is required.

### 3.3 Session Per Query

- `neo4jService.runQuery()` opens and closes a session per call. For a single request that runs many queries (e.g. jobs list with N+1), this is many connections. Prefer a single request-scoped session or batched reads (single Cypher that returns jobs + relations).

### 3.4 Heavy Computed Fields on Lists

- **calculatedAmount**, **driverPay**, **calculatedHours** are computed in resolvers. For list views, either:
  - Persist **calculatedAmount** (and optionally driverPay) on Job when the job or its job type is saved, and return from the list query (no resolver), or
  - Batch-compute in the list resolver (one query returning many jobs’ inputs, then compute in JS and attach).

---

## 4. Data Shape Inconsistencies

- **Job.weight:** Stored as array in GraphQL; legacy code also supports string (space/JSON). Normalize to array of floats in the new schema.
- **Job.ticketIds:** Same (array vs string). Normalize to array of strings.
- **Job.images / imageUrls:** Both exist; images array (StoredImage ids) is canonical; imageUrls string may be legacy. Prefer one field (e.g. `imageIds: [String]`) and deprecate the other.
- **StoredImage:** Property name in DB is `data` (base64); some code reads `dataBase64`. Use one name in the new solution.

---

## 5. Recommendations for the New Solution

### 5.1 Schema & Relationships (Database-First)

1. **Standardize relationships**
   - Use only **INVOICED_IN** (Job→Invoice) with properties `amount`, `invoicedAt`. Remove dependency on HAS_INVOICE; migrate existing HAS_INVOICE to INVOICED_IN if both exist.
   - Use only **HAS_JOB_TYPE** (Company→JobType). Replace any BELONGS_TO usage with `(jt)<-[:HAS_JOB_TYPE]-(c:Company)`.
   - Use only **MANAGED_BY** (Job→Dispatcher) and **ASSIGNED_TO** (Job→Driver). Do not introduce DISPATCHED/DROVE; fix dashboard to use the same relationships.

2. **Add indexes**
   - Invoice: `invoiceDate`
   - Job: consider composite `(jobDate, invoiceStatus)` if filter patterns justify it
   - Add uniqueness constraints for node ids and Invoice.invoiceNumber where applicable

3. **Normalize property types**
   - Job: weight → array of floats; ticketIds → array of strings; single image reference field (e.g. imageIds).
   - StoredImage: single property name for base64 data.

4. **Persist calculatedAmount (and optionally driverPay) on Job**
   - Set/update on job create/update (and when job type rate changes if needed). List query then reads from the node; resolver only used for single-job or when recalculation is required.

### 5.2 Query & Resolver Design (Backend)

1. **Jobs list: single batched query**
   - One Cypher that OPTIONAL MATCHes Job with JobType, Driver, Dispatcher, Unit, Invoice (and Company via JobType) for the requested page. Return fully shaped job objects so **Job** field resolvers are not invoked for the list path.
   - One batch call for calculatedAmount/driverPay for that page of job ids (or read from stored properties).
   - Enforce a **max page size** (e.g. 100) in the API.

2. **DataLoaders**
   - For single-job and other screens, use DataLoader for JobType, Driver, Dispatcher, Unit, Invoice by id to batch per-request and avoid N+1.

3. **Sessions**
   - Prefer request-scoped session or `readTransaction` for multi-step reads so one request uses one session.

### 5.3 Module Migration Order (Database → Backend → Frontend)

Suggested order so each module is consistent and scalable:

| Order | Module        | DB layer | Backend (new) | Frontend (new) |
|-------|---------------|----------|----------------|----------------|
| 1     | **Auth**      | —        | JWT, auth routes, context | Login, AuthProvider, protected routes |
| 2     | **Reference data** | Indexes, constraints for Company, Driver, Dispatcher, Unit, JobType | CRUD + list (paginated), single read | Companies, Drivers, Dispatchers, Units, Job Types (one at a time or grouped) |
| 3     | **Jobs**      | Job indexes, stored calculatedAmount, single INVOICED_IN | Batched jobs list query, pagination, create/update/delete, batch calc | Jobs list (paginated), create/edit modals, filters |
| 4     | **Invoices** | Invoice indexes, INVOICED_IN only | Create/update invoice, list (paginated), calculations | Invoices list, create/edit, PDF |
| 5     | **Images**   | StoredImage, HAS_IMAGE | Upload, serve, link to Job | Upload in job forms, display |
| 6     | **Dashboard & Reports** | Same graph | Fix DISPATCHED/DROVE → MANAGED_BY/ASSIGNED_TO; reuse jobs/invoices data | Dashboard, reports (reuse new APIs) |

Start with **database**: apply relationship fixes (and migrations if existing data uses HAS_INVOICE/BELONGS_TO), add indexes and constraints, and normalize properties. Then implement backend per module (reference data, then jobs, then invoices, etc.), then frontend.new wiring for that module.

---

## 6. Checklist for New DB Layer (First Step)

- [x] Document canonical relationship list (no BELONGS_TO, no HAS_INVOICE, no DISPATCHED/DROVE).
- [x] Migration script: if existing data has HAS_INVOICE, create INVOICED_IN from it (`npm run migrate-invoice-rels`). Job.invoice resolver uses INVOICED_IN first, HAS_INVOICE fallback.
- [x] Resolvers: JobType–Company use HAS_JOB_TYPE only (BELONGS_TO removed from queries). No migration needed (relationship was never created).
- [x] Add indexes: Invoice.invoiceDate, Invoice.status; Job.driverPaid, Job composite (jobDate, invoiceStatus). See `ensureIndexes.ts`.
- [x] Add uniqueness constraints for id and invoiceNumber. See `ensureConstraints.ts`; run at startup.
- [x] Resolvers: dashboard and recent jobs use MANAGED_BY/ASSIGNED_TO (DISPATCHED/DROVE removed).
- [ ] Normalize Job.weight, Job.ticketIds, Job.images/imageIds; StoredImage.data naming (optional, for new solution).
- [ ] Decide and implement stored calculatedAmount (and driverPay) on Job; backfill if needed (for list scalability).

---

## 7. Quick Reference: Canonical Relationship Diagram (Target)

```
(Company)-[:HAS_JOB_TYPE]->(JobType)<-[:OF_TYPE]-(Job)
(Job)-[:ASSIGNED_TO]->(Driver)     (Driver)-[:HAS_RATE]->(DriverRate)<-[:RATE_FOR]-(JobType)
(Job)-[:MANAGED_BY]->(Dispatcher)
(Job)-[:USES_UNIT]->(Unit)
(Job)-[:INVOICED_IN {amount, invoicedAt}]->(Invoice)-[:BILLED_BY]->(Dispatcher)
(Job)-[:HAS_IMAGE]->(StoredImage)
```

**Do not use:** BELONGS_TO (JobType→Company), HAS_INVOICE (Job→Invoice), DISPATCHED (Dispatcher→Job), DROVE (Driver→Job).

---

This audit should be the single source of truth for the new solution’s database design and the order of work for database → backend → frontend.
