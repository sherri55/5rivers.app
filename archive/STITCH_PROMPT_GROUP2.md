# Stitch Prompt – Group 2: Drivers, Companies, Job Types, Dispatchers

## Project Context

This is **Group 2** of the **5Rivers Trucking** frontend. Group 1 (App Shell, Login, Dashboard, Jobs) is already built and working. This group adds the entity management screens that feed into jobs.

**Existing Design System:** Use the exact same design language from Group 1 — Inter font, Precision Blue (#004ac6) primary, slate neutrals, ghost borders, gradient-primary buttons, Material Symbols Outlined icons. Light mode. Same sidebar layout.

**Consistency Rules (CRITICAL):**
- Primary action buttons: `gradient-primary text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-md` with icon
- Secondary buttons: `bg-surface-container-low text-on-surface-variant px-5 py-2.5 rounded-lg font-medium text-sm border border-outline-variant/20`
- Page subtitle: `text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1 block`
- Page title: `text-3xl font-semibold tracking-tight text-on-surface`
- Table header: `text-[11px] font-bold uppercase tracking-wider text-slate-500`
- Form labels: `text-[11px] font-bold text-slate-400 uppercase tracking-wider`
- Form inputs: `bg-surface-container rounded-lg border-none text-sm font-medium py-3 focus:bg-white focus:ring-1 focus:ring-primary`
- Card container: `bg-surface-container-lowest rounded-xl ghost-border` (where ghost-border = `border: 1px solid rgba(195, 198, 215, 0.15)`)
- Icon size in buttons: `text-[18px]`
- Table row hover: `hover:bg-slate-50/50 transition-colors`
- Badge style: `px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border`

---

## Screen 1: Drivers List

**Route:** `/drivers`

### Page Header:
```
[Subtitle: Fleet Personnel]
Drivers                                        [+ New Driver]
```

### Drivers Table:

| Column | Details |
|--------|---------|
| Driver | Avatar circle with initials + name (bold) + email below in smaller text |
| Phone | Phone number, slate text |
| Pay Type | Badge: Blue "HOURLY" / Green "PERCENTAGE" / Gray "CUSTOM" |
| Hourly Rate | Currency format, only show if payType is HOURLY or CUSTOM. Show "—" otherwise |
| Percentage | Show as "15%" format, only show if payType is PERCENTAGE or CUSTOM. Show "—" otherwise |
| Actions | Edit (pencil), Delete (trash) icons |

### Features:
- Sortable by: name, hourlyRate, percentageRate, payType, createdAt
- Filterable by: name, email, phone, payType
- Paginated (20 per page)
- Click row → navigate to edit
- Search bar: "Search by name or email..."
- Filter dropdown for Pay Type: All, Hourly, Percentage, Custom

---

## Screen 2: Driver Create / Edit Form

**Routes:** `/drivers/new`, `/drivers/:id/edit`

### Form Layout:
```
┌─────────────────────────────────────────────────────────┐
│ [Subtitle: Fleet Personnel > Create Driver]             │
│ Create Driver / Edit Driver                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ── Personal Information ──                              │
│ (blue left bar accent, section heading)                 │
│                                                         │
│  Name *             [  ________________  ]              │
│  Email              [  ________________  ]              │
│  Phone              [  ________________  ]              │
│  Description        [  ________________  ] (textarea)   │
│                                                         │
│ ── Pay Configuration ──                                 │
│ (secondary left bar accent, section heading)            │
│                                                         │
│  Pay Type           ( ● Hourly ) ( ○ Percentage )       │
│                     ( ○ Custom )                         │
│                                                         │
│  IF HOURLY:                                             │
│  Hourly Rate ($)    [  $________  ]                     │
│                                                         │
│  IF PERCENTAGE:                                         │
│  Percentage Rate(%) [  ________%  ]                     │
│                                                         │
│  IF CUSTOM:                                             │
│  Hourly Rate ($)    [  $________  ]                     │
│  Percentage Rate(%) [  ________%  ]                     │
│  (Note: "Pay is set manually per job")                  │
│                                                         │
│                           [Cancel]  [Save Driver]       │
└─────────────────────────────────────────────────────────┘
```

### Field Details:

| Field | Type | Required | Default |
|-------|------|----------|---------|
| name | text | Yes | — |
| email | email | No | — |
| phone | tel | No | — |
| description | textarea (3 rows) | No | — |
| payType | Radio group (3 options) | Yes | HOURLY |
| hourlyRate | number, step 0.01 | No | 0 |
| percentageRate | number, step 0.01 | No | 0 |

### Conditional Logic:
- **HOURLY selected** → Show hourlyRate field, hide percentageRate
- **PERCENTAGE selected** → Show percentageRate field, hide hourlyRate
- **CUSTOM selected** → Show both hourlyRate and percentageRate fields + info note

### API:
```
POST   /api/drivers           { name, email?, phone?, description?, payType, hourlyRate?, percentageRate? }
PATCH  /api/drivers/:id       { ...partial }
GET    /api/drivers/:id
DELETE /api/drivers/:id
```

---

## Screen 3: Companies List

**Route:** `/companies`

### Page Header:
```
[Subtitle: Client Management]
Companies                                      [+ New Company]
```

### Companies Display — Card Grid (NOT table):
Use a responsive card grid (2 cols desktop, 1 col mobile) instead of a table. Each card:

```
┌──────────────────────────────────────────────┐
│  [Company Logo placeholder circle]           │
│  Company Name (bold, lg)                     │
│  Industry badge (if set)                     │
│                                              │
│  📧 email@company.com                        │
│  📞 (555) 123-4567                           │
│  📍 Location text                            │
│                                              │
│  Job Types: 3                  [Edit] [Del]  │
└──────────────────────────────────────────────┘
```

### Features:
- Search bar: "Search companies..."
- Pagination
- Click card → navigate to edit page (which also shows job types)
- The "Job Types: N" count shows how many job types belong to this company

---

## Screen 4: Company Create / Edit Form (with Job Types)

**Routes:** `/companies/new`, `/companies/:id/edit`

### Form Layout:
```
┌─────────────────────────────────────────────────────────┐
│ [Subtitle: Client Management > Edit Company]            │
│ Edit Company                                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ── Company Information ──                               │
│                                                         │
│  Name *             [  ________________  ]              │
│  Email              [  ________________  ]              │
│  Phone              [  ________________  ]              │
│  Website            [  ________________  ]              │
│  Industry           [  ________________  ]              │
│  Location           [  ________________  ]              │
│  Size               [  Select...  ▾]                    │
│  Founded            [  ____  ] (year number)            │
│  Description        [  ________________  ] (textarea)   │
│                                                         │
│                           [Cancel]  [Save Company]      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ── Job Types ── (only shown in edit mode)               │
│                                          [+ Add Type]   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Full Truckload (FTL)                            │    │
│  │ Chicago, IL → Detroit, MI    Rate: $450.00      │    │
│  │ Dispatch Type: STANDARD        [Edit] [Delete]  │    │
│  ├─────────────────────────────────────────────────┤    │
│  │ Reefer Haul                                     │    │
│  │ Dallas, TX → Houston, TX    Rate: $380.00       │    │
│  │ Dispatch Type: STANDARD        [Edit] [Delete]  │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Company Fields:

| Field | Type | Required |
|-------|------|----------|
| name | text | Yes |
| email | email | No |
| phone | tel | No |
| website | url | No |
| industry | text | No |
| location | text | No |
| size | select (1-10, 11-50, 51-200, 201-500, 500+) | No |
| founded | number (year) | No |
| description | textarea | No |

### Job Types Sub-section (edit mode only):
- Listed as cards/rows within the company form
- Each shows: title, startLocation → endLocation, rateOfJob, dispatchType
- **Add Type** opens an inline form or modal:

| Field | Type | Required |
|-------|------|----------|
| title | text | Yes |
| startLocation | text | No |
| endLocation | text | No |
| dispatchType | select (STANDARD, HOURLY, PER_TON, PER_LOAD) | Yes, default STANDARD |
| rateOfJob | number, step 0.01 | No, default 0 |

### API:
```
POST   /api/companies           { name, email?, phone?, ... }
PATCH  /api/companies/:id       { ...partial }
GET    /api/companies/:id
DELETE /api/companies/:id

GET    /api/job-types?companyId=X
POST   /api/job-types           { companyId, title, startLocation?, endLocation?, dispatchType?, rateOfJob? }
PATCH  /api/job-types/:id       { ...partial }
DELETE /api/job-types/:id
```

---

## Screen 5: Dispatchers List

**Route:** `/dispatchers`

### Page Header:
```
[Subtitle: Dispatch Network]
Dispatchers                                    [+ New Dispatcher]
```

### Dispatchers Table:

| Column | Details |
|--------|---------|
| Name | Bold name + description below in smaller text |
| Email | Email address |
| Phone | Phone number |
| Commission | Percentage badge, e.g. "5.00%" in a subtle styled format |
| Actions | Edit (pencil), Delete (trash) icons |

### Features:
- Sortable by: name, email, phone, commissionPercent, createdAt
- Filterable by: name, email, phone
- Paginated (20 per page)
- Search bar: "Search dispatchers..."

---

## Screen 6: Dispatcher Create / Edit Form

**Routes:** `/dispatchers/new`, `/dispatchers/:id/edit`

### Form Layout:
Simple single-section form:

```
┌─────────────────────────────────────────────────────────┐
│ [Subtitle: Dispatch Network > Create Dispatcher]        │
│ Create Dispatcher                                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ── Dispatcher Information ──                            │
│                                                         │
│  Name *             [  ________________  ]              │
│  Email              [  ________________  ]              │
│  Phone              [  ________________  ]              │
│  Commission (%)     [  ________%  ]                     │
│  Description        [  ________________  ] (textarea)   │
│                                                         │
│                           [Cancel]  [Save Dispatcher]   │
└─────────────────────────────────────────────────────────┘
```

### Fields:

| Field | Type | Required | Default |
|-------|------|----------|---------|
| name | text | Yes | — |
| email | email | No | — |
| phone | tel | No | — |
| commissionPercent | number, step 0.01 | No | 0 |
| description | textarea | No | — |

### API:
```
POST   /api/dispatchers           { name, email?, phone?, commissionPercent?, description? }
PATCH  /api/dispatchers/:id       { ...partial }
GET    /api/dispatchers/:id
DELETE /api/dispatchers/:id
```

---

## Mobile Considerations

All screens should be responsive:
- **Tables** → collapse to card-based lists on mobile (< 768px)
- **Forms** → single column on mobile, 2-3 columns on desktop
- **Card grids** (Companies) → single column on mobile
- **Action buttons** → full width on mobile at bottom of forms

## Shared Patterns

All list pages follow this structure:
```
┌──────────────────────────────────────────────────────┐
│ [Subtitle]                                           │
│ Page Title                        [Primary Action]   │
├──────────────────────────────────────────────────────┤
│ [Search bar]  [Filter dropdown(s)]  [Clear button]   │
├──────────────────────────────────────────────────────┤
│ Table / Card Grid                                    │
│ ...data rows...                                      │
├──────────────────────────────────────────────────────┤
│ Showing 1-20 of N     [← Prev] [1] [2] ... [Next →] │
└──────────────────────────────────────────────────────┘
```

All forms follow this structure:
```
┌──────────────────────────────────────────────────────┐
│ Breadcrumb: Section > Action                         │
│ Page Title                                           │
│ Subtitle description text                            │
├──────────────────────────────────────────────────────┤
│ ── Section with blue left bar ──                     │
│ Fields in grid layout                                │
├──────────────────────────────────────────────────────┤
│ ── Another section ──                                │
│ More fields                                          │
├──────────────────────────────────────────────────────┤
│ [Delete] (left, edit only)    [Cancel] [Save] (right)│
└──────────────────────────────────────────────────────┘
```

---

## Summary

Generate these 6 screens:
1. **Drivers List** — Table with pay type badges, avatar initials
2. **Driver Create/Edit** — Form with pay type radio toggle (HOURLY/PERCENTAGE/CUSTOM conditional fields)
3. **Companies List** — Card grid with logo placeholder, job type count
4. **Company Create/Edit** — Form + nested Job Types list with inline add/edit
5. **Dispatchers List** — Table with commission display
6. **Dispatcher Create/Edit** — Simple form with commission field

Use the exact same design system, colors, typography, spacing, and component patterns as Group 1. The sidebar should show the relevant nav item as active (e.g. "Drivers" highlighted when on drivers pages).
