# 5rivers.server

REST API server for 5rivers – SQL Server, organization-scoped, JWT auth. Clean structure and best practices.

## Stack

- **Node 18+**, **TypeScript**, **Express**
- **SQL Server** (same schema as `app/backend` – run that schema first)
- **JWT** auth; login with **email + password + organizationSlug**
- **REST** (no GraphQL); all data scoped by `organizationId` from token

## Structure

```
src/
├── index.ts              # Entry: start server, shutdown
├── app.ts                 # Express app: CORS, JSON, routes, error handler
├── config/                # Env config
├── db/                    # SQL Server connection, query helper
├── middleware/            # Auth, error handler (AppError)
├── routes/                # Health, auth, companies (template)
├── services/              # Auth, company (business logic)
├── types/                 # Shared types, express.d.ts (req.user)
└── utils/                 # asyncHandler
```

## Setup

1. **Database**: Use the schema in `app/backend` (run `npm run db:create` there). Point this app to the same DB.

2. **Env**: Copy `.env.example` to `.env`. Set connection and `JWT_SECRET`.

   **Named instance** (e.g. `Dhillon-HP\MSSQL2025`):
   ```env
   SQLSERVER_SERVER=Dhillon-HP
   SQLSERVER_INSTANCE=MSSQL2025
   SQLSERVER_DATABASE=FiveRivers
   SQLSERVER_USER=sa
   SQLSERVER_PASSWORD=yourpassword
   ```
   The app uses `server` + `options.instanceName` (recommended for named instances). If the connection times out, start the **SQL Server Browser** service (Windows Services), or use a **direct TCP port**: in SQL Server Configuration Manager → MSSQL2025 → TCP/IP → IP Addresses, note the TCP Port (e.g. 1433 or 49152). Then set `SQLSERVER_SERVER=localhost`, `SQLSERVER_PORT=thatport` and leave `SQLSERVER_INSTANCE` unset. Optional: `SQLSERVER_CONNECTION_TIMEOUT=60000` (ms).

3. **Install and run**:
   ```bash
   npm install
   npm run dev
   ```

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /health | No | Liveness |
| GET | /health/db | No | DB connectivity |
| POST | /api/auth/login | No | Body: `{ email, password, organizationSlug }` → `{ token, user, expiresIn }` |
| GET | /api/companies | Bearer | List companies (org-scoped), query: `?page=&limit=` |
| GET | /api/companies/:id | Bearer | Get company |
| POST | /api/companies | Bearer | Create company |
| PATCH | /api/companies/:id | Bearer | Update company |
| DELETE | /api/companies/:id | Bearer | Delete company |

Protected routes require header: `Authorization: Bearer <token>`.

## Practices

- **Layering**: Routes → services → db; no business logic in routes.
- **Errors**: Throw `AppError` (or use `notFound()`, `badRequest()`, etc.); central `errorHandler` returns JSON.
- **Async**: All async route handlers wrapped with `asyncHandler()` so rejections go to error handler.
- **Org scope**: `req.user.organizationId` set from JWT; every service receives it and filters by it.
- **Pagination**: `normalizePagination()` with default 20, max 100 per page.

## Tests

```bash
npm test
```

- **Requires:** SQL Server running with the schema applied (same as dev). Set `DATABASE_URL` or SQLSERVER_* in `.env`.
- **Runs:** Integration tests (Jest + Supertest) for health, auth, and companies.
- **Cleanup:** After all tests, `afterAll` removes all test data: companies created under the test organization, the test organization membership, the test organization, and the test user. No test data is left in the database.

If the database is not available, `beforeAll` catches the error and skips DB-dependent tests; `afterAll` still runs safely without deleting anything.
