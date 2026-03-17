# Neo4j → SQL Server Migration Plan

This document compares the **Neo4j** schema (from `5rivers.app.backend`) with the **SQL Server** schema (from `5rivers.server`) and outlines a concrete plan to migrate data from Neo4j into SQL.

---

## Running the migration

1. **Apply SQL schema** (if not already done):  
   `npm run db:schema`

2. **Set env** in `5rivers.server/.env`:
   - `DATABASE_URL` (required)
   - `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` (optional: defaults to local neo4j/7687)

3. **Run the script**:  
   `npm run migrate:neo4j-to-sql`

The script creates or reuses an organization (by default name/slug `5rivers`), then migrates Companies → JobTypes → Drivers, Dispatchers, Units → Invoices → Jobs → JobInvoice → Images. Invoices without a `BILLED_BY` dispatcher in Neo4j get a placeholder dispatcher so they are not skipped.

---

## 1. Neo4j Schema Summary

### 1.1 Node labels and properties

| Label        | Properties |
|-------------|------------|
| **Company** | id, name, description, website, industry, location, size, founded, logo, email, phone, createdAt, updatedAt |
| **JobType** | id, title, startLocation, endLocation, dispatchType, rateOfJob, createdAt, updatedAt |
| **Driver**  | id, name, description, email, phone, hourlyRate, createdAt, updatedAt |
| **Dispatcher** | id, name, description, email, phone, commissionPercent, createdAt, updatedAt |
| **Unit**    | id, name, description, color, plateNumber, vin, createdAt, updatedAt |
| **Job**     | id, jobDate, amount, invoiceStatus, weight, loads, startTime, endTime, ticketIds, driverPaid, imageUrls, images, calculatedAmount, createdAt, updatedAt |
| **Invoice** | id, invoiceNumber, invoiceDate, status, billedTo, billedEmail, notes, createdAt, updatedAt |
| **StoredImage** | id, mimeType, data (base64), originalName, createdAt |

**Note:** Neo4j has **no** Organization, Users, or OrganizationMember. All entities are global in Neo4j.

### 1.2 Relationships

| Relationship   | From → To   | Relationship properties |
|----------------|-------------|---------------------------|
| HAS_JOB_TYPE   | Company → JobType | (none) |
| OF_TYPE        | Job → JobType    | (none) |
| ASSIGNED_TO    | Job → Driver     | (none) |
| MANAGED_BY     | Job → Dispatcher | (none) |
| USES_UNIT      | Job → Unit       | (none) |
| INVOICED_IN    | Job → Invoice    | **amount**, createdAt |
| BILLED_BY      | Invoice → Dispatcher | (none) |
| HAS_IMAGE      | Job → StoredImage | (none) |

**Legacy:** `HAS_INVOICE` (Job → Invoice) may exist; migration script should treat INVOICED_IN as canonical (same as existing backend migration).

**Optional:** `DriverRate` nodes with HAS_RATE (Driver), RATE_FOR/APPLIES_TO (JobType). SQL has no DriverRate table; Driver has `hourlyRate` only. Migration can ignore DriverRate or snapshot latest rate into Driver.hourlyRate.

### 1.3 Neo4j constraints

- Unique on: `Company.id`, `Driver.id`, `Dispatcher.id`, `Unit.id`, `JobType.id`, `Job.id`, `Invoice.id`, `StoredImage.id`, and **Invoice.invoiceNumber** (global).

---

## 2. SQL Server Schema Summary (5rivers.server)

### 2.1 Tables and key columns

| Table | Key columns | Notes |
|-------|-------------|--------|
| **Users** | id, email, passwordHash, name, createdAt, updatedAt | Auth; not in Neo4j |
| **Organizations** | id, name, slug, settings, createdAt, updatedAt | New; not in Neo4j |
| **OrganizationMember** | userId, organizationId, role | New; not in Neo4j |
| **Companies** | id, **organizationId**, name, description, website, industry, location, size, founded, logo, email, phone, createdAt, updatedAt | FK to Organizations |
| **JobTypes** | id, **companyId**, title, startLocation, endLocation, dispatchType, rateOfJob, createdAt, updatedAt | FK to Companies |
| **Drivers** | id, **organizationId**, name, description, email, phone, hourlyRate, createdAt, updatedAt | FK to Organizations |
| **Dispatchers** | id, **organizationId**, name, description, email, phone, commissionPercent, createdAt, updatedAt | FK to Organizations |
| **Units** | id, **organizationId**, name, description, color, plateNumber, vin, createdAt, updatedAt | FK to Organizations |
| **Invoices** | id, **organizationId**, invoiceNumber, invoiceDate, status, dispatcherId, billedTo, billedEmail, createdAt, updatedAt | FK Organizations, Dispatchers; **UQ (organizationId, invoiceNumber)** |
| **Jobs** | id, **organizationId**, jobDate, jobTypeId, driverId, dispatcherId, unitId, weight, loads, startTime, endTime, amount, ticketIds, driverPaid, createdAt, updatedAt | FKs to Org, JobType, Driver, Dispatcher, Unit |
| **JobInvoice** | jobId (PK), invoiceId, amount, addedAt | Job–Invoice line items; from INVOICED_IN |
| **Images** | id, jobId, content (VARBINARY), contentType, fileName, createdAt | From StoredImage + HAS_IMAGE |
| **DriverPayment** | id, driverId, organizationId, amount, paidAt, paymentMethod, reference, notes, createdAt, updatedAt | Not in Neo4j (optional post-migration) |
| **JobDriverPay** | jobId (PK), driverId, amount, paidAt, paymentId, createdAt | Not in Neo4j (optional post-migration) |

### 2.2 Enums (SQL)

- **Invoices.status:** CREATED, RAISED, RECEIVED (Neo4j may use "DRAFT" → map to CREATED).
- **OrganizationMember.role:** OWNER, ADMIN, DISPATCHER, MEMBER, VIEWER.

---

## 3. Field-by-field mapping (Neo4j → SQL)

### 3.1 Organization and auth

- **Organizations:** Create **one** default organization for migrated data (by default name = "5rivers", slug = "5rivers"). All migrated entities get this `organizationId`.
- **Users / OrganizationMember:** Not present in Neo4j. Either create a default admin user and link to the migrated org, or leave for post-migration setup.

### 3.2 Companies

| Neo4j (Company) | SQL (Companies) | Notes |
|-----------------|-----------------|--------|
| id              | id              | Keep as-is (VARCHAR(36) or existing ID format) |
| —               | organizationId  | Set to default migrated org ID |
| name, description, website, industry, location, size, founded, logo, email, phone | Same | Direct copy |
| createdAt, updatedAt | Same | Parse Neo4j datetime/string to DATETIME2 |

### 3.3 JobTypes

| Neo4j (JobType) | SQL (JobTypes) | Notes |
|-----------------|----------------|--------|
| id              | id             | Keep as-is |
| —               | companyId      | From (Company)-[:HAS_JOB_TYPE]->(JobType) |
| title, startLocation, endLocation, dispatchType, rateOfJob | Same | Direct copy |
| createdAt, updatedAt | Same | Parse to DATETIME2 |

### 3.4 Drivers, Dispatchers, Units

| Neo4j | SQL | Notes |
|-------|-----|--------|
| Driver.id, name, description, email, phone, hourlyRate, createdAt, updatedAt | Same columns | Add organizationId = default org |
| Dispatcher.* | Same | Add organizationId = default org |
| Unit.*        | Same | Add organizationId = default org |

### 3.5 Jobs

| Neo4j (Job) | SQL (Jobs) | Notes |
|-------------|------------|--------|
| id          | id         | Keep as-is |
| —           | organizationId | Default migrated org |
| jobDate     | jobDate    | Parse to DATE (Neo4j may store ISO string or datetime) |
| —           | jobTypeId  | From (Job)-[:OF_TYPE]->(JobType) |
| —           | driverId   | From (Job)-[:ASSIGNED_TO]->(Driver) |
| —           | dispatcherId | From (Job)-[:MANAGED_BY]->(Dispatcher) |
| —           | unitId     | From (Job)-[:USES_UNIT]->(Unit) |
| amount      | amount     | Direct |
| weight      | weight     | Neo4j: array of numbers → serialize to JSON string or space-separated for NVARCHAR(MAX) |
| loads       | loads      | Direct (int) |
| startTime, endTime | startTime, endTime | NVARCHAR(20) |
| ticketIds   | ticketIds  | Neo4j: array → JSON string or space-separated NVARCHAR(MAX) |
| driverPaid | driverPaid | Boolean → BIT |
| imageUrls, images, calculatedAmount | — | Not stored on Job in SQL; images go to Images table |
| createdAt, updatedAt | Same | Parse to DATETIME2 |

**invoiceStatus:** Do not migrate; in SQL, “invoiced” is derived from JobInvoice. Migrate INVOICED_IN into JobInvoice.

### 3.6 Invoices

| Neo4j (Invoice) | SQL (Invoices) | Notes |
|-----------------|----------------|--------|
| id              | id             | Keep as-is |
| —               | organizationId | Default migrated org |
| invoiceNumber   | invoiceNumber  | Keep; SQL has UQ (organizationId, invoiceNumber) so safe with one org |
| invoiceDate     | invoiceDate    | Parse to DATE |
| status          | status         | Map DRAFT → CREATED; ensure CREATED | RAISED | RECEIVED |
| —               | dispatcherId   | From (Invoice)-[:BILLED_BY]->(Dispatcher) |
| billedTo, billedEmail | Same | Direct |
| notes           | —              | SQL schema has no notes column; drop or add column if needed |
| createdAt, updatedAt | Same | Parse to DATETIME2 |

### 3.7 Job–Invoice lines (INVOICED_IN → JobInvoice)

| Neo4j INVOICED_IN | SQL JobInvoice | Notes |
|-------------------|----------------|--------|
| Job.id            | jobId (PK)     | |
| Invoice.id        | invoiceId      | |
| amount on relationship | amount | |
| createdAt on relationship | addedAt | DATETIME2 |

### 3.8 Images (StoredImage + HAS_IMAGE → Images)

| Neo4j | SQL Images | Notes |
|-------|------------|--------|
| StoredImage.id | id | |
| —      | jobId | From (Job)-[:HAS_IMAGE]->(StoredImage); one row per Job–StoredImage pair |
| StoredImage.data (base64) | content | Decode base64 → VARBINARY(MAX) |
| StoredImage.mimeType | contentType | |
| StoredImage.originalName | fileName | |
| StoredImage.createdAt | createdAt | Parse to DATETIME2 |

---

## 4. Migration order (respecting foreign keys)

Run in this order so that every FK target exists before insert:

1. **Organizations** – Create one “5rivers” organization (or reuse existing by slug).
2. **Users** (optional) – Create default admin, then **OrganizationMember** linking user to org.
3. **Companies** – Requires organizationId.
4. **JobTypes** – Requires companyId (from HAS_JOB_TYPE).
5. **Drivers, Dispatchers, Units** – Require organizationId.
6. **Invoices** – Require organizationId, dispatcherId.
7. **Jobs** – Require organizationId, jobTypeId, and optionally driverId, dispatcherId, unitId.
8. **JobInvoice** – Require jobId, invoiceId.
9. **Images** – Require jobId (from HAS_IMAGE); insert after Jobs.

DriverPayment and JobDriverPay are not in Neo4j; skip or populate later.

---

## 5. Data type and format conversions

- **Neo4j datetime()** → ISO string or integer; parse in Node to JavaScript Date, then send to SQL as DATETIME2 (e.g. ISO or parameterized).
- **Neo4j Date** → Same; ensure jobDate/invoiceDate are date-only (YYYY-MM-DD) for SQL DATE.
- **weight** (array in Neo4j) → `JSON.stringify(weight)` or join with spaces; store in NVARCHAR(MAX). Confirm 5rivers.server app expects same format.
- **ticketIds** (array) → Same as weight; JSON or space-separated in NVARCHAR(MAX).
- **Invoice status** → Map DRAFT → CREATED; allow only CREATED, RAISED, RECEIVED.
- **IDs** → Keep existing Neo4j IDs (e.g. `driver_123...`, `jobtype_...`) if they are string-compatible with VARCHAR(36); otherwise consider generating UUIDs and maintaining an id map for FKs.

---

## 6. Recommended migration script approach

- **Tool:** Node.js script in `5rivers.server` (e.g. `scripts/migrate-neo4j-to-sql.ts` or `.js`).
- **Libraries:** `neo4j-driver` (read), `mssql` or existing SQL Server client used by 5rivers.server (write).
- **Steps:**
  1. Connect to Neo4j and SQL Server.
  2. Create default Organization (and optionally User + OrganizationMember).
  3. Export from Neo4j in order: Companies (with id), JobTypes (with companyId from HAS_JOB_TYPE), Drivers, Dispatchers, Units, Invoices (with dispatcherId from BILLED_BY), Jobs (with jobTypeId, driverId, dispatcherId, unitId from relationships), then INVOICED_IN rows, then StoredImage + HAS_IMAGE for Images.
  4. Insert into SQL in the order of section 4, in transactions per entity type (or one big transaction if preferred).
  5. Handle duplicates: use `INSERT ... WHERE NOT EXISTS` or skip existing IDs so the script is idempotent where possible.
  6. Log counts (e.g. companies inserted, jobs inserted, images inserted) and any errors (e.g. missing FK, invalid date).

---

## 7. Pre-migration checklist

- [ ] Back up Neo4j database.
- [ ] Back up SQL Server database (or use a dedicated migration DB).
- [ ] Confirm default organization slug/name and whether to create a default user.
- [ ] Decide whether to migrate DriverRate into Driver.hourlyRate (e.g. latest rate per driver).
- [ ] Confirm Invoice.notes: add column to SQL if needed, or drop from Neo4j export.
- [ ] Run schema and any migrations on SQL so all tables (including Images, JobInvoice) exist.

---

## 8. Post-migration validation

- [ ] Row counts: Companies, JobTypes, Drivers, Dispatchers, Units, Jobs, Invoices, JobInvoice, Images match Neo4j (or document known gaps).
- [ ] Spot-check: same job appears with correct jobType, driver, dispatcher, unit, and invoice lines.
- [ ] Spot-check: invoice totals vs sum of JobInvoice.amount per invoice.
- [ ] Images: sample a few job IDs and verify image binary and contentType/fileName.
- [ ] Dashboard/reports: run any existing 5rivers.server reports or frontend against migrated data.

---

## 9. Summary

| Neo4j | SQL | Action |
|-------|-----|--------|
| Company, JobType, Driver, Dispatcher, Unit, Job, Invoice | Same tables with organizationId (and companyId for JobType) | Map relationships to FKs; add default org |
| INVOICED_IN (amount, createdAt) | JobInvoice | One row per relationship |
| StoredImage + HAS_IMAGE | Images | Decode base64 → VARBINARY; one row per Job–Image link |
| HAS_JOB_TYPE, OF_TYPE, ASSIGNED_TO, MANAGED_BY, USES_UNIT, BILLED_BY | FKs on JobTypes, Jobs, Invoices | Resolve IDs during export and set FK columns |
| DriverRate (optional) | — | Ignore or snapshot into Driver.hourlyRate |
| Organization, Users | New in SQL | Create one org (and optionally one user) for migrated data |

This plan should be enough to implement a one-off migration script and validate the result. If you want, the next step is to add a concrete Node script skeleton (e.g. under `5rivers.server/scripts/migrate-neo4j-to-sql.ts`) that follows this order and mappings.
