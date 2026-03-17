# 5rivers.server – Schema & API Reference for Frontend

This document describes the **database schema** and **REST API** so another agent or developer can implement the frontend against this backend.

## Sample login credentials

After running the database schema and seed script (`npm run db:schema` then `npm run db:seed`), you can log in with:

| Field | Value |
|-------|--------|
| **email** | `demo@5rivers.app` |
| **password** | `Demo123!` |
| **organizationSlug** | `demo` |

Use these in `POST /api/auth/login` for local or demo testing.

### Migrated data not appearing?

All list APIs return only rows whose **organizationId** matches the organization in your JWT (from login). If you migrated data from another system, those rows likely have a different **organizationId**, so they are filtered out.

**Fix:** Assign every organization-scoped row to the demo org so they show when you log in with `organizationSlug: demo`:

1. Ensure the demo org and user exist: run `npm run db:seed` in 5rivers.server.
2. Run `npm run db:assign-demo` in 5rivers.server. This sets `organizationId` to the demo organization’s id on Companies, Drivers, Dispatchers, Units, Invoices, Jobs, and DriverPayment. (Or run the SQL script `scripts/assign-migrated-data-to-demo-org.sql` manually.)
3. Log in with **email** `demo@5rivers.app`, **password** `Demo123!`, **organizationSlug** `demo`.

If you use a different organization (not demo), use that org’s `id` from the Organizations table in the same way: set all migrated rows’ `organizationId` to that id, and log in with that org’s **slug** as `organizationSlug`.

### Super-admin (check any org)

When the server has `SUPER_ADMIN_EMAIL` set, a user with that email can:

1. **Log in to any org** – Use `POST /api/auth/login` with that email, password, and **any** organization slug (they do not need to be a member of that org). The response includes `user.isSuperAdmin: true`.
2. **Switch organization** – Send header `X-Organization-Id: <org-uuid>` on any API request. The backend then scopes the request to that org. If the header is omitted, the org from the login (JWT) is used.
3. **List organizations** – `GET /api/organizations` (Bearer, super-admin only) returns `[{ id, name, slug }]` so the client can show an org switcher.

The frontend should: after login, if `user.isSuperAdmin`, call `GET /api/organizations` and allow the user to pick an org; then send `X-Organization-Id` with the selected org id on all subsequent requests until they switch again.

---

- **Base URL:** All API routes are under `/api` (e.g. `POST /api/auth/login`). Health routes are at `/health` and `/health/db`.
- **Auth:** Protected routes require header: `Authorization: Bearer <token>`.
- **Scope:** Every resource is scoped by **organization**. The JWT contains `organizationId`; the backend filters all data by it. The frontend does not send `organizationId` in request bodies for create/update.
- **Pagination:** List endpoints accept query params `?page=1&limit=20` (default 20, max 100). Response shape: `{ data: T[], total, page, limit, totalPages }`.
- **Sort:** Optional `?sortBy=<column>&order=asc|desc`. Column names are entity-specific (e.g. `name`, `email`, `jobDate`, `invoiceNumber`). Default sort varies by endpoint.
- **Filter:** Optional `?filter_<column>=<value>` (e.g. `filter_name=acme`). Value is matched with SQL `LIKE %value%` (case-sensitive). Supported columns vary by endpoint.
- **Errors:** JSON with `message` (and optional `statusCode`). 400 validation, 401 unauthorized, 403 forbidden, 404 not found, 500 server error.

---

## 1. Authentication

### POST /api/auth/login

**Auth:** No (public).

**Body (JSON):**
```json
{
  "email": "string",
  "password": "string",
  "organizationSlug": "string"
}
```

**Response 200:**
```json
{
  "token": "string (JWT)",
  "user": {
    "userId": "string (UUID)",
    "organizationId": "string (UUID)",
    "role": "OWNER | ADMIN | DISPATCHER | MEMBER | VIEWER",
    "email": "string",
    "isSuperAdmin": true
  },
  "expiresIn": "string (e.g. 7d)"
}
```
`isSuperAdmin` is present and `true` only when the server has `SUPER_ADMIN_EMAIL` set and the logging-in user's email matches it.

**Errors:** 400 if missing fields, 401 invalid credentials, 403 user not in organization.

Use `token` in `Authorization: Bearer <token>` for all other API requests.

---

## 2. Database Schema (Entities & Relationships)

All IDs are **UUIDs** (VARCHAR(36)). Dates are **ISO 8601**; API returns `paidAt` and `invoiceDate`/`jobDate` as **date-only strings** `YYYY-MM-DD` where applicable.

### Core / auth (backend-managed)

| Table | Purpose |
|-------|--------|
| **Users** | id, email, passwordHash, name, createdAt, updatedAt |
| **Organizations** | id, name, slug, settings, createdAt, updatedAt |
| **OrganizationMember** | userId, organizationId, role (OWNER, ADMIN, DISPATCHER, MEMBER, VIEWER), createdAt |

### Business entities (all have organizationId except JobTypes which use companyId)

| Table | Key fields | Notes |
|-------|------------|--------|
| **Companies** | id, organizationId, name, description, website, industry, location, size, founded, logo, email, phone, createdAt, updatedAt | Belongs to org. |
| **JobTypes** | id, companyId, title, startLocation, endLocation, dispatchType, rateOfJob, createdAt, updatedAt | Belongs to Company. |
| **Drivers** | id, organizationId, name, description, email, phone, hourlyRate, createdAt, updatedAt | Org-scoped. |
| **Dispatchers** | id, organizationId, name, description, email, phone, commissionPercent, createdAt, updatedAt | Org-scoped. |
| **Units** | id, organizationId, name, description, color, plateNumber, vin, createdAt, updatedAt | Vehicles/units. |
| **Invoices** | id, organizationId, invoiceNumber, invoiceDate, status, dispatcherId, billedTo, billedEmail, createdAt, updatedAt | status: CREATED, RAISED, RECEIVED. |
| **Jobs** | id, organizationId, jobDate, jobTypeId, driverId?, dispatcherId?, unitId?, weight, loads, startTime, endTime, amount, ticketIds, driverPaid, createdAt, updatedAt | jobDate = DATE. Optional driver/dispatcher/unit. |
| **JobInvoice** | jobId (PK), invoiceId, amount, addedAt | Links Job to Invoice with line amount. |
| **Images** | id, jobId, content (binary), contentType, fileName, createdAt | Stored in DB (VARBINARY). |
| **DriverPayment** | id, driverId, organizationId, amount, paidAt (DATE), paymentMethod, reference, notes, createdAt, updatedAt | paymentMethod: CASH, CHECK, BANK_TRANSFER, E_TRANSFER, OTHER. |
| **JobDriverPay** | jobId (PK), driverId, amount, paidAt, paymentId?, createdAt | Per-job driver pay; optional link to DriverPayment when paid. |

### Relationships (for UI / dropdowns)

- **JobTypes** → Company (companyId).
- **Jobs** → JobType (jobTypeId), optional Driver, Dispatcher, Unit.
- **Invoices** → Dispatcher (dispatcherId).
- **Invoice lines** → Job + amount (JobInvoice: jobId, invoiceId, amount).
- **Job images** → Job (jobId).
- **DriverPayment** → Driver (driverId).
- **JobDriverPay** → Job (jobId), Driver (driverId), optional DriverPayment (paymentId).

---

## 3. API Endpoints Summary

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /health | No | Liveness |
| GET | /health/db | No | DB connectivity |
| POST | /api/auth/login | No | Login → token + user |
| GET | /api/organizations | Bearer (super-admin only) | List all orgs (id, name, slug) for org switcher |
| GET | /api/members | Bearer (OWNER/ADMIN) | List members of current org |
| POST | /api/members | Bearer (OWNER/ADMIN) | Add member (body: email, password?, name?, role); create user if new |
| PATCH | /api/members/:userId | Bearer (OWNER/ADMIN) | Update member role and/or name |
| DELETE | /api/members/:userId | Bearer (OWNER/ADMIN) | Remove member from org |
| GET | /api/companies | Bearer | List companies (paginated) |
| GET | /api/companies/:id | Bearer | Get company |
| POST | /api/companies | Bearer | Create company |
| PATCH | /api/companies/:id | Bearer | Update company |
| DELETE | /api/companies/:id | Bearer | Delete company |
| GET | /api/drivers | Bearer | List drivers (paginated) |
| GET | /api/drivers/:id | Bearer | Get driver |
| POST | /api/drivers | Bearer | Create driver |
| PATCH | /api/drivers/:id | Bearer | Update driver |
| DELETE | /api/drivers/:id | Bearer | Delete driver |
| GET | /api/dispatchers | Bearer | List dispatchers (paginated) |
| GET | /api/dispatchers/:id | Bearer | Get dispatcher |
| POST | /api/dispatchers | Bearer | Create dispatcher |
| PATCH | /api/dispatchers/:id | Bearer | Update dispatcher |
| DELETE | /api/dispatchers/:id | Bearer | Delete dispatcher |
| GET | /api/units | Bearer | List units (paginated) |
| GET | /api/units/:id | Bearer | Get unit |
| POST | /api/units | Bearer | Create unit |
| PATCH | /api/units/:id | Bearer | Update unit |
| DELETE | /api/units/:id | Bearer | Delete unit |
| GET | /api/job-types | Bearer | List job types (optional ?companyId=), paginated |
| GET | /api/job-types/:id | Bearer | Get job type |
| POST | /api/job-types | Bearer | Create job type |
| PATCH | /api/job-types/:id | Bearer | Update job type |
| DELETE | /api/job-types/:id | Bearer | Delete job type |
| GET | /api/jobs | Bearer | List jobs (paginated) |
| GET | /api/jobs/:id | Bearer | Get job |
| POST | /api/jobs | Bearer | Create job |
| PATCH | /api/jobs/:id | Bearer | Update job |
| DELETE | /api/jobs/:id | Bearer | Delete job |
| GET | /api/jobs/:id/images | Bearer | List image metadata for job |
| POST | /api/jobs/:id/images | Bearer | Upload image (multipart, field: file) |
| GET | /api/jobs/:id/images/:imageId | Bearer | Get image binary (Content-Type set) |
| DELETE | /api/jobs/:id/images/:imageId | Bearer | Delete image |
| GET | /api/jobs/:id/driver-pay | Bearer | Get job driver pay (404 if not set) |
| PUT | /api/jobs/:id/driver-pay | Bearer | Set driver + amount |
| PATCH | /api/jobs/:id/driver-pay | Bearer | Mark as paid (link paymentId) |
| DELETE | /api/jobs/:id/driver-pay | Bearer | Clear job driver pay |
| GET | /api/invoices | Bearer | List invoices (paginated) |
| GET | /api/invoices/:id | Bearer | Get invoice |
| POST | /api/invoices | Bearer | Create invoice |
| PATCH | /api/invoices/:id | Bearer | Update invoice |
| DELETE | /api/invoices/:id | Bearer | Delete invoice |
| GET | /api/invoices/:id/jobs | Bearer | List jobs on invoice (JobInvoice lines) |
| POST | /api/invoices/:id/jobs | Bearer | Add job to invoice (jobId, amount) |
| PATCH | /api/invoices/:id/jobs/:jobId | Bearer | Update line amount |
| DELETE | /api/invoices/:id/jobs/:jobId | Bearer | Remove job from invoice |
| GET | /api/driver-pay | Bearer | Driver pay summary: per-driver earned, paid, balance, jobs, payments (for Driver Pay view) |
| GET | /api/driver-payments | Bearer | List driver payments (optional ?driverId=), paginated |
| GET | /api/driver-payments/:id | Bearer | Get driver payment |
| POST | /api/driver-payments | Bearer | Create driver payment |
| PATCH | /api/driver-payments/:id | Bearer | Update driver payment |
| DELETE | /api/driver-payments/:id | Bearer | Delete driver payment |

---

## 4. Request/Response Shapes (Create & Update)

### Companies

- **POST body:** `{ name (required), description?, website?, industry?, location?, size?, founded?, logo?, email?, phone? }`
- **PATCH body:** same fields (partial); id in URL.

### Drivers

- **POST body:** `{ name (required), description?, email?, phone?, hourlyRate? }`
- **PATCH body:** partial; id in URL.

### Dispatchers

- **POST body:** `{ name (required), description?, email?, phone?, commissionPercent? }`
- **PATCH body:** partial; id in URL.

### Units

- **POST body:** `{ name (required), description?, color?, plateNumber?, vin? }`
- **PATCH body:** partial; id in URL.

### Job types

- **POST body:** `{ companyId (required), title (required), startLocation?, endLocation?, dispatchType?, rateOfJob? }`
- **PATCH body:** partial; id in URL.

### Jobs

- **POST body:** `{ jobDate (required, YYYY-MM-DD), jobTypeId (required), driverId?, dispatcherId?, unitId?, weight?, loads?, startTime?, endTime?, amount?, ticketIds? }`
- **PATCH body:** partial; id in URL.

### Invoices

- **POST body:** `{ invoiceNumber (required), invoiceDate (required, YYYY-MM-DD), dispatcherId (required), status?, billedTo?, billedEmail? }` — status defaults to CREATED if not sent.
- **PATCH body:** partial; id in URL.

### Invoice jobs (lines)

- **POST /api/invoices/:id/jobs body:** `{ jobId (required), amount (required, number) }` → 201, returns line (jobId, invoiceId, amount, addedAt).
- **PATCH /api/invoices/:id/jobs/:jobId body:** `{ amount (required, number) }`.

### Job images

- **POST /api/jobs/:id/images:** `multipart/form-data`, field name **file** (max 10MB). Response 201: `{ id, jobId, contentType, fileName, createdAt }` (no binary in JSON).
- **GET /api/jobs/:id/images/:imageId:** returns binary; `Content-Type` and optional `Content-Disposition` set.

### Job driver pay

- **PUT /api/jobs/:id/driver-pay body:** `{ driverId (required), amount (required, number) }` → creates/overwrites job driver pay.
- **PATCH /api/jobs/:id/driver-pay body:** `{ paymentId (required) }` → links existing DriverPayment to this job’s driver pay (marks as paid).

### Driver payments

- **POST body:** `{ driverId (required), amount (required), paidAt (required, YYYY-MM-DD), paymentMethod?, reference?, notes? }` — paymentMethod one of: CASH, CHECK, BANK_TRANSFER, E_TRANSFER, OTHER (default OTHER).
- **PATCH body:** `{ amount?, paidAt?, paymentMethod?, reference?, notes? }` (partial).
- **List GET:** optional query `?driverId=<uuid>` to filter by driver.

---

## 5. Pagination & list responses

For **GET** list endpoints (companies, drivers, dispatchers, units, job-types, jobs, invoices, driver-payments):

- Query: `?page=1&limit=20` (default page 1, limit 20; max limit 100).
- Response:
```json
{
  "data": [ /* array of entities */ ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

Single-entity GET (e.g. GET /api/companies/:id) returns the entity object directly.

---

## 6. Enums / allowed values

- **Invoice status:** CREATED, RAISED, RECEIVED
- **Driver payment method:** CASH, CHECK, BANK_TRANSFER, E_TRANSFER, OTHER
- **Organization member role:** OWNER, ADMIN, DISPATCHER, MEMBER, VIEWER

### Members (admin)

- **GET /api/members** returns an array of `{ userId, organizationId, role, email, name, createdAt }` for the current org. Requires OWNER or ADMIN.
- **POST /api/members** body: `{ email (required), password? (required when creating new user), name?, role (required, one of OWNER/ADMIN/DISPATCHER/MEMBER/VIEWER) }`. If the email already exists as a user, adds them to the org; otherwise creates the user then adds them.
- **PATCH /api/members/:userId** body: `{ role?, name? }` (partial). Updates the member’s role in the org and/or the user’s display name.
- **DELETE /api/members/:userId** removes the member from the current org (does not delete the user).

---

## 7. Frontend implementation notes

1. **Login:** Call `POST /api/auth/login` with email, password, organizationSlug. Store `token` and optionally `user`; send `Authorization: Bearer <token>` on every request. Handle 401 (e.g. redirect to login or refresh token if you add refresh later).
2. **Organization context:** The backend uses the JWT’s organizationId. If the app supports multiple orgs, the login flow must collect `organizationSlug` (or preselect it) so the correct org is used.
3. **Create flows:** Companies first; then JobTypes (need companyId); then Jobs (jobTypeId), Invoices (dispatcherId). Driver payments need driverId; job driver pay needs a job and optionally a driver payment to mark as paid.
4. **Images:** Upload with multipart form (field `file`). To display, use GET job image URL; response is binary with Content-Type so it can be used in `<img src="...">` or download.
5. **Dates:** Send and display jobDate, invoiceDate, paidAt as YYYY-MM-DD. The API returns paidAt and similar date fields as date-only strings.
6. **Delete:** DELETE returns 204 No Content on success; 404 if resource not found or not in org.

Use this document as the single source of truth for entity shapes, relationships, and API contracts when building the frontend.
