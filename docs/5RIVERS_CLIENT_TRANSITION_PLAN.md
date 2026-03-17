# 5rivers.client – Transition Plan (Cutting-Edge Tech & Best Practices)

This document defines how to build **5rivers.client**: the new frontend for 5rivers, based on the [NextAdmin Next.js Admin Dashboard](https://github.com/NextAdminHQ/nextjs-admin-dashboard), integrated with **5rivers.server**, and aligned with current best practices.

**References:**
- Backend API & schema: [`5rivers.server/docs/FRONTEND_REFERENCE.md`](../5rivers.server/docs/FRONTEND_REFERENCE.md)
- Existing frontend (reference only): `5rivers.app.frontend`

---

## 1. Cutting-Edge Technology Stack

Use a modern, stable stack with strong ecosystem support and clear upgrade paths.

| Layer | Choice | Version / Notes |
|-------|--------|------------------|
| **Framework** | Next.js (App Router) | 15.x or 16.x — App Router, React Server Components (RSC) where beneficial |
| **React** | React | 19.x — concurrent features, improved hooks, strict mode |
| **Language** | TypeScript | 5.x — strict mode, no implicit any |
| **Styling** | Tailwind CSS | 3.4+ — utility-first, design tokens, dark mode |
| **Data fetching** | TanStack Query (React Query) v5 | For client-side REST: caching, mutations, invalidation |
| **Forms & validation** | React Hook Form + Zod | Typed schemas, minimal re-renders, server-safe validation |
| **HTTP client** | Native `fetch` + thin wrapper | No axios; use Next.js `fetch` caching and a small API client for auth headers |
| **Routing** | Next.js App Router | File-based routes, layouts, loading/error UI |
| **Auth (client)** | JWT in httpOnly cookie or secure storage | Prefer cookie for XSS mitigation; middleware for protected routes |
| **Charts** | ApexCharts (from NextAdmin) or Recharts | Keep NextAdmin’s choice for consistency |
| **Date handling** | date-fns or dayjs | Prefer date-fns for tree-shaking and consistency with backend `YYYY-MM-DD` |
| **Icons** | Lucide React | Tree-shakeable, consistent with many admin UIs |
| **UI primitives** | Radix UI (via NextAdmin) | Accessible, unstyled; theme with Tailwind |
| **Linting / formatting** | ESLint 9 + Prettier | next/core-web-vitals, consistent formatting |

**Explicitly avoid for new client:**
- **Apollo Client / GraphQL** — 5rivers.server is REST-only; use TanStack Query + fetch.
- **Vite for the new app** — Use Next.js for SSR/SSG, API routes if needed, and the NextAdmin template.
- **Legacy React patterns** — Prefer function components, hooks, and RSC where it fits (e.g. initial data, SEO).

---

## 2. Best Practices

### 2.1 Authentication & Security

- **Login contract:** Call `POST /api/auth/login` with `{ email, password, organizationSlug }`. Store only what’s needed (e.g. token or session indicator); prefer **httpOnly cookies** set by an API route or backend so the client never reads the JWT in JS (XSS mitigation).
- **Protected routes:** Use Next.js **middleware** to redirect unauthenticated users to `/login`. Validate token or session server-side where possible.
- **Auth context:** Provide `user` (userId, organizationId, role, email) and `logout` to the client; avoid storing raw JWT in localStorage if a cookie-based flow is used.
- **Organization scope:** Backend scopes all data by `organizationId` from the JWT. Frontend must not send `organizationId` in request bodies; ensure login flow collects or preselects `organizationSlug` so the correct org is used.
- **HTTPS in production:** All API calls and cookies over HTTPS.
- **Sensitive data:** No tokens or secrets in client bundles or logs.

### 2.2 API Layer

- **Single API client:** One module (e.g. `lib/api-client.ts`) that:
  - Sets base URL from env (`NEXT_PUBLIC_API_URL`).
  - Attaches `Authorization: Bearer <token>` (or relies on cookie) for authenticated requests.
  - Handles 401 (e.g. clear session and redirect to login).
  - Parses JSON and returns typed responses or throws typed errors.
- **Typed responses:** Define TypeScript types/interfaces for each endpoint (aligned with `FRONTEND_REFERENCE.md`). Use a single “API types” module or colocate with feature.
- **Pagination:** Use backend contract `?page=1&limit=20` and response shape `{ data, total, page, limit, totalPages }`. Wrap list fetches in TanStack Query with pagination keys.
- **Errors:** Map status codes to user-friendly messages; surface validation errors (e.g. 400 `message`) in forms.

### 2.3 Data Fetching & State

- **TanStack Query:** Use for all REST reads/writes: `useQuery` for GET, `useMutation` for POST/PATCH/DELETE. Set `queryKey` to include resource and filters (e.g. `['jobs', { page, limit }]`).
- **Invalidation:** After create/update/delete, invalidate relevant queries (e.g. `queryClient.invalidateQueries({ queryKey: ['jobs'] })`) so lists and detail views stay in sync.
- **Loading & error UI:** Use Query’s `isLoading`, `isError`, `error` and Suspense where appropriate; show skeletons (NextAdmin-style) for tables and cards.
- **No global client state for server data:** Avoid duplicating server state in Redux/Zustand; use TanStack Query as the source of truth for API data.
- **Client-only state:** Use React state or a small store (e.g. Zustand) only for UI state (modals, sidebar, filters) if needed.

### 2.4 Forms

- **React Hook Form:** One register per field; avoid unnecessary re-renders.
- **Zod:** Define schemas for create/update bodies (aligned with FRONTEND_REFERENCE). Use `zodResolver` with RHF for validation and typed `handleSubmit` payloads.
- **Dates:** Send and display `jobDate`, `invoiceDate`, `paidAt` as `YYYY-MM-DD`; use a single date utility (e.g. date-fns) for parsing/formatting.
- **Feedback:** Disable submit while loading; show field-level and toast errors from API responses.

### 2.5 Accessibility (a11y)

- **Semantic HTML:** Use correct elements (`button`, `nav`, `main`, `form`, labels).
- **Focus:** Logical tab order; focus trap in modals; return focus on close.
- **ARIA:** Use Radix/NextAdmin components as-is (they expose ARIA); add `aria-label` where needed for icons-only actions.
- **Keyboard:** All actions available via keyboard; avoid custom key handling that conflicts with browser/assistive tech.
- **Contrast & motion:** Comply with WCAG 2.1 AA; respect `prefers-reduced-motion` if using motion.

### 2.6 Performance

- **Code splitting:** Use Next.js dynamic imports for heavy pages or modals; NextAdmin already uses lazy loading where appropriate.
- **Images:** Use Next.js `Image` for app images; for job images from API, use `<img src={apiImageUrl} />` with proper `Content-Type` from backend (per FRONTEND_REFERENCE).
- **Lists:** For large tables, consider virtualization (e.g. TanStack Table + virtualizer) if lists exceed ~100 rows.
- **Bundles:** Audit for large dependencies; prefer tree-shakeable libraries (e.g. Lucide, date-fns).

### 2.7 Project Structure & Conventions

- **Feature-based structure:** Group by domain (auth, companies, drivers, jobs, invoices, driver-payments, etc.). Each feature can have: `api/`, `components/`, `hooks/`, `types/`, and pages under App Router.
- **Colocation:** Keep components, hooks, and types close to where they’re used; expose public API via feature `index.ts` where it helps.
- **Naming:** `kebab-case` for files/folders; PascalCase for components and types; camelCase for functions and variables.
- **Path aliases:** Use `@/` for `src/` (or project root) so imports are stable (e.g. `@/features/auth`, `@/lib/api-client`).

### 2.8 Testing

- **Unit:** Vitest or Jest for pure logic (validation, formatters, API client helpers).
- **Component:** React Testing Library for critical UI (login form, key modals); mock API client or MSW.
- **E2E:** Playwright for critical flows (login, create job, create invoice) against a test instance of 5rivers.server.
- **Types:** Strict TypeScript; no `any`; run `tsc --noEmit` in CI.

### 2.9 Developer Experience

- **Env:** All env vars prefixed (e.g. `NEXT_PUBLIC_*` for client). Document in `.env.example` (API URL, feature flags if any).
- **Docs:** Keep FRONTEND_REFERENCE.md as source of truth for API; update 5rivers.client README with setup and script commands.
- **Git:** Conventional commits; branch strategy (e.g. main + feature branches); PR reviews for API and auth changes.

---

## 3. NextAdmin Template Integration

- **Clone/fork:** Start from [NextAdminHQ/nextjs-admin-dashboard](https://github.com/NextAdminHQ/nextjs-admin-dashboard) (Next.js 16, React 19, Tailwind, Radix, ApexCharts).
- **Rename project:** Use `5rivers.client` as package name and app title.
- **Preserve:** Use NextAdmin’s layout (sidebar, navbar), theme (light/dark), and UI components; replace demo data and demo API with 5rivers.server.
- **Remove or replace:** Strip unrelated integrations (e.g. Algolia, demo auth); replace with 5rivers login and REST client.
- **Add pages/routes:** Add app routes for Companies, Drivers, Dispatchers, Units, Job Types, Jobs, Invoices, Driver Payments, Reports, Dashboard (with real stats from API where applicable).

---

## 4. Backend (5rivers.server) Integration

- **Base URL:** Configure `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:4001`); all requests to `/api/*` and `/health` go to this origin.
- **Auth:** Login via `POST /api/auth/login` with `email`, `password`, `organizationSlug`. Send `Authorization: Bearer <token>` on every request (or use cookies if you introduce a small backend proxy).
- **Pagination:** Use `?page=1&limit=20` (max 100) and handle `{ data, total, page, limit, totalPages }`.
- **Entities:** Implement CRUD and list pages for: Companies, Job Types (by company), Drivers, Dispatchers, Units, Jobs (with job images and driver pay), Invoices (with invoice lines), Driver Payments. Follow request/response shapes in FRONTEND_REFERENCE.md.
- **Images:** Upload via `POST /api/jobs/:id/images` (multipart, field `file`); display via `GET /api/jobs/:id/images/:imageId` (binary; use as `img` src or download).
- **Enums:** Use backend enums for invoice status (CREATED, RAISED, RECEIVED), payment method (CASH, CHECK, BANK_TRANSFER, E_TRANSFER, OTHER), and roles (OWNER, ADMIN, DISPATCHER, MEMBER, VIEWER).

---

## 5. Feature & Page Mapping (Current → 5rivers.client)

| Current (5rivers.app.frontend) | 5rivers.client (Next.js route) | Notes |
|--------------------------------|--------------------------------|--------|
| `/` (Dashboard) | `/` or `/dashboard` | Dashboard with real stats from API |
| `/companies` | `/companies` | List + CRUD; Companies API |
| `/drivers` | `/drivers` | List + CRUD; Drivers API |
| `/dispatchers` | `/dispatchers` | List + CRUD; Dispatchers API |
| `/units` | `/units` | List + CRUD; Units API |
| `/job-types` | `/job-types` | List + CRUD; optional `?companyId=`; Job Types API |
| `/jobs` | `/jobs` | List + CRUD; job images, driver pay; Jobs API |
| `/invoices` | `/invoices` | List + CRUD; invoice lines; Invoices API |
| `/reports` | `/reports` | Reports; use driver-payments and jobs as needed |
| `/fleet` | `/fleet` or merge into Units | Optional; can be Units view or separate |
| Login (modal) | `/login` | Dedicated page; email + password + organizationSlug |
| 404 | `not-found.tsx` | Next.js not-found UI |

- **Auth:** Replace username/password with **email**, **password**, and **organizationSlug** to match backend.
- **Data:** Remove Apollo/GraphQL; implement all data access with TanStack Query + API client against 5rivers.server REST endpoints.

---

## 6. Implementation Phases

1. **Scaffold (Week 1)**  
   - Clone NextAdmin; rename to 5rivers.client; add env and API base URL.  
   - Implement API client (fetch wrapper, auth header, 401 handling).  
   - Implement login page and auth context/middleware (email, password, organizationSlug).  
   - Protect dashboard route; verify token flow with 5rivers.server.

2. **Core entities (Weeks 2–3)**  
   - Companies, Drivers, Dispatchers, Units: list + create/edit/delete with TanStack Query and Zod/RHF.  
   - Shared patterns: paginated table, form modals, toast feedback.

3. **Jobs & job types (Weeks 3–4)**  
   - Job Types (company-scoped); Jobs list and CRUD; job images upload/display; job driver pay (PUT/PATCH/DELETE).

4. **Invoices & payments (Week 4–5)**  
   - Invoices CRUD; invoice lines (add/update/remove jobs); Driver Payments list and CRUD; link job driver pay to payments (PATCH with paymentId).

5. **Dashboard, reports, polish (Week 5–6)**  
   - Dashboard widgets with real data; Reports page; error boundaries; loading states; a11y and performance pass.

6. **Testing & docs (Ongoing)**  
   - Unit tests for validation and API client; E2E for login and critical flows; update README and keep FRONTEND_REFERENCE.md as API source of truth.

---

## 7. Summary

- **Stack:** Next.js 15/16 (App Router), React 19, TypeScript 5, Tailwind, TanStack Query, RHF + Zod, native fetch, NextAdmin UI.  
- **Practices:** JWT/cookie auth, single API client, typed REST with TanStack Query, feature-based structure, a11y, performance, and testing as above.  
- **Integration:** 5rivers.server as the only backend; follow `5rivers.server/docs/FRONTEND_REFERENCE.md` for all endpoints and shapes.  
- **UI:** NextAdmin theme and components; 5rivers.client-specific pages and forms for each entity and flow.

This plan keeps the frontend on cutting-edge tech and aligned with current best practices while transitioning cleanly from 5rivers.app.frontend to 5rivers.client with the NextAdmin template and 5rivers.server backend.
