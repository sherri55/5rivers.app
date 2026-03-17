# 5rivers.app – Revamp & Migration Options

This document reviews your current stack and structure, then suggests the best options for revamping the site and migrating data.

---

## 1. Current Stack (Corrected)

Your app is **not** Next.js. Here’s what you actually have:

| Layer | Current stack |
|-------|----------------|
| **Frontend** | **Vite 5** + React 18, React Router 6, Apollo Client, GraphQL, Tailwind, Radix/shadcn, Lucide |
| **Backend** | **Node** (Express 5) + **Apollo Server 4** + **Neo4j** (graph DB), JWT auth |
| **API** | GraphQL at `/graphql`; REST for `/api/auth/*`, `/api/upload`, `/api/images/:id` |
| **Data** | Neo4j only (migrated from SQLite); images stored in Neo4j via `imageStorageService` |

So: **Vite/React + Node/Neo4j**. No Next.js.

---

## 2. Current Structure Summary

### Backend (`5rivers.app.backend`)

- **Entry**: `index.express.ts` – Express app with CORS, auth routes, multer upload, image serve, Apollo middleware.
- **Data**: Single `neo4jService` singleton; indexes via `ensureIndexes` + `companyService.createIndexes()`.
- **GraphQL**: `typeDefs.ts` + `resolvers.ts` (Cypher mostly inline in resolvers); context has `neo4jService`, `companyService`, `user`.
- **Auth**: JWT via `authRoutes` + `authMiddleware`; optional `ADMIN_PASSWORD_HASH` for production.
- **Domain**: Company, Driver, Dispatcher, Unit, JobType, Job, Invoice, DriverRate, JobInvoiceRelation; dashboard/stats, PDF generation, job amount validation, image storage.

### Frontend (`5rivers.app.frontend`)

- **Entry**: `main.tsx` → ErrorBoundary → AuthProvider → ApolloProvider → BrowserRouter → App (LoginModal or Layout + routes).
- **Routes**: Lazy-loaded; `/`, `/companies`, `/drivers`, `/units`, `/fleet`, `/dispatchers`, `/jobs`, `/job-types`, `/invoices`, `/reports`, `*`.
- **Data**: Apollo Client; config in `lib/config.ts`; GraphQL in `lib/graphql/*` and `features/jobs/api`; upload in `lib/services/imageUpload.ts`.
- **Patterns**: Feature-based (auth, jobs); shared Layout, modals, UI (Radix/shadcn); calculations in `lib/calculations`, types in `lib/types`.

### Frontend.new (`5rivers.app.frontend.new`)

- **Purpose**: New UI shell (Lovable-style) with **mock data** and **Gemini Assistant**.
- **Stack**: React 19, Vite 6, Tailwind, Material Symbols; **state-based navigation** (no React Router); **no GraphQL, no auth**.
- **Views**: Dashboard, JobsHub, Fleet, Billing, Invoices, Reports, Companies, JobTypes, CreateJob, CreateDriver, CreateCompany.

Your existing **MIGRATION_REVIEW.md** already describes how to wire frontend.new to the real backend (Apollo + auth + replace mocks).

---

## 3. Data “Migration” – What It Means Here

- **Neo4j is already the source of truth.** You’re not moving from SQLite to Neo4j again; that’s done.
- **“Migrating data”** in a revamp means:
  - Keeping the same backend and Neo4j.
  - Any new frontend (or redesigned UI) **consumes the same GraphQL + REST API**.
- So there’s **no separate ETL or DB migration** for the revamp—only optional **data cleanup or schema evolution** (e.g. new fields) if you want it.

---

## 4. Options for Your Use Case

You want to: **revamp the full website**, **migrate existing data** (use it in the new UI), and **redesign the front end**.

### A. Frontend framework

| Option | Pros | Cons | Fit for you |
|--------|------|------|-------------|
| **Keep Vite + React (current)** | No rewrite; same mental model; fast builds; already integrated (Apollo, auth, upload). | No SSR/SSG out of the box (you don’t need it for an internal app). | **Best fit** – you already have it and it works. |
| **Next.js (App Router)** | SSR, file-based routing, good ecosystem. | Bigger change; duplicate “API” if you keep Node backend; learning curve if new. | Only if you need SEO or true SSR for public pages. |
| **Remix** | Strong data/loaders story, progressive. | Smaller ecosystem; another migration. | Optional if you prefer Remix patterns; not required. |

**Recommendation:** **Stay on Vite + React** for the revamp. Your app is an authenticated dashboard; Vite is simpler and your stack is already aligned. Use Next.js only if you add public, SEO-heavy pages later.

### B. Where to do the redesign

| Option | Description | Effort | Outcome |
|--------|-------------|--------|---------|
| **1. In-place (current frontend)** | Redesign inside `5rivers.app.frontend`: new layout, components, pages; keep Apollo, auth, routes. | Medium | One codebase; incremental redesign. |
| **2. In-place in frontend.new** | Add Apollo + auth + config to `5rivers.app.frontend.new`, replace mocks with GraphQL per view (as in MIGRATION_REVIEW). | Medium | New UI + Gemini Assistant; one “new” codebase. |
| **3. New repo/folder, cherry-pick** | New app: take routing + auth + Apollo + GraphQL from current; take layout + views from frontend.new; wire views to API. | Higher | Clean slate; more merge/maintenance. |

**Recommendation:** **Option 2 – in-place in frontend.new** (same as MIGRATION_REVIEW strategy A). You get the new layout and UX (including Assistant) and a single codebase that talks to your existing backend; no need to move to Next.js.

### C. Backend

- **Keep Node + Express + Apollo + Neo4j.** The backend is documented (BACKEND_ARCHITECTURE.md), uses transactions and indexes safely, and already supports auth, uploads, and images. A “revamp” doesn’t require replacing it.
- **Optional improvements** (can be done later):
  - Extract Cypher into a repository layer (e.g. `JobRepository`, `InvoiceRepository`) for clarity and tests.
  - Add DataLoader if you see N+1 on lists.
  - More granular resolvers (e.g. by domain) for maintainability.

### D. Data migration (optional)

- **No mandatory migration:** New frontend just uses existing GraphQL and REST; Neo4j data stays as is.
- **If you want cleanup:** Run one-off scripts (e.g. validate amounts, normalize dates) against Neo4j with backups, as you already do. No change to the revamp plan.

---

## 5. Recommended Path (Summary)

1. **Frontend**
   - **Stack:** Vite + React (and optionally upgrade to Vite 6 in frontend.new).
   - **Redesign:** Do it **in `5rivers.app.frontend.new`**: add Apollo Client, auth (AuthProvider + LoginModal from current app), and `lib/config`; replace each mock (jobs, companies, drivers, units, invoices, job types, dashboard, reports) with the real GraphQL/API; keep the new layout, Sidebar, Navbar, and Gemini Assistant.
2. **Backend**
   - **Keep:** Node, Express, Apollo Server, Neo4j, current auth and upload APIs.
   - **Optional:** Add a repository layer and/or split resolvers later; no need for the revamp.
3. **Data**
   - **“Migration”:** Use existing Neo4j data via the same API; no separate data migration step. Optional: run validation/cleanup scripts with backups if needed.
4. **Routing**
   - **Choice:** Either keep state-based navigation in frontend.new or introduce React Router for URLs (e.g. `/jobs`, `/invoices`) and deep links—both are viable; MIGRATION_REVIEW covers the wiring.

Concrete steps are already outlined in **MIGRATION_REVIEW.md** (Phase 1–3): add deps, config, Apollo, auth; replace mocks per view; optionally add routing and Dispatchers; then polish (Assistant, toasts, ErrorBoundary).

---

## 6. What to Reuse (Quick Reference)

| From current frontend | Use for |
|------------------------|--------|
| `lib/config.ts`, `.env.example` | API URL, GraphQL, auth, upload |
| `lib/apollo-client.ts` | Apollo + auth link |
| `features/auth` (AuthProvider, LoginModal) | Login and token handling |
| `lib/graphql/*`, `features/jobs/api` | Queries/mutations and types |
| `lib/services/imageUpload.ts` | Job/invoice image uploads |
| `lib/calculations/jobCalculations.ts`, `lib/types/job.ts` | Calculations and shared types |

| From frontend.new | Keep |
|-------------------|------|
| Layout (Sidebar, Navbar, bottom nav) | New UX |
| Views (Dashboard, JobsHub, Fleet, etc.) | Shell to wire to GraphQL |
| Gemini Assistant + geminiService | Optional AI UX |
| Styling (Tailwind, Material Symbols) | Visual revamp |

---

## 7. If You Later Consider Next.js

Revisit Next.js only if you need:

- Public, SEO-heavy pages (e.g. marketing site, public job board).
- SSR or ISR for those pages.

Then you could:

- Use Next.js for the **public** app and keep the current **Vite app** (or frontend.new) as the **authenticated dashboard**, both hitting the same Node/Neo4j backend; or
- Move the whole app to Next.js and use it as a BFF that calls your existing GraphQL/REST (more work).

For an internal revamp and “migrate existing data,” **Vite + React + frontend.new wired to your backend** is the best available option.
