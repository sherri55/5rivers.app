# Frontend Migration Review: Current → frontend.new

This document compares **5rivers.app.frontend** (current) with **5rivers.app.frontend.new** (Lovable/frontend.new) and outlines how to migrate so the new UI runs against your existing backend.

---

## 1. High-level comparison

| Aspect | Current (`5rivers.app.frontend`) | New (`5rivers.app.frontend.new`) |
|--------|----------------------------------|-----------------------------------|
| **React** | 18.3 | 19.2 |
| **Build** | Vite 5 | Vite 6 |
| **Routing** | React Router (path-based) | In-app state (`ViewType` + `setCurrentView`) |
| **Data** | Apollo Client + GraphQL | Mock data only (`constants.tsx`) |
| **Auth** | Yes (JWT, LoginModal, AuthProvider) | None |
| **UI** | Radix/shadcn, Lucide, many modals | Tailwind + Material Symbols, simpler components |
| **Extra** | Upload service, toasts, error boundary | Gemini AI Assistant |

---

## 2. Current frontend (reference)

- **Entry**: `main.tsx` → `AuthProvider` → `ApolloProvider` → `BrowserRouter` → `App` → `Layout` → `AppRoutes`.
- **Auth**: Unauthenticated users see `LoginModal`; token from `/api/auth/login`, stored and sent via Apollo `authLink`.
- **Routes** (lazy-loaded): `/`, `/companies`, `/drivers`, `/units`, `/fleet`, `/dispatchers`, `/jobs`, `/job-types`, `/invoices`, `/reports`, `*` (NotFound).
- **Data**: All real data via GraphQL (`lib/graphql/*`, `features/jobs/api`). Upload via `config.api.uploadEndpoint` (`/api/upload`).
- **Config**: `lib/config.ts` (VITE_* env for API URL, GraphQL, upload, auth login).

---

## 3. Frontend.new (target UI)

- **Entry**: `index.tsx` → `App` (no providers).
- **Navigation**: Single `currentView` state; `Sidebar` + `Navbar` + mobile bottom nav switch views (dashboard, jobs, fleet, billing, invoices, reports, companies, job-types, create-job, create-driver, create-company).
- **Data**: All from `constants.tsx` (e.g. `MOCK_JOBS`, `MOCK_COMPANIES`, `MOCK_DRIVERS`, `MOCK_UNITS`, `MOCK_INVOICES`, `MOCK_JOB_TYPES`, etc.).
- **AI**: `geminiService.ts` – `getLogisticsAdvice`, `parseCommand`; used by `Assistant` (natural language → navigate to create-job or show advice). Env: `API_KEY` (Gemini).
- **Views**: Dashboard, JobsHub, FleetIndex, Billing, Invoices, Reports, Companies, JobTypes, CreateJob, CreateDriver, CreateCompany.

So: **frontend.new is a UI shell + mock data + Gemini**. Migration = keep this shell and swap mocks for your backend (GraphQL + auth + upload).

---

## 4. Feature / page mapping

| Current (route/page) | Frontend.new view | Notes |
|----------------------|-------------------|--------|
| `/` Dashboard | `dashboard` | Wire to real dashboard GraphQL/queries. |
| `/jobs` | `jobs` (JobsHub) | Replace `MOCK_JOBS` with `useQuery(GET_JOBS)` (or equivalent). Add create/edit modals that use mutations. |
| `/companies` | `companies` | Replace `MOCK_COMPANIES` with companies GraphQL. |
| `/drivers` | Inside `fleet` (FleetIndex) | Current app has separate Drivers page; new has one Fleet view (units + drivers). Either split again or keep single Fleet and show drivers/units in tabs/sections. |
| `/units` | Inside `fleet` | Same as drivers. |
| `/fleet` | `fleet` (FleetIndex) | Combines fleet/units/drivers concept. |
| `/dispatchers` | — | No dispatchers view in new app. Add a new view or fold into another (e.g. Jobs or Fleet). |
| `/job-types` | `job-types` | Replace mock job types with GraphQL. |
| `/invoices` | `invoices` | Replace mock invoices with GraphQL. |
| `/reports` | `reports` | Replace mock chart data with real data if backend supports it. |
| — | `billing` (Create Billing) | New-only; map to your “create invoice” or billing flow if you have one. |
| — | `create-job` | Use existing create-job mutation + form. |
| — | `create-driver` | Use existing driver mutation. |
| — | `create-company` | Use existing company mutation. |

---

## 5. How the migration would work

### Phase 1: Align with backend (data + auth)

1. **Add dependencies** (in `5rivers.app.frontend.new`):
   - `@apollo/client`, `graphql`
   - `react-router-dom` (optional but recommended for deep links and consistency)

2. **Config and env**:
   - Add a `config` module (or copy/trim from current `lib/config.ts`) and `.env.example` with:
     - `VITE_GRAPHQL_ENDPOINT` (e.g. `http://localhost:4001/graphql`)
     - `VITE_API_URL` (e.g. `http://localhost:4001`)
     - `VITE_AUTH_LOGIN_ENDPOINT` (e.g. `http://localhost:4001/api/auth/login`)
     - `VITE_UPLOAD_URL` (e.g. `http://localhost:4001/api/upload`)
   - Keep `VITE_API_KEY` or similar for Gemini if you keep the Assistant.

3. **Apollo + auth**:
   - Create Apollo Client with `createHttpLink` and an auth link that reads the same token (e.g. from the same storage as current app).
   - In `main.tsx` (or new `main.tsx` if you rename entry), wrap app in `ApolloProvider` and an `AuthProvider` that:
     - Exposes `isAuthenticated` and `login`/`logout`/`getStoredToken`.
     - Shows a login UI (e.g. reuse/port current `LoginModal`) when not authenticated, and the rest of the app when authenticated.

4. **Replace mocks per view**:
   - **JobsHub**: Use `GET_JOBS` (and related queries) from current `lib/graphql/jobs.ts` / `features/jobs/api`, and mutations for create/update/delete. Map GraphQL job shape to the component’s expected props (adapter layer or inline).
   - **Companies**: Same idea with companies GraphQL.
   - **FleetIndex**: Use drivers + units (and optionally dispatchers) GraphQL; combine into one view or split into tabs.
   - **Invoices**: Use invoices GraphQL.
   - **JobTypes**: Use job types GraphQL.
   - **Dashboard**: Use dashboard/analytics queries if they exist.
   - **Reports**: Replace `CHART_DATA` with real API/GraphQL if available.

5. **Types**:
   - Keep or extend `frontend.new/types.ts` for UI; add mapping from GraphQL types (e.g. from current `lib/graphql/*` and feature types) so components keep a stable interface while the data source changes.

### Phase 2: Optional routing and structure

6. **Routing (optional)**:
   - If you keep state-based navigation, no change.
   - If you want URLs (e.g. `/jobs`, `/invoices`): add `BrowserRouter` and replace `currentView` + `setCurrentView` with `Route` + `useNavigate`/`Link`. Map each `ViewType` to a path and render the same components.

7. **Dispatchers**:
   - Add a “Dispatchers” view (or reuse current Dispatchers page) and wire to dispatchers GraphQL; add nav entry in Sidebar/Navbar.

8. **Upload**:
   - If create job / edit job / invoices use images, add the same upload helper as current app (e.g. `lib/services/imageUpload.ts`) and call `config.api.uploadEndpoint` with the auth token.

### Phase 3: Polish and AI

9. **Assistant**:
   - Keep `geminiService` and `Assistant` as-is for UX; optionally have `parseCommand` trigger real create-job (e.g. call the same mutation after navigating to create-job and prefill from `params`).

10. **Error and feedback**:
    - Add an ErrorBoundary at the root (and optionally per section). Add toasts or similar for mutation success/error (e.g. sonner like current app).

---

## 6. What to reuse from the current frontend

- **GraphQL**: Queries/mutations from `lib/graphql/*` and `features/jobs/api` (and any other features you use).
- **Auth**: Logic and UI from `features/auth` (AuthContext, LoginModal, getStoredToken).
- **Config**: `lib/config.ts` (or a slimmed copy).
- **Apollo setup**: `lib/apollo-client.ts` (auth link + http link + cache).
- **Upload**: `lib/services/imageUpload.ts` and upload types/config.
- **Types**: Backend-aligned types and any validation (e.g. job amount) from current app.

---

## 7. What stays in frontend.new

- **Layout**: `App.tsx`, `Sidebar`, `Navbar`, mobile bottom nav, `Assistant` overlay.
- **Views**: Dashboard, JobsHub, FleetIndex, Billing, Invoices, Reports, Companies, JobTypes, CreateJob, CreateDriver, CreateCompany (as the main screens).
- **Styling**: Tailwind + Material Symbols, existing “command center” look.
- **Gemini**: `geminiService.ts` and Assistant behavior; only data source and navigation targets change.

---

## 8. Migration strategies

- **A. In-place in frontend.new**  
  Add Apollo, auth, and config to `5rivers.app.frontend.new`, then replace each mock (constants) with GraphQL one view at a time. Easiest to reason about; you keep a single “new” codebase.

- **B. Copy new UI into current frontend**  
  Copy Sidebar/Navbar/views from frontend.new into current app, replace current pages/routes with the new views, and keep existing Apollo/auth/upload. More merge work but you never leave the current app’s wiring.

- **C. New repo, cherry-pick both**  
  New folder; take routing + auth + Apollo + GraphQL from current, take layout + views + Assistant from frontend.new, then wire views to GraphQL. Good if you want a clean slate and don’t mind maintaining a new structure.

Recommendation: **A (in-place in frontend.new)** – add backend integration there and keep one codebase that looks like frontend.new but talks to your API.

---

## 9. Summary

- **frontend.new** = UI + mock data + Gemini Assistant; **no** GraphQL, **no** auth, **no** routing.
- **Migration** = add Apollo + auth + config + upload (and optionally React Router), then replace each mock with the corresponding GraphQL/API and map types. Reuse current auth, GraphQL, and upload code; keep new layout, views, and Assistant.
- **Dispatchers** and **Reports** need a decision (add view vs. merge; real data vs. mock). **Billing** in new app should be aligned with your backend’s billing/invoice flow.

If you tell me whether you prefer strategy A, B, or C and whether you want to keep state-based nav or move to React Router, I can outline the exact file-by-file steps (e.g. “add these files, change these lines”) next.
