# Stitch Prompt – Group 1: App Shell, Auth, Dashboard, Jobs

## Project Context

Build the frontend for **5Rivers Trucking** – a multi-tenant trucking operations management platform. This is a professional business tool used daily by trucking company owners and dispatchers to track jobs, drivers, trucks, and invoices.

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind CSS + React Router v6

**API Base:** All API calls go to a REST backend at `http://localhost:4000/api`. Authentication is JWT Bearer token. All entity endpoints are organization-scoped (the token contains the orgId).

**Design Direction:** Clean, professional, dark-mode-first dashboard UI. Think Stripe Dashboard or Linear – minimal, functional, no unnecessary decoration. Use a neutral dark palette (slate/zinc grays) with a single accent color (blue or indigo) for primary actions. No rounded cartoon buttons, no gradients. Crisp, utilitarian.

---

## Screen 1: App Shell / Layout

The persistent layout wrapper for all authenticated pages.

### Structure:
```
┌──────────────────────────────────────────────────┐
│  HEADER BAR (fixed top)                          │
│  [☰ toggle] [5Rivers Trucking]      [User ▾]    │
├──────────┬───────────────────────────────────────┤
│ SIDEBAR  │  MAIN CONTENT AREA                    │
│          │                                       │
│ Dashboard│  (React Router <Outlet />)            │
│ Jobs     │                                       │
│ Drivers  │                                       │
│ Units    │                                       │
│ Companies│                                       │
│ Dispatch.│                                       │
│ Carriers │                                       │
│ Invoices │                                       │
│          │                                       │
│ ──────── │                                       │
│ Settings │                                       │
│          │                                       │
└──────────┴───────────────────────────────────────┘
```

### Sidebar Navigation Items:
1. **Dashboard** – icon: LayoutDashboard
2. **Jobs** – icon: Briefcase
3. **Drivers** – icon: Users
4. **Units** – icon: Truck
5. **Companies** – icon: Building2
6. **Dispatchers** – icon: Radio
7. **Carriers** – icon: ArrowRightLeft
8. **Invoices** – icon: FileText
9. (divider)
10. **Settings** – icon: Settings

### Sidebar Behavior:
- Desktop (≥1024px): Sidebar visible, collapsible to icon-only mode
- Mobile (<1024px): Sidebar hidden, toggled via hamburger menu as an overlay
- Active nav item is highlighted
- Sidebar shows org name at the top, user avatar/initials + role at the bottom

### Header Bar:
- Left: Hamburger toggle (mobile) + Page title / breadcrumb
- Right: User dropdown menu with: "Profile", "Settings", "Logout"

### Auth Guard:
- If no JWT token in localStorage → redirect to `/login`
- Store auth state in React Context: `{ token, user: { userId, email, organizationId, role, name } }`

---

## Screen 2: Login Page

**Route:** `/login`

### Layout:
Centered card on a dark background. Company logo or "5Rivers Trucking" text at top.

### Form Fields:
| Field | Type | Required | Placeholder |
|-------|------|----------|-------------|
| Email | email input | Yes | "you@company.com" |
| Password | password input | Yes | "••••••••" |
| Organization | text input | Yes | "organization-slug" |

### Submit Button: "Sign In"

### API Call:
```
POST /api/auth/login
Body: { "email": "...", "password": "...", "organizationSlug": "..." }
Response: {
  "token": "jwt-string",
  "user": { "userId", "email", "organizationId", "role" },
  "expiresIn": "24h"
}
```

### Behavior:
- On success: Store token + user in localStorage and AuthContext → redirect to `/dashboard`
- On error: Show error message below form (e.g., "Invalid credentials", "Organization not found")
- Show loading spinner on button while request is in flight
- No registration page for now (users are added by admins via the Members API)

---

## Screen 3: Dashboard

**Route:** `/dashboard`

### Summary Cards Row (4 cards):
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Total Revenue│ │ Unpaid Driver │ │ Jobs This    │ │ Units in     │
│              │ │ Balance      │ │ Week         │ │ Maintenance  │
│  $124,500    │ │  $12,340     │ │    47        │ │    3         │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

**Card 1: Total Revenue** (this month)
- Sum of `amount` from all jobs where `jobDate` is in the current month
- Subtitle: "This Month"
- Color accent: green

**Card 2: Unpaid Driver Balance**
- From the driver pay summary endpoint: sum of all `balance` values where balance > 0
- Subtitle: "Outstanding"
- Color accent: amber/yellow

**Card 3: Jobs This Week**
- Count of jobs where `jobDate` is in current week (Mon–Sun)
- Subtitle: "This Week"
- Color accent: blue

**Card 4: Units in Maintenance**
- Count of units where `status = 'MAINTENANCE'`
- Subtitle: "Needs Attention"
- Color accent: red if > 0, gray if 0

### API Calls for Dashboard:
```
GET /api/jobs?filter_jobDate=YYYY-MM&limit=100    → for revenue + job count
GET /api/driver-pay                                → for unpaid balance
GET /api/units?filter_status=MAINTENANCE&limit=100 → for maintenance count
GET /api/jobs?sortBy=jobDate&order=desc&limit=10   → for recent jobs table
```

### Recent Jobs Table (below cards):
| Column | Source |
|--------|--------|
| Date | `jobDate` (formatted: "Mar 15, 2026") |
| Job Type | Lookup via `jobTypeId` → show title |
| Driver | Lookup via `driverId` → show name |
| Source | `sourceType` badge: blue "DISPATCHED" / green "DIRECT" |
| Amount | `amount` formatted as currency ($1,234.56) |
| Status | `driverPaid` → green checkmark if true, gray dash if false |

Header: "Recent Jobs" with a "View All →" link to `/jobs`

### Quick Actions (optional floating or inline):
- "+ New Job" button (links to `/jobs/new`)

---

## Screen 4: Jobs List

**Route:** `/jobs`

### Page Header:
```
Jobs                                          [+ New Job]
```

### Filter Bar (above table):
```
┌──────────────────────────────────────────────────────────┐
│ [Date Range ▾]  [Source: All ▾]  [Search...]  [Clear]    │
└──────────────────────────────────────────────────────────┘
```

Filters:
- **Date Range**: Text input that filters by `jobDate` (LIKE match, so typing "2026-03" shows March 2026 jobs)
- **Source Type**: Dropdown with options: "All", "Dispatched", "Direct"
- **Search**: General text search (uses filter_amount or filter_jobDate)
- **Clear**: Resets all filters

### Jobs Table:

| Column | Field | Sortable | Details |
|--------|-------|----------|---------|
| Date | `jobDate` | Yes (default, desc) | Format: "Mar 15, 2026" |
| Job Type | `jobTypeId` | No | Resolve to title via lookup. Show company name below in small text |
| Driver | `driverId` | No | Resolve to name. Show "—" if null |
| Dispatcher | `dispatcherId` | No | Resolve to name. Show "—" if null. Only show for DISPATCHED jobs |
| Unit | `unitId` | No | Resolve to name. Show "—" if null |
| Source | `sourceType` | Yes | Badge: blue "Dispatched" / green "Direct" |
| Amount | `amount` | Yes | Currency format. Show "—" if null |
| Paid | `driverPaid` | No | Green ✓ or gray ✗ |
| Actions | — | No | Edit (pencil icon), Delete (trash icon) |

### Table Behavior:
- Clicking a column header toggles sort (asc/desc)
- Current sort shown with arrow indicator
- Rows are clickable → navigate to edit page
- Delete shows confirmation modal: "Delete this job? This action cannot be undone."

### Pagination (below table):
```
Showing 1-20 of 147 jobs    [← Prev]  Page 1 of 8  [Next →]
```
- Default: 20 per page
- Page size selector: 10, 20, 50

### API Call:
```
GET /api/jobs?page=1&limit=20&sortBy=jobDate&order=desc&filter_sourceType=DISPATCHED
```

### Lookup Data:
To show names instead of IDs, fetch these on page load (cache in state):
```
GET /api/drivers?limit=100        → build { id: name } map
GET /api/dispatchers?limit=100    → build { id: name } map
GET /api/units?limit=100          → build { id: name } map
GET /api/job-types?limit=100      → build { id: { title, companyId } } map
GET /api/companies?limit=100      → build { id: name } map
```

---

## Screen 5: Job Create / Edit Form

**Routes:**
- Create: `/jobs/new`
- Edit: `/jobs/:id/edit`

### Page Header:
- Create: "New Job" with [Cancel] button
- Edit: "Edit Job" with [Cancel] and [Delete] buttons

### Form Layout:

The form has a **Source Type toggle** at the top that controls which fields are shown.

```
┌─────────────────────────────────────────────────────────┐
│ Source Type:   ( ● Dispatched )  ( ○ Direct )           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Job Date *          [  2026-03-15  ]  (date picker)    │
│                                                         │
│  Company *           [  Select company...  ▾]           │
│  Job Type *          [  Select job type... ▾]           │
│    (filtered by selected company)                       │
│  Rate of Job         $450.00  (auto-filled from         │
│    (read-only)       job type, shown as reference)      │
│                                                         │
│  ─── Assignment ───                                     │
│  Driver              [  Select driver...   ▾]           │
│  Unit                [  Select unit...     ▾]           │
│                                                         │
│  ─── IF DISPATCHED ───                                  │
│  Dispatcher *        [  Select dispatcher... ▾]         │
│                                                         │
│  ─── IF DIRECT ───                                      │
│  Carrier             [  Select carrier...  ▾]           │
│  Carrier Amount      [  $________  ]                    │
│    (only shown if carrier selected)                     │
│                                                         │
│  ─── Job Details ───                                    │
│  Start Time          [  08:00  ]  (time input)          │
│  End Time            [  16:30  ]  (time input)          │
│  Weight              [  ________  ]  (text, freeform)   │
│  Loads               [  ___  ]  (number)                │
│  Amount *            [  $________  ]  (decimal)         │
│  Ticket IDs          [  ________  ]  (text, comma-sep)  │
│                                                         │
│  ─── Payment ───                                        │
│  Driver Paid         [ ] (checkbox)                     │
│                                                         │
│                           [Cancel]  [Save Job]          │
└─────────────────────────────────────────────────────────┘
```

### Field Details:

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| sourceType | Radio toggle | Yes | "DISPATCHED" | Controls conditional fields |
| jobDate | Date picker | Yes | Today | Format: YYYY-MM-DD |
| jobTypeId | Dropdown | Yes | — | Filtered by company. Shows "title (startLocation → endLocation)" |
| driverId | Dropdown | No | — | Shows driver name. Options from GET /api/drivers |
| unitId | Dropdown | No | — | Shows unit name + plate. Options from GET /api/units (only ACTIVE status) |
| dispatcherId | Dropdown | Yes (if DISPATCHED) | — | Only shown when sourceType=DISPATCHED. Options from GET /api/dispatchers |
| carrierId | Dropdown | No | — | Only shown when sourceType=DIRECT. Options from GET /api/carriers (only ACTIVE status) |
| carrierAmount | Number | No | — | Only shown when sourceType=DIRECT AND a carrier is selected |
| startTime | Time input | No | — | Format: "HH:MM" |
| endTime | Time input | No | — | Format: "HH:MM" |
| weight | Text | No | — | Freeform text (e.g., "42.5 tons") |
| loads | Number (integer) | No | — | Whole number |
| amount | Number (decimal) | No | — | Currency. This is the total job revenue |
| ticketIds | Text | No | — | Comma-separated ticket/BOL numbers |
| driverPaid | Checkbox | No | false | Whether driver has been paid for this job |

### Conditional Logic:
1. **When sourceType = "DISPATCHED":**
   - Show `dispatcherId` dropdown (required)
   - Hide `carrierId` and `carrierAmount` fields
   - The `dispatcherId` is sent in the API payload

2. **When sourceType = "DIRECT":**
   - Hide `dispatcherId` dropdown
   - Show `carrierId` dropdown (optional)
   - If a carrier is selected, show `carrierAmount` input
   - Set `dispatcherId` to null in the API payload

3. **Company → Job Type cascade:**
   - First select a Company from a dropdown (this dropdown is NOT sent to the API – it's only used to filter job types)
   - Job Type dropdown is filtered to only show job types belonging to the selected company
   - When a job type is selected, display its `rateOfJob` as a read-only reference field

### API Calls:

**Create:**
```
POST /api/jobs
Body: {
  "jobDate": "2026-03-15",
  "jobTypeId": "uuid",
  "driverId": "uuid" | null,
  "dispatcherId": "uuid" | null,
  "unitId": "uuid" | null,
  "carrierId": "uuid" | null,
  "sourceType": "DISPATCHED" | "DIRECT",
  "weight": "42.5 tons" | null,
  "loads": 3 | null,
  "startTime": "08:00" | null,
  "endTime": "16:30" | null,
  "amount": 1500.00 | null,
  "carrierAmount": 800.00 | null,
  "ticketIds": "T-001, T-002" | null,
  "driverPaid": false
}
```

**Update:**
```
PATCH /api/jobs/:id
Body: { ...only changed fields... }
```

**Load existing (for edit):**
```
GET /api/jobs/:id
```

**Delete:**
```
DELETE /api/jobs/:id
```

### Form Behavior:
- On save success → redirect to `/jobs` with a success toast notification
- On save error → show error message at top of form
- Cancel → navigate back to `/jobs`
- Delete (edit mode only) → confirmation modal → on confirm → DELETE → redirect to `/jobs`
- All dropdowns should show a "Select..." placeholder as first option
- Dropdowns should show loading state while data is being fetched

### Dropdown Data Sources:
```
GET /api/companies?limit=100      → Company dropdown
GET /api/job-types?companyId=X    → Job Type dropdown (re-fetch when company changes)
GET /api/drivers?limit=100        → Driver dropdown
GET /api/units?limit=100          → Unit dropdown (filter to ACTIVE in frontend)
GET /api/dispatchers?limit=100    → Dispatcher dropdown
GET /api/carriers?limit=100       → Carrier dropdown (filter to ACTIVE in frontend)
```

---

## Shared Components Needed

### 1. DataTable
Reusable table component with:
- Column definitions (label, field, sortable, render function)
- Sorting state (sortBy, order)
- Pagination controls
- Loading skeleton
- Empty state ("No jobs found")
- Row click handler

### 2. PageHeader
```
[Page Title]                    [Action Button(s)]
```

### 3. FormField
Wrapper for form inputs with:
- Label
- Input/Select/DatePicker
- Error message
- Required indicator (*)

### 4. Badge
Colored label for status values:
- Blue: DISPATCHED
- Green: DIRECT, ACTIVE, RECEIVED
- Yellow: MAINTENANCE, RAISED
- Gray: INACTIVE, CREATED
- Red: RETIRED

### 5. Modal
Confirmation dialog with:
- Title
- Message
- Cancel + Confirm buttons
- Click-outside-to-close

### 6. Toast
Success/Error notification that auto-dismisses after 3 seconds.

### 7. LoadingSpinner
Centered spinner for page-level loading states.

---

## API Client Setup

Create a base API client that all services use:

```typescript
// src/lib/api.ts
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  return res.json();
}
```

## Auth Context

```typescript
// src/context/AuthContext.tsx
interface AuthUser {
  userId: string;
  email: string;
  organizationId: string;
  role: 'OWNER' | 'ADMIN' | 'DISPATCHER' | 'MEMBER' | 'VIEWER';
  name?: string;
}

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  login: (email: string, password: string, organizationSlug: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}
```

## Route Structure

```typescript
// src/App.tsx routes
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
    <Route path="/" element={<Navigate to="/dashboard" />} />
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/jobs" element={<JobsListPage />} />
    <Route path="/jobs/new" element={<JobFormPage />} />
    <Route path="/jobs/:id/edit" element={<JobFormPage />} />
    {/* Groups 2 and 3 will add more routes here */}
  </Route>
</Routes>
```

---

## Summary

Generate these 5 screens:
1. **App Shell** – Sidebar + header layout with React Router Outlet
2. **Login** – Centered form, JWT auth, redirect on success
3. **Dashboard** – 4 summary cards + recent jobs table
4. **Jobs List** – Filterable, sortable, paginated table with lookup resolution
5. **Job Create/Edit** – Dynamic form with sourceType toggle controlling conditional fields

All data is fetched from the REST API. No mock data – use real API calls with proper loading and error states. The UI should be production-quality, not a prototype.
