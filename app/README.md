# 5rivers app (new)

Lean backend and frontend with **SQL Server**, **Organization** as root, and **Users + roles** per organization.

- **Data model:** [docs/DATA_MODEL_AND_CLEANUP.md](docs/DATA_MODEL_AND_CLEANUP.md)
- **Backend:** Node + Express + SQL Server (`app/backend`)

---

## Backend (`app/backend`)

### Prerequisites

- Node 18+
- SQL Server (local or remote) with a database (e.g. `FiveRivers`)

### Setup

1. **Install dependencies**

   ```bash
   cd app/backend
   npm install
   ```

2. **Configure environment**

   Copy `.env.example` to `.env` and set either:

   - **Option A – connection string**
     ```env
     DATABASE_URL=Server=localhost,1433;Database=FiveRivers;User Id=sa;Password=YourPassword;Encrypt=false;TrustServerCertificate=true
     ```

   - **Option B – separate variables**
     ```env
     SQLSERVER_SERVER=localhost
     SQLSERVER_PORT=1433
     SQLSERVER_DATABASE=FiveRivers
     SQLSERVER_USER=sa
     SQLSERVER_PASSWORD=YourPassword
     ```

   Optional: `PORT=4000` (default 4000).

3. **Create database**

   Create the database in SQL Server if it doesn’t exist (e.g. `CREATE DATABASE FiveRivers;`).

4. **Apply schema**

   ```bash
   npm run db:create
   ```

   This runs `src/db/schema.sql` (Users, Organizations, OrganizationMember, Companies, JobTypes, Drivers, Dispatchers, Units, Invoices, Jobs, JobInvoice). Safe to run once; re-running may fail on index creation if tables already exist.

5. **Run the server**

   ```bash
   npm run dev
   ```

   - **Health:** [http://localhost:4000/health](http://localhost:4000/health)  
   - **DB check:** [http://localhost:4000/health/db](http://localhost:4000/health/db)

### Scripts

| Script       | Description                    |
|-------------|---------------------------------|
| `npm run dev`   | Start with ts-node-dev (watch). |
| `npm run build` | Compile TypeScript to `dist/`.  |
| `npm run start` | Run `node dist/index.js`.      |
| `npm run db:create` | Apply SQL Server schema.   |

---

## Login flow (from data model)

1. User selects **organization** (e.g. by slug or list).
2. User enters **email** and **password**.
3. Backend validates credentials and that the user is in **OrganizationMember** for that org; returns session with `userId`, `organizationId`, `role`.
4. All API calls are scoped by `organizationId`.

Auth endpoints and frontend will be added in a follow-up; the schema and backend health are in place to proceed.
