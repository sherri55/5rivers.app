# Data model and cleanup plan

**Goal:** A single, clear data structure with well-defined relationships. No duplicate links, no stored derived data, one set of statuses.

---

## 1. Principles

| Principle | Meaning |
|-----------|--------|
| **One link per association** | One way to link Job↔Invoice and Invoice↔Dispatcher. No legacy duplicates (e.g. INVOICED_IN and HAS_INVOICE). |
| **Store once, derive elsewhere** | Invoice status is stored on Invoice only. Job “invoice status” is always derived (PENDING if not on an invoice, else the invoice’s status). |
| **Single status vocabulary** | Four values: PENDING, CREATED, RAISED, RECEIVED. Used consistently for invoice and (derived) job. |
| **Clear ownership** | **Organization** is the root; all main entities belong to one organization. Company → JobTypes; Job → JobType, Driver, Dispatcher, Unit; Job → Invoice via one junction; Invoice → Dispatcher. |

---

## 2. Target entities and relationships

### 2.1 Organization as parent (root)

**Organization** is the top-level parent. Every operational entity belongs to exactly one organization (multi-tenant / B2B boundary).

| Entity | Belongs to Organization | Stored as |
|--------|--------------------------|-----------|
| Company | Yes | `Company.OrganizationId` FK |
| JobType | Via Company | `JobType.CompanyId` → Company.OrganizationId |
| Driver | Yes | `Driver.OrganizationId` FK |
| Dispatcher | Yes | `Dispatcher.OrganizationId` FK |
| Unit | Yes | `Unit.OrganizationId` FK |
| Invoice | Yes | `Invoice.OrganizationId` FK |
| Job | Yes | `Job.OrganizationId` FK |

**Invariant:** All data for a given organization is scoped by `OrganizationId`. Queries and APIs should always filter by organization (e.g. current user’s org).

### 2.2 Users and login (per organization)

**Users** are the identities that log in. A user can belong to **multiple organizations**, with a **role per organization**. Login flow: **select organization first**, then authenticate; access is scoped to that organization and the user’s role there.

| Concept | Stored | Notes |
|--------|--------|--------|
| **User** | Global identity: id, email (unique), passwordHash, name, createdAt, updatedAt | No OrganizationId on User; one person can be in many orgs. |
| **OrganizationMember** | userId (FK), organizationId (FK), **role**, createdAt | Junction: user ↔ org with one role per org. PK (userId, organizationId). |
| **Role** | Stored in OrganizationMember.role | OWNER, ADMIN, DISPATCHER, MEMBER, VIEWER (see below). |

**Login flow**

1. User selects an **organization** (e.g. by slug in URL or from a list of orgs they can access).
2. User enters **email** and **password** in that org’s login screen.
3. Backend: validate email + password (User), then ensure this User is a member of the **selected organization** (OrganizationMember); return session/token with `userId`, `organizationId`, and `role`.
4. All API requests are scoped by `organizationId` (and optionally enforced by `role`).

**Roles (per organization)**

| Role | Meaning |
|------|--------|
| **OWNER** | Full control of the organization; can manage billing, delete org, assign OWNER to others. |
| **ADMIN** | Manage users, roles, and all operational data (companies, jobs, invoices, drivers, etc.). |
| **DISPATCHER** | Operate jobs and invoices (create/edit jobs, create invoices). May be linked to a Dispatcher record later. |
| **MEMBER** | Basic access (e.g. view and limited edit). |
| **VIEWER** | Read-only access to org data. |

The **Dispatcher** entity (jobs/invoices) can later be linked to a User (e.g. Dispatcher.UserId) so the same login can double as the “dispatcher” on an invoice; for now, Users and roles define who can log in and what they can do within an org.

### 2.3 Entity relationship overview

```
Organization 1 ──* Company      (org has many companies)
Organization 1 ──* Driver
Organization 1 ──* Dispatcher
Organization 1 ──* Unit
Organization 1 ──* Invoice
Organization 1 ──* Job

Company 1 ──* JobType          (Company owns job types; company belongs to org)
JobType  1 ──* Job             (Job has one type; job belongs to org)
Driver   1 ──* Job             (Job assigned to one driver)
Dispatcher 1 ──* Job           (Job managed by one dispatcher)
Unit     1 ──* Job             (Job uses one unit)

Invoice  1 ──* JobInvoice *── 1 Job   (Job can be on at most one invoice; invoice has many line items)
Dispatcher 1 ──* Invoice       (Invoice belongs to one dispatcher)

User *──* Organization       (many-to-many via OrganizationMember; role per org)
Organization 1 ──* OrganizationMember *── 1 User
```

### 2.4 Table-level relationships (SQL)

| From | Relationship | To | Stored as | Notes |
|------|--------------|----|-----------|--------|
| **Organization** | (root) | — | — | Top-level tenant. |
| **Organization** | HAS | Company, Driver, Dispatcher, Unit, Invoice, Job | `*.OrganizationId` FK | Every main entity has OrganizationId. |
| **Company** | HAS_JOB_TYPE | JobType | `JobType.CompanyId` FK | Company owns job types; Company.OrganizationId scopes org. |
| **Job** | OF_TYPE | JobType | `Job.JobTypeId` FK | Required for calculation. |
| **Job** | ASSIGNED_TO | Driver | `Job.DriverId` FK | Optional. |
| **Job** | MANAGED_BY | Dispatcher | `Job.DispatcherId` FK | Optional. |
| **Job** | USES_UNIT | Unit | `Job.UnitId` FK | Optional. |
| **Job** | ON_INVOICE | Invoice | **Junction `JobInvoice`** (JobId, InvoiceId, Amount, AddedAt) | **Only** link between Job and Invoice. One row per job (JobId unique). |
| **Invoice** | FOR_DISPATCHER | Dispatcher | `Invoice.DispatcherId` FK | Invoice belongs to one dispatcher. |
| **Job** | HAS_IMAGE | Image | `Image.JobId` FK | Images stored as blob (content VARBINARY); one job has many images. |
| **Job** | DRIVER_PAY | JobDriverPay | `JobDriverPay.JobId` PK | One row per job: amount earned by driver; paidAt/paymentId when paid. |
| **Driver** | PAYMENTS | DriverPayment | `DriverPayment.DriverId` FK | Records of payments to driver (amount, paidAt, reference). |
| **User** | MEMBER_OF | Organization | **Junction `OrganizationMember`** (UserId, OrganizationId, Role) | One user can have one role per org; used for login and authorization. |

### 2.5 What is stored vs derived

| Concept | Stored | Derived / rule |
|--------|--------|-----------------|
| **Invoice status** | `Invoice.Status` (CREATED \| RAISED \| RECEIVED) | — |
| **Job “invoice status”** | **Never stored on Job** | If no row in `JobInvoice` for job → **PENDING**. Else → `Invoice.Status` for that invoice. |
| **Job line amount on invoice** | `JobInvoice.Amount`, `JobInvoice.AddedAt` | — |
| **Job calculated amount** | Optional cached value; otherwise | From JobType (rate, dispatchType) + Job (hours, loads, weight, etc.). |
| **Driver pay** | **JobDriverPay.amount** per job (stored when finalized); optionally derived from job + driver rates until then. | Pending = SUM(amount) WHERE paidAt IS NULL; Paid = SUM(amount) WHERE paidAt IS NOT NULL. **DriverPayment** records each payment; link via JobDriverPay.paymentId. |

---

## 3. Single status vocabulary

Use exactly four values everywhere they apply:

| Status | Meaning | Where used |
|--------|--------|------------|
| **PENDING** | Not on any invoice | Job invoice status (derived only). |
| **CREATED** | Invoice exists, not yet shared with client | Stored on Invoice; derived for jobs on that invoice. |
| **RAISED** | Invoice shared with client | Stored on Invoice; derived for jobs on that invoice. |
| **RECEIVED** | Payment received for invoice | Stored on Invoice; derived for jobs on that invoice. |

**Invariant:** Invoices in the DB only have status CREATED, RAISED, or RECEIVED. PENDING is only for “job not on any invoice.”

---

## 4. Data cleanup rules

When migrating or cleaning existing data, apply these rules so the new structure is clear and consistent.

### 4.1 Job – Invoice (single link)

| Current (legacy) | Action |
|------------------|--------|
| Two link types (e.g. INVOICED_IN, HAS_INVOICE) | Consolidate into **one** junction: `JobInvoice` (JobId, InvoiceId, Amount, AddedAt). |
| Multiple links for same job to different invoices | Keep only one: the canonical invoice (e.g. most recent or by business rule). Delete or ignore the rest. |
| Missing amount or addedAt on link | Backfill: amount from job calculated amount or existing line amount; addedAt from invoice or job updated date. |

**Invariant after cleanup:** Each `JobId` appears at most once in `JobInvoice`.

### 4.2 Invoice – Dispatcher (single link)

| Current (legacy) | Action |
|------------------|--------|
| Different relationship names (e.g. BILLED_BY, FOR_DISPATCHER) | Use one: **Invoice.DispatcherId** (FK to Dispatcher). |
| Invoice with no dispatcher | Set to a default dispatcher or mark as data-fix required; do not leave null if schema requires it. |
| Invoice with multiple dispatchers | Pick one (e.g. primary or first); drop the rest. |

### 4.3 Job: do not store invoice status

| Current (legacy) | Action |
|------------------|--------|
| `Job.InvoiceStatus` (or equivalent) stored on Job | **Remove** from schema. Never store; always derive from presence in `JobInvoice` + `Invoice.Status`. |
| Legacy status strings (e.g. “Invoiced”, “Paid”) | Map to PENDING / CREATED / RAISED / RECEIVED when displaying or migrating; then rely only on Invoice + JobInvoice. |

### 4.4 Organization (parent) and scoping

| Current (legacy) | Action |
|------------------|--------|
| No organization concept | Create at least one **Organization** (e.g. default “Acme”). All existing data assigned to that org. |
| Multiple logical tenants in one DB | Create one Organization per tenant; set **OrganizationId** on every Company, Driver, Dispatcher, Unit, Invoice, and Job. Use OrganizationId on every API query. |
| Invoice number only globally unique | Enforce **unique (OrganizationId, InvoiceNumber)** so two orgs can reuse the same invoice number. |

### 4.5 Users and organization membership

| Current (legacy) | Action |
|------------------|--------|
| No user/account tables | Add **Users** and **OrganizationMember**. Create at least one User and one OrganizationMember (e.g. admin@example.com as OWNER of default org). |
| Single-tenant or no roles | One Organization per tenant; assign each user to org(s) with a single role per org (OrganizationMember.role). |
| Login without org context | Enforce flow: resolve organization (e.g. from slug) → then authenticate → then verify User is member of that org; session must include organizationId and role. |

**Invariant:** Every login session is bound to one (userId, organizationId, role). API authorization checks organizationId and optionally role.

### 4.6 Reference data and required FKs

| Area | Cleanup |
|------|--------|
| Orphan jobs (JobTypeId, DriverId, DispatcherId, UnitId) | Decide: allow nulls for optional relations, or backfill with “Unknown” entities and point FKs there. |
| Companies / JobTypes | Ensure every JobType has a CompanyId; every Job has a valid JobTypeId. All under one Organization. |
| Unique constraints | Organization.slug unique; (OrganizationId, InvoiceNumber) unique; JobId unique in JobInvoice. |

### 4.7 Normalization and consistency

| Item | Rule |
|------|------|
| **Status casing** | Normalize to UPPERCASE (CREATED, RAISED, RECEIVED, PENDING). |
| **Dates** | Store in UTC or a single time zone; document which. Use date-only for job date and invoice date where appropriate. |
| **IDs** | Use a single type (e.g. UUID) across all tables; no mixed integer + string IDs for the same entity. |
| **Driver pay / rates** | Optional DriverRate table (DriverId, JobTypeId, PayType, PercentageRate, HourlyRate); no duplicate or conflicting link types. |

---

## 5. Target schema summary (SQL Server)

**Auth and org**

- **Users** – id, email (unique), passwordHash, name, createdAt, updatedAt. Global identity; no OrganizationId.
- **Organizations** – id, name, slug (unique), settings (JSON optional), createdAt, updatedAt. **Root parent for operational data.**
- **OrganizationMember** – userId (FK), organizationId (FK), role (OWNER|ADMIN|DISPATCHER|MEMBER|VIEWER), createdAt. PK (userId, organizationId). One role per user per org; used for login and authorization.

**Operational (all scoped by organization)**

- **Companies** – id, **organizationId (FK)**, name, description, website, industry, location, size, founded, logo, email, phone, createdAt, updatedAt.
- **JobTypes** – id, companyId (FK), title, startLocation, endLocation, dispatchType, rateOfJob, createdAt, updatedAt.
- **Drivers** – id, **organizationId (FK)**, name, description, email, phone, hourlyRate, createdAt, updatedAt.
- **Dispatchers** – id, **organizationId (FK)**, name, description, email, phone, commissionPercent, createdAt, updatedAt.
- **Units** – id, **organizationId (FK)**, name, description, color, plateNumber, vin, createdAt, updatedAt.
- **Invoices** – id, **organizationId (FK)**, invoiceNumber (unique per org), invoiceDate, **status** (CREATED|RAISED|RECEIVED), dispatcherId (FK), billedTo, billedEmail, createdAt, updatedAt.
- **Jobs** – id, **organizationId (FK)**, jobDate, jobTypeId (FK), driverId (FK nullable), dispatcherId (FK nullable), unitId (FK nullable), weight (JSON or array), loads, startTime, endTime, amount (fixed), ticketIds (JSON), driverPaid, createdAt, updatedAt. **No** invoiceStatus column. **No** imageUrls – use **Images** table for blob storage.
- **JobInvoice** – jobId (PK, FK), invoiceId (FK), amount, addedAt. One row per job; job can be on at most one invoice.
- **Images** – id, jobId (FK), **content** (VARBINARY(MAX)), contentType, fileName, createdAt. One row per image; job can have many images. Stored as blob in SQL Server.
- **DriverPayment** – id, driverId (FK), organizationId (FK), amount, paidAt (date), reference, createdAt. Record of each payment made to a driver.
- **JobDriverPay** – jobId (PK, FK), driverId (FK), amount, paidAt (nullable), paymentId (nullable FK to DriverPayment), createdAt. Driver pay per job; **pending** = SUM(amount) WHERE paidAt IS NULL, **paid** = SUM(amount) WHERE paidAt IS NOT NULL. When you pay a driver, create a DriverPayment and set JobDriverPay.paidAt + paymentId for the jobs included.

Optional later: **DriverRates** (driverId, jobTypeId, payType, percentageRate, hourlyRate).

---

## 6. Checklist before go-live

- [ ] **Users** and **OrganizationMember** in place. Login flow: select org → email/password → session has userId, organizationId, role. All API calls scoped by organizationId.
- [ ] **Organization** is the root: every Company, Driver, Dispatcher, Unit, Invoice, and Job has OrganizationId. All queries scoped by org.
- [ ] All Job–Invoice links go through a single table (`JobInvoice`); no duplicate or legacy link tables.
- [ ] Invoice has exactly one dispatcher (FK); no second link type.
- [ ] Job has no stored “invoice status”; it is always derived.
- [ ] Only CREATED, RAISED, RECEIVED on Invoice; PENDING only as derived for jobs not in JobInvoice.
- [ ] Unique constraints: User.email; Organization.slug; (userId, organizationId) in OrganizationMember; Invoice (organizationId + invoiceNumber); (JobId) in JobInvoice.
- [ ] Status and dates normalized; IDs consistent (e.g. UUID everywhere).
- [ ] Orphan and null FKs resolved by policy (allow null vs default entity).

This document is the single reference for the new app’s data structure and cleanup rules. The SQL schema in `app/backend` should implement exactly this model.
