# Backend & Neo4j Architecture

This document describes the backend and Neo4j integration. **No data-loss changes** are made without explicit backups and migration steps.

---

## Data layer

### Neo4jService (`src/database/neo4j.ts`)

- **Single driver instance** per process (`neo4jService`). All app code should use this singleton; do not create extra `Neo4jService()` instances for normal request handling.
- **Database**: Sessions use `config.neo4j.database` (default `neo4j`). Override via `NEO4J_DATABASE` for multi-database setups.
- **APIs**:
  - `runQuery(cypher, params)` – run a query, get records as plain objects. Session is opened and closed per call.
  - `executeTransaction(tx => ...)` – run multiple writes in one transaction (atomic). Use for create/update/delete that must succeed or roll back together.
  - `readTransaction(tx => ...)` – run multiple reads in one transaction (consistent snapshot).
- **Integers**: Use `neo4j.int()` for Cypher integer parameters where required (e.g. `loads`, `limit`, `offset`).

### Indexes (`src/database/ensureIndexes.ts`)

- All indexes use **IF NOT EXISTS**. Safe to run on every startup; no indexes or data are dropped.
- Covers: Company, Job, Invoice, Driver, Dispatcher, Unit, JobType (id and common filter fields).
- Called after `companyService.createIndexes()` in `index.express.ts`.

### Services and driver usage

- **CompanyService**: Uses shared `neo4jService` for all Cypher. Creates Company-specific indexes on startup.
- **CalculationService**: Uses shared `neo4jService` (imports singleton). Read-only usage.
- **PDFService**: Accepts optional `Neo4jService` in constructor; defaults to `neo4jService`. When used from GraphQL, pass `context.neo4jService` so the shared driver is used and `close()` is a no-op.
- **JobAmountValidationService**: Same as PDFService – optional constructor param, use `context.neo4jService` from resolvers.

---

## GraphQL

- **Resolvers** (`src/schema/resolvers.ts`): Most Cypher lives inline in resolvers. Context provides `neo4jService`, `companyService`, and `user`.
- **Writes**: `createJob` (and any multi-step create/update that should be atomic) use `neo4jService.executeTransaction()` so the main create and relationship creates commit or roll back together. Calculated fields (e.g. `calculatedAmount`) are set after the transaction in separate queries.
- **Reads**: Use `neo4jService.runQuery()` or, for multi-step reads that should see a consistent snapshot, `readTransaction()`.

---

## Data safety

- **No destructive migrations by default**: Scripts and startup logic do not drop nodes, relationships, or indexes unless explicitly designed as a one-off migration with backups.
- **Indexes**: Only `CREATE INDEX ... IF NOT EXISTS` (and equivalent) are used at startup. No `DROP INDEX` or index replacement without a documented migration.
- **Transactions**: Multi-step writes that create a node and relationships are wrapped in `executeTransaction` to avoid partial writes on failure.
- **Backups**: For schema or data migrations, back up Neo4j (e.g. `neo4j-admin backup`) before running scripts that change or delete data.

---

## Database optimizations (applied)

- **Indexes** (`ensureIndexes.ts`): Added `job_driver_paid_index`, `job_job_date_invoice_status_index` (composite), `invoice_invoice_date_index`, `invoice_status_index` for faster filters and date-range queries.
- **Constraints** (`ensureConstraints.ts`): Uniqueness on node `id` (Company, Driver, Dispatcher, Unit, JobType, Job, Invoice, StoredImage) and on `Invoice.invoiceNumber`. Run at startup (non-fatal if duplicates exist).
- **Relationship consistency**: Resolvers use **HAS_JOB_TYPE** only for Company–JobType (no BELONGS_TO). Dashboard and recent jobs use **MANAGED_BY** and **ASSIGNED_TO** (no DISPATCHED/DROVE). **Job.invoice** uses INVOICED_IN first, HAS_INVOICE fallback for legacy data.
- **Migration** (`npm run migrate-invoice-rels`): For each Job–Invoice link that has HAS_INVOICE but no INVOICED_IN, creates INVOICED_IN so one relationship is canonical. Back up Neo4j before running.

See `docs/DATABASE_AUDIT.md` for the full checklist and target schema.

---

## Future improvements (non-destructive)

- **Repository layer**: Move Cypher from resolvers into repositories (e.g. `JobRepository`, `InvoiceRepository`). Same queries and behavior; better testability and reuse. Can be done incrementally per entity.
- **More transactional writes**: Other mutations that do multiple `runQuery` calls (e.g. create invoice + lines) could be moved into `executeTransaction` for atomicity.
- **Read scaling**: For heavy read paths, consider `readTransaction` so multiple reads see a consistent snapshot without holding a long-lived session.
