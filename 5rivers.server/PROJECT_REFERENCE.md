# 5Rivers Trucking – Server Project Reference

> Complete technical reference for the 5rivers.server backend. Intended for use by AI agents, developers, or any tooling that needs full context on the project's architecture, data model, API surface, and business logic.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Project Structure](#3-project-structure)
4. [Configuration & Environment](#4-configuration--environment)
5. [Database Schema](#5-database-schema)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [API Reference](#7-api-reference)
8. [Services – Business Logic](#8-services--business-logic)
9. [Business Domain & Concepts](#9-business-domain--concepts)
10. [Testing](#10-testing)
11. [Scripts & Migrations](#11-scripts--migrations)

---

## 1. Project Overview

**5Rivers Trucking** is a multi-tenant trucking operations management platform. Each tenant is an **Organization**. All data (drivers, units, jobs, invoices, etc.) is scoped to an organization.

### Core Business Functions

- Manage **drivers**, **dispatchers**, **units** (trucks), **companies** (clients), and **job types**
- Record **jobs** (work done: date, driver, unit, job type, loads, weight, amounts)
- Generate **invoices** for dispatchers or directly to companies
- Track **driver payments** and balances (earned vs. paid)
- Support **two operating models**:
  - **Dispatched**: External dispatchers assign jobs to 5Rivers drivers (traditional)
  - **Direct**: Companies contact 5Rivers directly; 5Rivers acts as dispatcher and may subcontract to **carriers** (other trucking companies)

---

## 2. Tech Stack & Dependencies

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Language | TypeScript (ES2022, commonjs) |
| Framework | Express 4.18 |
| Database | Microsoft SQL Server 2016+ (via `mssql` package) |
| Auth | JWT (`jsonwebtoken`) + bcrypt password hashing |
| File Upload | multer (memory storage, 10MB limit) |
| Testing | Jest 29 + supertest 6 + ts-jest |
| Dev Server | ts-node-dev (auto-restart) |

### Runtime Dependencies

```
bcrypt@^5.1.1          – Password hashing
cors@^2.8.5            – CORS middleware
dotenv@^16.3.1         – Environment variable loading
express@^4.18.2        – HTTP framework
jsonwebtoken@^9.0.2    – JWT token generation/verification
mssql@^10.0.1          – SQL Server driver with connection pooling
multer@^1.4.5-lts.1    – Multipart file upload handling
uuid@^9.0.0            – UUID v4 generation for all entity IDs
neo4j-driver@^5.15.0   – Legacy (migration tooling only)
```

### NPM Scripts

```bash
npm run dev             # Start dev server with auto-reload
npm run build           # Compile TypeScript to dist/
npm start               # Run compiled server
npm test                # Run all tests (--runInBand --forceExit)
npm run test:watch      # Watch mode
npm run test:db         # Test database connectivity only
npm run db:schema       # Apply full schema (destructive – drops all tables)
npm run db:migrate      # Apply incremental migrations
npm run db:seed         # Seed a sample user
npm run db:create-user  # Create a user interactively
```

---

## 3. Project Structure

```
5rivers.server/
├── package.json
├── tsconfig.json
├── jest.config.js
├── jest.setup.js              # Loads .env for tests
├── .env.example
│
├── scripts/
│   ├── schema.sql             # Full database schema (all tables)
│   ├── apply-schema.ts        # Runs schema.sql against DB
│   ├── apply-migrations.ts    # Runs incremental migrations
│   ├── test-connection.ts     # DB connectivity check
│   ├── seed-sample-user.ts    # Creates demo user + org
│   ├── create-user.ts         # CLI user creation
│   └── migrations/
│       ├── 001-driver-payment-tracking.sql
│       └── 002-dual-driver-pay-units-carriers.sql
│
└── src/
    ├── index.ts               # Server startup + graceful shutdown
    ├── app.ts                 # Express app (cors, json, routes, errorHandler)
    │
    ├── config/
    │   └── index.ts           # Environment config object
    │
    ├── db/
    │   └── connection.ts      # Singleton connection pool + query()
    │
    ├── middleware/
    │   ├── auth.middleware.ts  # requireAuth(), requireRole()
    │   └── errorHandler.ts    # AppError class, notFound/badRequest/etc, error handler
    │
    ├── types/
    │   ├── index.ts           # Pagination, ListResult, SortOrder, parseListOptions
    │   ├── auth.ts            # AuthUser, ROLES, Role type
    │   └── express.d.ts       # Express Request augmentation (req.user)
    │
    ├── utils/
    │   └── asyncHandler.ts    # Wraps async route handlers to catch rejections
    │
    ├── routes/
    │   ├── index.ts           # Route registration
    │   ├── health.routes.ts
    │   ├── auth.routes.ts
    │   ├── organizations.routes.ts
    │   ├── members.routes.ts
    │   ├── companies.routes.ts
    │   ├── drivers.routes.ts
    │   ├── dispatchers.routes.ts
    │   ├── units.routes.ts
    │   ├── jobTypes.routes.ts
    │   ├── jobs.routes.ts         # Includes image + driver-pay sub-routes
    │   ├── invoices.routes.ts     # Includes job-invoice sub-routes
    │   ├── driverPayments.routes.ts
    │   └── driverPay.routes.ts
    │
    ├── services/
    │   ├── auth.service.ts
    │   ├── company.service.ts
    │   ├── driver.service.ts
    │   ├── dispatcher.service.ts
    │   ├── unit.service.ts
    │   ├── jobType.service.ts
    │   ├── job.service.ts
    │   ├── invoice.service.ts
    │   ├── jobInvoice.service.ts
    │   ├── image.service.ts
    │   ├── driverPayment.service.ts
    │   ├── jobDriverPay.service.ts
    │   ├── driverPay.service.ts
    │   └── member.service.ts
    │
    └── __tests__/
        ├── helpers.ts             # Test context setup + cleanup
        ├── db-connection.test.ts  # DB connectivity test
        ├── api.test.ts            # Original API integration tests (73 tests)
        └── new-features.test.ts   # New architecture tests (109 tests)
```

---

## 4. Configuration & Environment

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `4000` | Server port |
| `NODE_ENV` | No | `development` | Environment |
| `DATABASE_URL` | **Yes** | – | SQL Server connection string |
| `JWT_SECRET` | **Yes** | – | JWT signing secret (min 32 chars) |
| `JWT_EXPIRES_IN` | No | `24h` | Token expiration |
| `BCRYPT_ROUNDS` | No | `12` | Password hash rounds |
| `ALLOWED_ORIGINS` | No | `http://localhost:3000` | Comma-separated CORS origins |
| `SUPER_ADMIN_EMAIL` | No | – | Email that can access any organization |

### DATABASE_URL Format

```
Server=localhost,1433;User Id=sa;Password=xxx;Encrypt=True;TrustServerCertificate=True;Database=5rivers
```

The config module normalizes SSMS-style connection strings to node-mssql format automatically.

---

## 5. Database Schema

All IDs are `VARCHAR(36)` UUIDs (v4). All tables have `createdAt` and `updatedAt` (`DATETIME2`, default `GETUTCDATE()`). All entity tables are scoped to an organization via `organizationId` foreign key.

### 5.1 Users

```sql
Users (
  id              VARCHAR(36) PK,
  email           NVARCHAR(255) UNIQUE NOT NULL,
  passwordHash    NVARCHAR(255) NOT NULL,
  name            NVARCHAR(255) NULL,
  createdAt       DATETIME2,
  updatedAt       DATETIME2
)
```

### 5.2 Organizations

```sql
Organizations (
  id              VARCHAR(36) PK,
  name            NVARCHAR(255) NOT NULL,
  slug            NVARCHAR(100) UNIQUE NOT NULL,
  settings        NVARCHAR(MAX) NULL,       -- JSON blob for org-level settings
  createdAt       DATETIME2,
  updatedAt       DATETIME2
)
```

### 5.3 OrganizationMember

```sql
OrganizationMember (
  userId          VARCHAR(36) FK → Users,
  organizationId  VARCHAR(36) FK → Organizations,
  role            NVARCHAR(50) CHECK (OWNER, ADMIN, DISPATCHER, MEMBER, VIEWER),
  createdAt       DATETIME2,
  PRIMARY KEY (userId, organizationId)
)
```

### 5.4 Companies

Companies are the **clients** that provide work (via dispatchers or directly).

```sql
Companies (
  id              VARCHAR(36) PK,
  organizationId  VARCHAR(36) FK → Organizations (CASCADE),
  name            NVARCHAR(255) NOT NULL,
  description     NVARCHAR(MAX) NULL,
  website         NVARCHAR(500) NULL,
  industry        NVARCHAR(255) NULL,
  location        NVARCHAR(500) NULL,
  size            NVARCHAR(50) NULL,
  founded         INT NULL,
  logo            NVARCHAR(500) NULL,
  email           NVARCHAR(255) NULL,
  phone           NVARCHAR(100) NULL,
  createdAt       DATETIME2,
  updatedAt       DATETIME2
)
```

### 5.5 JobTypes

Templates for recurring work. Belong to a company.

```sql
JobTypes (
  id              VARCHAR(36) PK,
  companyId       VARCHAR(36) FK → Companies (CASCADE),
  title           NVARCHAR(255) NOT NULL,
  startLocation   NVARCHAR(500) NULL,
  endLocation     NVARCHAR(500) NULL,
  dispatchType    NVARCHAR(50) NOT NULL,     -- e.g. "STANDARD"
  rateOfJob       DECIMAL(18,2) DEFAULT 0,   -- base rate for this job type
  createdAt       DATETIME2,
  updatedAt       DATETIME2
)
```

### 5.6 Drivers

Drivers who perform jobs. Support **dual pay model**.

```sql
Drivers (
  id              VARCHAR(36) PK,
  organizationId  VARCHAR(36) FK → Organizations (CASCADE),
  name            NVARCHAR(255) NOT NULL,
  description     NVARCHAR(MAX) NULL,
  email           NVARCHAR(255) NULL,
  phone           NVARCHAR(100) NULL,
  payType         NVARCHAR(20) DEFAULT 'HOURLY',   -- HOURLY | PERCENTAGE | CUSTOM
  hourlyRate      DECIMAL(18,2) DEFAULT 0,          -- $/hr when payType is HOURLY
  percentageRate  DECIMAL(5,2) DEFAULT 0,            -- % of job when payType is PERCENTAGE
  createdAt       DATETIME2,
  updatedAt       DATETIME2
)
```

**Pay Model Logic:**
- `HOURLY` – Driver is paid `hourlyRate × hours worked`
- `PERCENTAGE` – Driver is paid `percentageRate% × job amount`
- `CUSTOM` – Both rates stored; actual pay is set manually per job via JobDriverPay

### 5.7 DriverJobTypeRate

Per-job-type rate overrides for drivers. Allows a driver to have different rates for different job types.

```sql
DriverJobTypeRate (
  id              VARCHAR(36) PK,
  driverId        VARCHAR(36) FK → Drivers (CASCADE),
  jobTypeId       VARCHAR(36) FK → JobTypes (NO ACTION),
  payType         NVARCHAR(20) CHECK (HOURLY, PERCENTAGE),
  hourlyRate      DECIMAL(18,2) DEFAULT 0,
  percentageRate  DECIMAL(5,2) DEFAULT 0,
  createdAt       DATETIME2,
  updatedAt       DATETIME2,
  UNIQUE (driverId, jobTypeId)
)
```

### 5.8 Dispatchers

External dispatchers who provide jobs to the organization.

```sql
Dispatchers (
  id              VARCHAR(36) PK,
  organizationId  VARCHAR(36) FK → Organizations (CASCADE),
  name            NVARCHAR(255) NOT NULL,
  description     NVARCHAR(MAX) NULL,
  email           NVARCHAR(255) NULL,
  phone           NVARCHAR(100) NULL,
  commissionPercent DECIMAL(5,2) DEFAULT 0,   -- % commission taken by dispatcher
  createdAt       DATETIME2,
  updatedAt       DATETIME2
)
```

### 5.9 Units

Vehicles/trucks with comprehensive lifecycle tracking.

```sql
Units (
  id                  VARCHAR(36) PK,
  organizationId      VARCHAR(36) FK → Organizations (CASCADE),
  name                NVARCHAR(255) NOT NULL,       -- display name / unit number
  description         NVARCHAR(MAX) NULL,
  color               NVARCHAR(100) NULL,
  plateNumber         NVARCHAR(100) NULL,
  vin                 NVARCHAR(100) NULL,
  status              NVARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE | INACTIVE | MAINTENANCE | RETIRED
  year                INT NULL,                       -- model year
  make                NVARCHAR(100) NULL,             -- e.g. Freightliner, Kenworth, Peterbilt
  model               NVARCHAR(100) NULL,             -- e.g. Cascadia, T680, 579
  mileage             INT NULL,                       -- current odometer reading
  insuranceExpiry     DATE NULL,                      -- insurance expiration date
  lastMaintenanceDate DATE NULL,                      -- date of last maintenance
  nextMaintenanceDate DATE NULL,                      -- scheduled next maintenance
  createdAt           DATETIME2,
  updatedAt           DATETIME2
)
```

### 5.10 UnitEvents

Maintenance, inspection, and repair history log for units.

```sql
UnitEvents (
  id              VARCHAR(36) PK,
  unitId          VARCHAR(36) FK → Units (CASCADE),
  organizationId  VARCHAR(36) FK → Organizations (NO ACTION),
  eventType       NVARCHAR(50) CHECK (MAINTENANCE, INSPECTION, REPAIR, INCIDENT,
                                       TIRE_CHANGE, OIL_CHANGE, REGISTRATION, NOTE),
  eventDate       DATE NOT NULL,
  description     NVARCHAR(MAX) NULL,
  cost            DECIMAL(18,2) NULL,
  mileageAtEvent  INT NULL,
  performedBy     NVARCHAR(255) NULL,      -- mechanic / shop name
  nextDueDate     DATE NULL,               -- when next service is due
  notes           NVARCHAR(MAX) NULL,
  createdAt       DATETIME2,
  updatedAt       DATETIME2
)
```

### 5.11 Carriers

Other trucking companies that 5Rivers can **subcontract work to** when acting as dispatcher.

```sql
Carriers (
  id              VARCHAR(36) PK,
  organizationId  VARCHAR(36) FK → Organizations (CASCADE),
  name            NVARCHAR(255) NOT NULL,
  description     NVARCHAR(MAX) NULL,
  contactPerson   NVARCHAR(255) NULL,
  email           NVARCHAR(255) NULL,
  phone           NVARCHAR(100) NULL,
  rateType        NVARCHAR(50) DEFAULT 'PERCENTAGE',  -- PERCENTAGE | FLAT_PER_JOB | FLAT_PER_LOAD | FLAT_PER_TON | HOURLY
  rate            DECIMAL(18,2) DEFAULT 0,
  status          NVARCHAR(20) DEFAULT 'ACTIVE',       -- ACTIVE | INACTIVE
  createdAt       DATETIME2,
  updatedAt       DATETIME2
)
```

### 5.12 Invoices

Invoices raised either to a **dispatcher** (traditional) or directly to a **company**.

```sql
Invoices (
  id              VARCHAR(36) PK,
  organizationId  VARCHAR(36) FK → Organizations (CASCADE),
  invoiceNumber   NVARCHAR(100) NOT NULL,
  invoiceDate     DATE NOT NULL,
  status          NVARCHAR(50) CHECK (CREATED, RAISED, RECEIVED),
  dispatcherId    VARCHAR(36) FK → Dispatchers (nullable),   -- for dispatcher invoices
  companyId       VARCHAR(36) FK → Companies (nullable),     -- for direct company invoices
  billedTo        NVARCHAR(500) NULL,
  billedEmail     NVARCHAR(255) NULL,
  createdAt       DATETIME2,
  updatedAt       DATETIME2,
  UNIQUE (organizationId, invoiceNumber)
)
```

**Invoice Rules:**
- At least one of `dispatcherId` or `companyId` must be provided
- An invoice is scoped to a single dispatcher or company
- Status flow: `CREATED` → `RAISED` → `RECEIVED`

### 5.13 Jobs

Individual work records. The central entity connecting drivers, units, dispatchers, and job types.

```sql
Jobs (
  id              VARCHAR(36) PK,
  organizationId  VARCHAR(36) FK → Organizations (CASCADE),
  jobDate         DATE NOT NULL,
  jobTypeId       VARCHAR(36) FK → JobTypes NOT NULL,
  driverId        VARCHAR(36) FK → Drivers (nullable),
  dispatcherId    VARCHAR(36) FK → Dispatchers (nullable),
  unitId          VARCHAR(36) FK → Units (nullable),
  carrierId       VARCHAR(36) FK → Carriers (nullable),      -- if subcontracted to a carrier
  sourceType      NVARCHAR(20) DEFAULT 'DISPATCHED',          -- DISPATCHED | DIRECT
  weight          NVARCHAR(MAX) NULL,
  loads           INT NULL,
  startTime       NVARCHAR(20) NULL,       -- e.g. "08:00"
  endTime         NVARCHAR(20) NULL,       -- e.g. "16:30"
  amount          DECIMAL(18,2) NULL,       -- total job revenue
  carrierAmount   DECIMAL(18,2) NULL,       -- amount paid to carrier (if subcontracted)
  ticketIds       NVARCHAR(MAX) NULL,       -- comma-separated ticket/BOL numbers
  driverPaid      BIT DEFAULT 0,
  createdAt       DATETIME2,
  updatedAt       DATETIME2
)
```

**Job Source Types:**
- `DISPATCHED` – Job comes from an external dispatcher. `dispatcherId` is set.
- `DIRECT` – Company contacts 5Rivers directly. 5Rivers may use own drivers or subcontract via `carrierId`.

### 5.14 JobInvoice

Associates jobs with invoices. A job can only be on **one** invoice at a time.

```sql
JobInvoice (
  jobId           VARCHAR(36) PK FK → Jobs (CASCADE),
  invoiceId       VARCHAR(36) FK → Invoices (NO ACTION),
  amount          DECIMAL(18,2) NOT NULL,    -- invoiced amount for this job
  addedAt         DATETIME2
)
```

**Validation Rules:**
- `jobId` is the primary key → a job can only appear on one invoice
- Dispatcher invoices: job's `dispatcherId` must match invoice's `dispatcherId`
- Company invoices: only `DIRECT` sourceType jobs can be added
- Cannot add a job that is already on another invoice (clean error message)

### 5.15 Images

Job-related file attachments stored as binary data.

```sql
Images (
  id              VARCHAR(36) PK,
  jobId           VARCHAR(36) FK → Jobs (CASCADE),
  content         VARBINARY(MAX) NOT NULL,   -- binary file data
  contentType     NVARCHAR(100) NOT NULL,    -- MIME type
  fileName        NVARCHAR(500) NULL,
  createdAt       DATETIME2
)
```

### 5.16 DriverPayment

Records of payments made to drivers.

```sql
DriverPayment (
  id              VARCHAR(36) PK,
  driverId        VARCHAR(36) FK → Drivers (CASCADE),
  organizationId  VARCHAR(36) FK → Organizations (NO ACTION),
  amount          DECIMAL(18,2) NOT NULL,
  paidAt          DATE NOT NULL,
  paymentMethod   NVARCHAR(50) DEFAULT 'OTHER',  -- CASH | CHECK | BANK_TRANSFER | E_TRANSFER | OTHER
  reference       NVARCHAR(500) NULL,             -- check number, transfer ref, etc.
  notes           NVARCHAR(500) NULL,
  createdAt       DATETIME2,
  updatedAt       DATETIME2
)
```

### 5.17 JobDriverPay

Per-job driver pay assignment. Links a specific pay amount to a job and optionally to a DriverPayment.

```sql
JobDriverPay (
  jobId           VARCHAR(36) PK FK → Jobs (CASCADE),
  driverId        VARCHAR(36) FK → Drivers (NO ACTION),
  amount          DECIMAL(18,2) NOT NULL,    -- what the driver earns for this job
  paidAt          DATETIME2 NULL,            -- when marked as paid
  paymentId       VARCHAR(36) FK → DriverPayment (NO ACTION, nullable),
  createdAt       DATETIME2
)
```

### 5.18 CarrierPayments

Payment tracking for carriers (parallel structure to DriverPayment).

```sql
CarrierPayments (
  id              VARCHAR(36) PK,
  carrierId       VARCHAR(36) FK → Carriers (CASCADE),
  organizationId  VARCHAR(36) FK → Organizations (NO ACTION),
  amount          DECIMAL(18,2) NOT NULL,
  paidAt          DATE NOT NULL,
  paymentMethod   NVARCHAR(50) DEFAULT 'OTHER',  -- CASH | CHECK | BANK_TRANSFER | E_TRANSFER | OTHER
  reference       NVARCHAR(500) NULL,
  notes           NVARCHAR(500) NULL,
  createdAt       DATETIME2,
  updatedAt       DATETIME2
)
```

### Entity Relationship Summary

```
Organization ──┬── Companies ──── JobTypes
               ├── Drivers ────── DriverJobTypeRate ──→ JobTypes
               ├── Dispatchers
               ├── Units ──────── UnitEvents
               ├── Carriers ───── CarrierPayments
               ├── Jobs ─────────┬── JobInvoice ──→ Invoices
               │                 ├── JobDriverPay ──→ DriverPayment
               │                 └── Images
               ├── Invoices
               ├── DriverPayment
               └── OrganizationMember ──→ Users
```

---

## 6. Authentication & Authorization

### Login Flow

```
POST /api/auth/login
Body: { email, password, organizationSlug }
Response: { token, user: { userId, email, organizationId, role }, expiresIn }
```

1. Find user by email
2. Verify password (bcrypt)
3. Find organization by slug
4. Verify user is a member of that organization
5. Issue JWT containing `{ userId, organizationId, role, email }`

### Token Usage

All protected endpoints require:
```
Authorization: Bearer <token>
```

### Roles

| Role | Description |
|---|---|
| `OWNER` | Full access, can manage members |
| `ADMIN` | Full access, can manage members |
| `DISPATCHER` | Standard operational access |
| `MEMBER` | Standard operational access |
| `VIEWER` | Read-only access |

### Super Admin

If `SUPER_ADMIN_EMAIL` env var is set and matches the logged-in user, they can access any organization via `X-Organization-Id` header override.

---

## 7. API Reference

All endpoints (except health and auth) require Bearer token. All list endpoints support pagination (`page`, `limit`), sorting (`sortBy`, `order`), and filtering (`filter_<column>=value`).

### Pagination Response Format

```json
{
  "data": [...],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

Default `limit`: 20. Maximum `limit`: 100.

### 7.1 Health

| Method | Path | Description |
|---|---|---|
| GET | `/health` | `{ status: "ok", timestamp }` |
| GET | `/health/db` | `{ status: "ok", database: "connected" }` or 503 |

### 7.2 Auth

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/auth/login` | `{ email, password, organizationSlug }` | `{ token, user, expiresIn }` |

### 7.3 Organizations (Super Admin Only)

| Method | Path | Description |
|---|---|---|
| GET | `/api/organizations` | List all organizations |

### 7.4 Members (OWNER/ADMIN only)

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/api/members` | – | List org members |
| POST | `/api/members` | `{ email, password?, name?, role }` | Add member (creates user if new) |
| PATCH | `/api/members/:userId` | `{ role?, name? }` | Update member |
| DELETE | `/api/members/:userId` | – | Remove member |

### 7.5 Companies

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/companies` | – | Sortable: name, description, email, phone, createdAt. Filterable: name, description, email, phone |
| GET | `/api/companies/:id` | – | |
| POST | `/api/companies` | `{ name, description?, website?, industry?, location?, size?, founded?, logo?, email?, phone? }` | `name` required |
| PATCH | `/api/companies/:id` | Partial body | |
| DELETE | `/api/companies/:id` | – | Cascades to JobTypes |

### 7.6 Drivers

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/drivers` | – | Sortable: name, description, email, phone, hourlyRate, percentageRate, payType, createdAt. Filterable: name, email, phone, payType |
| GET | `/api/drivers/:id` | – | |
| POST | `/api/drivers` | `{ name, description?, email?, phone?, payType?, hourlyRate?, percentageRate? }` | `name` required. Defaults: payType=HOURLY, hourlyRate=0, percentageRate=0 |
| PATCH | `/api/drivers/:id` | Partial body | |
| DELETE | `/api/drivers/:id` | – | Cascades to DriverJobTypeRate, JobDriverPay |

### 7.7 Dispatchers

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/dispatchers` | – | Sortable: name, email, phone, commissionPercent, createdAt. Filterable: name, email, phone |
| GET | `/api/dispatchers/:id` | – | |
| POST | `/api/dispatchers` | `{ name, description?, email?, phone?, commissionPercent? }` | `name` required |
| PATCH | `/api/dispatchers/:id` | Partial body | |
| DELETE | `/api/dispatchers/:id` | – | |

### 7.8 Units

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/units` | – | Sortable: name, description, color, plateNumber, vin, status, year, make, model, mileage, insuranceExpiry, lastMaintenanceDate, nextMaintenanceDate, createdAt. Filterable: name, plateNumber, vin, color, status, make, model |
| GET | `/api/units/:id` | – | |
| POST | `/api/units` | `{ name, description?, color?, plateNumber?, vin?, status?, year?, make?, model?, mileage?, insuranceExpiry?, lastMaintenanceDate?, nextMaintenanceDate? }` | `name` required. Default status: ACTIVE |
| PATCH | `/api/units/:id` | Partial body | |
| DELETE | `/api/units/:id` | – | Cascades to UnitEvents |

### 7.9 Job Types

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/job-types` | – | Optional `?companyId=` filter. Sortable: title, startLocation, endLocation, dispatchType, rateOfJob, createdAt. Filterable: title |
| GET | `/api/job-types/:id` | – | |
| POST | `/api/job-types` | `{ companyId, title, startLocation?, endLocation?, dispatchType?, rateOfJob? }` | `companyId` and `title` required |
| PATCH | `/api/job-types/:id` | Partial body | |
| DELETE | `/api/job-types/:id` | – | |

### 7.10 Jobs

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/jobs` | – | Sortable: jobDate, amount, sourceType, createdAt. Filterable: jobDate, amount, sourceType |
| GET | `/api/jobs/:id` | – | |
| POST | `/api/jobs` | `{ jobDate, jobTypeId, driverId?, dispatcherId?, unitId?, carrierId?, sourceType?, weight?, loads?, startTime?, endTime?, amount?, carrierAmount?, ticketIds?, driverPaid? }` | `jobDate` and `jobTypeId` required. Default sourceType: DISPATCHED |
| PATCH | `/api/jobs/:id` | Partial body | |
| DELETE | `/api/jobs/:id` | – | Cascades to JobInvoice, JobDriverPay, Images |

#### Job Images (sub-resource)

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/jobs/:id/images` | – | List image metadata |
| POST | `/api/jobs/:id/images` | multipart `file` field | 10MB limit. Returns metadata (no content) |
| GET | `/api/jobs/:id/images/:imageId` | – | Returns binary with Content-Type header |
| DELETE | `/api/jobs/:id/images/:imageId` | – | |

#### Job Driver Pay (sub-resource)

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/jobs/:id/driver-pay` | – | 404 if not set |
| PUT | `/api/jobs/:id/driver-pay` | `{ driverId, amount }` | Insert or update |
| PATCH | `/api/jobs/:id/driver-pay` | `{ paymentId }` | Mark as paid, links to DriverPayment |
| DELETE | `/api/jobs/:id/driver-pay` | – | Clear driver pay assignment |

### 7.11 Invoices

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/invoices` | – | Sortable: invoiceNumber, invoiceDate, status, billedTo, billedEmail, createdAt. Filterable: invoiceNumber, status, billedTo, billedEmail |
| GET | `/api/invoices/:id` | – | |
| POST | `/api/invoices` | `{ invoiceNumber, invoiceDate, dispatcherId?, companyId?, status?, billedTo?, billedEmail? }` | `invoiceNumber` + `invoiceDate` required. Must provide `dispatcherId` OR `companyId` (or both) |
| PATCH | `/api/invoices/:id` | Partial body | |
| DELETE | `/api/invoices/:id` | – | |

#### Invoice Jobs (sub-resource)

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/invoices/:id/jobs` | – | List jobs on this invoice |
| POST | `/api/invoices/:id/jobs` | `{ jobId, amount }` | Add job to invoice. Validates dispatcher/company match. Prevents duplicates. |
| PATCH | `/api/invoices/:id/jobs/:jobId` | `{ amount }` | Update invoiced amount |
| DELETE | `/api/invoices/:id/jobs/:jobId` | – | Remove job from invoice |

### 7.12 Driver Payments

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/api/driver-payments` | – | Optional `?driverId=` filter |
| GET | `/api/driver-payments/:id` | – | |
| POST | `/api/driver-payments` | `{ driverId, amount, paidAt, paymentMethod?, reference?, notes? }` | `driverId`, `amount`, `paidAt` required |
| PATCH | `/api/driver-payments/:id` | Partial body | |
| DELETE | `/api/driver-payments/:id` | – | |

### 7.13 Driver Pay Summary

| Method | Path | Description |
|---|---|---|
| GET | `/api/driver-pay` | Returns `{ drivers: DriverPaySummary[] }` |

**DriverPaySummary** structure:
```json
{
  "driverId": "uuid",
  "driverName": "string",
  "totalEarned": 0.00,
  "totalPaid": 0.00,
  "balance": 0.00,
  "jobs": [
    { "jobId", "jobDate", "jobTypeTitle", "amount", "paidAt", "paymentId" }
  ],
  "payments": [
    { "id", "amount", "paidAt", "paymentMethod", "reference" }
  ]
}
```

**Earning Calculation:**
- If a `JobDriverPay` record exists → uses that amount
- If no `JobDriverPay` but driver is assigned to job → uses `job.amount`

---

## 8. Services – Business Logic

Each service follows the same pattern:
- TypeScript interfaces for the entity, create input, update input
- `list*()` – Paginated list with sorting and filtering
- `get*ById()` – Single record lookup
- `create*()` – Insert with UUID generation
- `update*()` – Partial update (preserves unchanged fields)
- `delete*()` – Delete by id + organizationId

### Service-Specific Logic

| Service | Key Logic |
|---|---|
| `auth.service` | Password verification, JWT signing, org membership check, super-admin bypass |
| `jobInvoice.service` | Dispatcher/company match validation, cross-invoice duplicate prevention, sourceType check |
| `driverPay.service` | Aggregation across JobDriverPay + Jobs + DriverPayment tables, balance calculation |
| `jobDriverPay.service` | Insert-or-update pattern, mark-as-paid linking to DriverPayment |
| `image.service` | Binary storage/retrieval, content-type handling |
| `member.service` | Creates user if not exists, role management |

---

## 9. Business Domain & Concepts

### Operating Models

#### Model 1: Dispatched (Traditional)
```
External Dispatcher → assigns job → 5Rivers Driver completes it → Invoice raised to Dispatcher
```
- Job has `sourceType = 'DISPATCHED'` and `dispatcherId` set
- Invoice has `dispatcherId` set
- Dispatcher takes a commission (`commissionPercent`)

#### Model 2: Direct (Self-Dispatch)
```
Company contacts 5Rivers directly → 5Rivers assigns to own Driver OR subcontracts to Carrier
```
- Job has `sourceType = 'DIRECT'`, no `dispatcherId`
- If subcontracted: `carrierId` and `carrierAmount` are set
- Invoice has `companyId` set (direct to the company)
- 5Rivers keeps the full margin (no dispatcher commission)

### Financial Flow

**Revenue per Job:**
- `amount` = total job revenue (what the customer pays)

**Costs per Job:**
- Driver pay = `JobDriverPay.amount` or calculated from `hourlyRate`/`percentageRate`
- Dispatcher commission = `amount × dispatcherCommissionPercent / 100` (for DISPATCHED jobs)
- Carrier cost = `carrierAmount` (for subcontracted DIRECT jobs)

**Driver Balance:**
- `totalEarned` = sum of all JobDriverPay amounts + job amounts where no explicit pay is set
- `totalPaid` = sum of all DriverPayment amounts
- `balance` = `totalEarned - totalPaid` (positive = owed to driver)

### Invoice Lifecycle

1. **CREATED** – Invoice created, jobs can be added/removed
2. **RAISED** – Invoice sent to dispatcher/company
3. **RECEIVED** – Payment received

### Unit Lifecycle

- **ACTIVE** – In service, available for jobs
- **MAINTENANCE** – In shop for scheduled or unscheduled work
- **INACTIVE** – Temporarily out of service
- **RETIRED** – Permanently out of service

---

## 10. Testing

### Test Infrastructure

- **Framework:** Jest 29 + ts-jest + supertest
- **Test Type:** Integration tests against real SQL Server database
- **Graceful Skip:** If DB is unavailable, tests skip with a console warning

### Test Files

| File | Tests | Description |
|---|---|---|
| `db-connection.test.ts` | 1 | Database connectivity verification |
| `api.test.ts` | 73 | Original CRUD tests for all entities |
| `new-features.test.ts` | 109 | Comprehensive tests for new architecture features |

### Test Helpers (`helpers.ts`)

- `createTestOrgAndUser()` – Creates isolated test org + user + membership, returns auth token
- `deleteTestData(orgId, userId)` – Cascading cleanup of all test data in correct FK order
- Constants: `TEST_ORG_SLUG`, `TEST_USER_EMAIL`, `TEST_PASSWORD`

### Test Coverage by Feature (new-features.test.ts)

| Feature | Create | Read/List | Filter | Sort | Update | Delete | Validation |
|---|---|---|---|---|---|---|---|
| Driver Dual Pay | 4 | 4 | 2 | 1 | 3 | 3 | 2 (auth, required) |
| Unit Comprehensive | 4 | 4 | 4 | 2 | 5 | 3 | 2 (auth, required) |
| Job sourceType/Carrier | 4 | 4 | 2 | – | 4 | 3 | 3 (auth, required) |
| Invoice Direct | 5 | 3 | – | – | 5 | 3 | 4 (auth, required) |
| JobInvoice Validation | – | 3 | – | – | 2 | 2 | 8 (match, dupe, source) |

### Running Tests

```bash
npm test                                    # All tests
npx jest --runInBand src/__tests__/new-features.test.ts   # New feature tests only
npx jest --runInBand -- db-connection       # DB connectivity only
```

---

## 11. Scripts & Migrations

### Schema Application

`npm run db:schema` runs `scripts/apply-schema.ts` which executes `scripts/schema.sql`. This is **destructive** – it drops and recreates all tables.

### Migrations

`npm run db:migrate` runs `scripts/apply-migrations.ts` which applies SQL files from `scripts/migrations/` in order.

| Migration | Description |
|---|---|
| `001-driver-payment-tracking.sql` | Added paymentMethod, notes, updatedAt to DriverPayment |
| `002-dual-driver-pay-units-carriers.sql` | Added payType/percentageRate to Drivers, DriverJobTypeRate table, comprehensive Unit fields, UnitEvents table, Carriers table, CarrierPayments table, sourceType/carrierId/carrierAmount to Jobs, companyId to Invoices, made dispatcherId nullable on Invoices |

### Indexes

All foreign key columns and frequently queried columns are indexed. Key indexes:

```
IX_Companies_organizationId, IX_JobTypes_companyId,
IX_Drivers_organizationId, IX_DriverJobTypeRate_driverId, IX_DriverJobTypeRate_jobTypeId,
IX_Dispatchers_organizationId, IX_Units_organizationId,
IX_UnitEvents_unitId, IX_UnitEvents_organizationId, IX_UnitEvents_eventDate,
IX_Carriers_organizationId,
IX_Invoices_organizationId, IX_Invoices_dispatcherId, IX_Invoices_companyId,
IX_Jobs_organizationId, IX_Jobs_jobDate, IX_Jobs_jobTypeId, IX_Jobs_carrierId, IX_Jobs_sourceType,
IX_JobInvoice_invoiceId, IX_Images_jobId,
IX_DriverPayment_driverId, IX_DriverPayment_organizationId,
IX_JobDriverPay_driverId, IX_JobDriverPay_paidAt,
IX_CarrierPayments_carrierId, IX_CarrierPayments_organizationId
```
