# Stitch Prompt – Group 3: Units, Carriers, Invoices, Settings

## Project Context

This is **Group 3** of the **5Rivers Trucking** frontend. Groups 1 (App Shell, Login, Dashboard, Jobs) and 2 (Drivers, Companies, Dispatchers) are already built and working. This group adds fleet asset management, carrier network, invoicing, and organization settings.

**Existing Design System:** Use the exact same design language from Group 1 & 2 — Inter font, Precision Blue (#004ac6) primary, slate neutrals, ghost borders, gradient-primary buttons, Material Symbols Outlined icons. Light mode only. Same sidebar layout with the relevant nav item highlighted.

**Consistency Rules (CRITICAL):**
- Primary action buttons: `gradient-primary text-white px-6 py-2.5 rounded-lg font-semibold text-sm shadow-md` with icon
- Secondary buttons: `bg-surface-container-low text-on-surface-variant px-5 py-2.5 rounded-lg font-medium text-sm border border-outline-variant/20`
- Danger buttons: `bg-red-50 text-red-600 border border-red-200 px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-red-100`
- Page subtitle: `text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1 block`
- Page title: `text-3xl font-semibold tracking-tight text-on-surface`
- Table header: `text-[11px] font-bold uppercase tracking-wider text-slate-500`
- Form labels: `text-[11px] font-bold text-slate-400 uppercase tracking-wider`
- Form inputs: `bg-surface-container rounded-lg border-none text-sm font-medium py-3 focus:bg-white focus:ring-1 focus:ring-primary`
- Card container: `bg-surface-container-lowest rounded-xl ghost-border` (where ghost-border = `border: 1px solid rgba(195, 198, 215, 0.15)`)
- Icon size in buttons: `text-[18px]`
- Table row hover: `hover:bg-slate-50/50 transition-colors`
- Badge style: `px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border`
- Section dividers in forms: blue left bar accent (4px wide, primary color) with section heading text

---

## Screen 1: Units List

**Route:** `/units`

### Page Header:
```
[Subtitle: Fleet Assets]
Units                                              [+ New Unit]
```

### Units Display — Card Grid (3 cols desktop, 2 cols tablet, 1 col mobile):

Each card represents a truck/unit:

```
┌──────────────────────────────────────────────┐
│  ┌────────────────────────────────────────┐   │
│  │        [truck icon placeholder]        │   │
│  │        Color swatch dot                │   │
│  └────────────────────────────────────────┘   │
│                                                │
│  Unit Name (bold, lg)                          │
│  2024 Peterbilt 579 (year make model, muted)   │
│                                                │
│  Status Badge: ● ACTIVE / MAINTENANCE / etc    │
│                                                │
│  Plate: ABC-1234       VIN: ...last 6 chars    │
│  Mileage: 124,500 mi                          │
│                                                │
│  Insurance: Expires Mar 15, 2026               │
│  Next Service: Apr 1, 2026                     │
│                                                │
│                              [Edit] [Delete]   │
└────────────────────────────────────────────────┘
```

### Status Badge Colors:
- **ACTIVE**: Green background, green text, green dot
- **INACTIVE**: Gray background, gray text
- **MAINTENANCE**: Yellow/amber background, amber text, wrench icon
- **RETIRED**: Red background, red text

### Features:
- Search bar: "Search units by name, plate, or VIN..."
- Filter dropdown for Status: All, Active, Inactive, Maintenance, Retired
- Pagination
- Click card → navigate to edit page

---

## Screen 2: Unit Create / Edit Form

**Routes:** `/units/new`, `/units/:id/edit`

### Form Layout:
```
┌─────────────────────────────────────────────────────────┐
│ [Subtitle: Fleet Assets > Add Unit]                      │
│ Add Unit / Edit Unit                                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ── Unit Identification ──                                │
│ (blue left bar accent)                                   │
│                                                          │
│  Name *            [  ________________  ]                │
│  Status            [  Select...  ▾]                      │
│  Color             [  ________________  ] + color swatch │
│  Description       [  ________________  ] (textarea)     │
│                                                          │
│ ── Vehicle Details ──                                    │
│ (secondary left bar accent)                              │
│                                                          │
│  Year              [  ____  ]                            │
│  Make              [  ________________  ]                │
│  Model             [  ________________  ]                │
│  Plate Number      [  ________________  ]                │
│  VIN               [  ________________  ]                │
│  Mileage           [  ________ mi  ]                     │
│                                                          │
│ ── Maintenance & Insurance ──                            │
│ (third section)                                          │
│                                                          │
│  Insurance Expiry       [  📅 Date picker  ]             │
│  Last Maintenance Date  [  📅 Date picker  ]             │
│  Next Maintenance Date  [  📅 Date picker  ]             │
│                                                          │
│ [Delete] (left, edit only)       [Cancel]  [Save Unit]   │
└─────────────────────────────────────────────────────────┘
```

### Field Details:

| Field | Type | Required | Default |
|-------|------|----------|---------|
| name | text | Yes | — |
| status | select (ACTIVE, INACTIVE, MAINTENANCE, RETIRED) | Yes | ACTIVE |
| color | text (with color preview dot) | No | — |
| description | textarea (3 rows) | No | — |
| year | number (4 digits) | No | — |
| make | text | No | — |
| model | text | No | — |
| plateNumber | text | No | — |
| vin | text | No | — |
| mileage | number | No | — |
| insuranceExpiry | date | No | — |
| lastMaintenanceDate | date | No | — |
| nextMaintenanceDate | date | No | — |

### Visual Notes:
- Color field should show a small colored dot preview next to the input (e.g., if user types "Red", show a red dot — or use a simple color input picker)
- Date fields should use native date inputs styled to match the design system
- Three-column grid for Year / Make / Model row on desktop

### API:
```
POST   /api/units           { name, status?, color?, description?, year?, make?, model?, plateNumber?, vin?, mileage?, insuranceExpiry?, lastMaintenanceDate?, nextMaintenanceDate? }
PATCH  /api/units/:id       { ...partial }
GET    /api/units/:id
DELETE /api/units/:id
```

---

## Screen 3: Carriers List

**Route:** `/carriers`

### Page Header:
```
[Subtitle: Carrier Network]
Carriers                                           [+ New Carrier]
```

### Carriers Table:

| Column | Details |
|--------|---------|
| Carrier | Name (bold) + contact person below in smaller text |
| Email | Email address |
| Phone | Phone number |
| Rate Type | Badge: Blue "PERCENTAGE" / Green "FLAT_PER_JOB" / Indigo "FLAT_PER_LOAD" / Amber "FLAT_PER_TON" / Gray "HOURLY" |
| Rate | Display contextually: "15%" for PERCENTAGE, "$250.00" for flat types, "$45.00/hr" for HOURLY |
| Status | Dot + text: Green "Active" / Gray "Inactive" |
| Actions | Edit (pencil), Delete (trash) icons |

### Features:
- Sortable by: name, rateType, rate, status, createdAt
- Filterable by: name, email, rateType, status
- Paginated (20 per page)
- Search bar: "Search carriers..."
- Filter dropdown for Status: All, Active, Inactive
- Filter dropdown for Rate Type: All, Percentage, Flat Per Job, Flat Per Load, Flat Per Ton, Hourly

---

## Screen 4: Carrier Create / Edit Form

**Routes:** `/carriers/new`, `/carriers/:id/edit`

### Form Layout:
```
┌─────────────────────────────────────────────────────────┐
│ [Subtitle: Carrier Network > Add Carrier]                │
│ Add Carrier / Edit Carrier                               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ── Carrier Information ──                                │
│ (blue left bar accent)                                   │
│                                                          │
│  Name *              [  ________________  ]              │
│  Contact Person      [  ________________  ]              │
│  Email               [  ________________  ]              │
│  Phone               [  ________________  ]              │
│  Status              [  Select...  ▾]                    │
│  Description         [  ________________  ] (textarea)   │
│                                                          │
│ ── Rate Configuration ──                                 │
│ (secondary left bar accent)                              │
│                                                          │
│  Rate Type           [  Select...  ▾]                    │
│                      Options: Percentage, Flat Per Job,  │
│                      Flat Per Load, Flat Per Ton, Hourly  │
│                                                          │
│  IF PERCENTAGE:                                          │
│  Rate (%)            [  ________%  ]                     │
│                                                          │
│  IF FLAT_PER_JOB / FLAT_PER_LOAD / FLAT_PER_TON:        │
│  Rate ($)            [  $________  ]                     │
│                                                          │
│  IF HOURLY:                                              │
│  Rate ($/hr)         [  $________  ]                     │
│                                                          │
│ [Delete] (left, edit only)     [Cancel]  [Save Carrier]  │
└─────────────────────────────────────────────────────────┘
```

### Field Details:

| Field | Type | Required | Default |
|-------|------|----------|---------|
| name | text | Yes | — |
| contactPerson | text | No | — |
| email | email | No | — |
| phone | tel | No | — |
| status | select (ACTIVE, INACTIVE) | Yes | ACTIVE |
| description | textarea (3 rows) | No | — |
| rateType | select (PERCENTAGE, FLAT_PER_JOB, FLAT_PER_LOAD, FLAT_PER_TON, HOURLY) | Yes | PERCENTAGE |
| rate | number, step 0.01 | No | 0 |

### Conditional Logic:
- Rate field label and suffix change based on rateType selection
- PERCENTAGE → "Rate (%)" with % suffix
- FLAT types → "Rate ($)" with $ prefix
- HOURLY → "Rate ($/hr)" with $/hr label

### API:
```
POST   /api/carriers           { name, contactPerson?, email?, phone?, status?, description?, rateType, rate? }
PATCH  /api/carriers/:id       { ...partial }
GET    /api/carriers/:id
DELETE /api/carriers/:id
```

---

## Screen 5: Invoices List

**Route:** `/invoices`

### Page Header:
```
[Subtitle: Billing & Invoices]
Invoices                                           [+ New Invoice]
```

### Invoices Table:

| Column | Details |
|--------|---------|
| Invoice # | Bold invoice number (e.g., "INV-2026-0001") |
| Date | Formatted date (Mar 15, 2026) |
| Status | Badge: Blue "CREATED" / Yellow "RAISED" / Green "RECEIVED" |
| Billed To | Name from billedTo field, or dispatcher/company name resolved |
| Email | billedEmail |
| Jobs | Count of linked jobs (number badge) |
| Total | Sum of job amounts linked to this invoice (calculated, shown as currency) |
| Actions | View/Edit (pencil), Delete (trash) icons |

### Features:
- Sortable by: invoiceNumber, invoiceDate, status, createdAt
- Filterable by: invoiceNumber, status, dispatcherId, companyId
- Filter dropdown for Status: All, Created, Raised, Received
- Search bar: "Search by invoice number..."
- Paginated (20 per page)
- Date range filter: From date / To date

---

## Screen 6: Invoice Create / Edit Form

**Routes:** `/invoices/new`, `/invoices/:id/edit`

### Form Layout:
```
┌─────────────────────────────────────────────────────────────┐
│ [Subtitle: Billing & Invoices > Create Invoice]              │
│ Create Invoice / Edit Invoice                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ── Invoice Details ──                                        │
│ (blue left bar accent)                                       │
│                                                              │
│  Invoice Number *    [  INV-________  ]                      │
│  Invoice Date *      [  📅 Date picker  ]                    │
│  Status              [  Select...  ▾]                        │
│                      Options: Created, Raised, Received      │
│                                                              │
│ ── Billing Information ──                                    │
│ (secondary left bar accent)                                  │
│                                                              │
│  Billing Type        ( ● Dispatcher ) ( ○ Company )          │
│                                                              │
│  IF DISPATCHER:                                              │
│  Dispatcher          [  Select...  ▾]                        │
│                                                              │
│  IF COMPANY:                                                 │
│  Company             [  Select...  ▾]                        │
│                                                              │
│  Billed To (Name)    [  ________________  ]                  │
│  Billed Email        [  ________________  ]                  │
│                                                              │
│ [Delete] (left, edit only)       [Cancel]  [Save Invoice]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ── Linked Jobs ── (only shown in edit mode)                  │
│                                              [+ Add Jobs]    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │ Mar 12  │ FTL Chicago→Detroit │ Driver A │ $450.00  │     │
│  │         │ INV Amount: $450.00            [Remove]   │     │
│  ├─────────────────────────────────────────────────────┤     │
│  │ Mar 13  │ Reefer Dallas→Houston│ Driver B│ $380.00  │     │
│  │         │ INV Amount: $380.00            [Remove]   │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  Invoice Total: $830.00                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Invoice Fields:

| Field | Type | Required | Default |
|-------|------|----------|---------|
| invoiceNumber | text | Yes | — |
| invoiceDate | date | Yes | today |
| status | select (CREATED, RAISED, RECEIVED) | Yes | CREATED |
| dispatcherId | select (dropdown of dispatchers) | No | — |
| companyId | select (dropdown of companies) | No | — |
| billedTo | text | No | — |
| billedEmail | email | No | — |

### Linked Jobs Sub-section (edit mode only):
- Shows jobs attached to this invoice with their date, job type, driver, amount
- Each linked job shows the invoice amount (from JobInvoice.amount)
- **Add Jobs** opens a modal showing unlinked jobs (filterable by date range, dispatcher, company)
- User can select multiple jobs and specify the invoice amount for each
- **Remove** unlinks a job from the invoice
- Invoice Total is calculated as sum of all linked job amounts

### Add Jobs Modal:
```
┌─────────────────────────────────────────────────────────┐
│ Add Jobs to Invoice                              [✕]    │
├─────────────────────────────────────────────────────────┤
│ Filter: [Date From] [Date To] [Company ▾]               │
│                                                         │
│ ☐ Mar 14 │ FTL Chicago→Detroit │ Driver C │ $450.00    │
│   Amount: [  $450.00  ]                                 │
│ ☐ Mar 14 │ Reefer Load │ Driver A │ $320.00            │
│   Amount: [  $320.00  ]                                 │
│ ☐ Mar 15 │ Flatbed Haul │ Driver B │ $550.00           │
│   Amount: [  $550.00  ]                                 │
│                                                         │
│                           [Cancel]  [Add Selected Jobs]  │
└─────────────────────────────────────────────────────────┘
```

### API:
```
POST   /api/invoices                 { invoiceNumber, invoiceDate, status?, dispatcherId?, companyId?, billedTo?, billedEmail? }
PATCH  /api/invoices/:id             { ...partial }
GET    /api/invoices/:id
DELETE /api/invoices/:id

GET    /api/invoices/:id/jobs        → returns linked jobs with amounts
POST   /api/invoices/:id/jobs        { jobId, amount }
DELETE /api/invoices/:id/jobs/:jobId → unlinks a job
```

---

## Screen 7: Settings Page

**Route:** `/settings`

### Page Layout:
```
┌─────────────────────────────────────────────────────────────┐
│ [Subtitle: Configuration]                                    │
│ Settings                                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ── Organization Profile ──                                   │
│ (blue left bar accent)                                       │
│                                                              │
│  Organization Name    [  5Rivers Trucking  ]                 │
│  Organization Slug    [  5rivers  ] (read-only, grayed out)  │
│                                                              │
│                                            [Save Changes]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ── User Account ──                                           │
│ (secondary left bar accent)                                  │
│                                                              │
│  Your Name           [  Admin User  ]                        │
│  Email               [  admin@5rivers.com  ] (read-only)     │
│  Role                [  ADMIN  ] (read-only badge)           │
│                                                              │
│ ── Change Password ──                                        │
│                                                              │
│  Current Password    [  ••••••••  ]                          │
│  New Password        [  ••••••••  ]                          │
│  Confirm Password    [  ••••••••  ]                          │
│                                                              │
│                                         [Update Password]    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ── Danger Zone ──                                            │
│ (red left bar accent, red-tinted background)                 │
│                                                              │
│  Delete Account                                              │
│  "Permanently delete your account and all associated data."  │
│                                                              │
│                                        [Delete Account]      │
│                                        (red danger button)   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Visual Notes:
- Settings should be a single scrollable page with clearly divided sections
- Organization Profile and User Account sections are visually separate cards
- The Danger Zone section has a subtle red-tinted background (`bg-red-50/50`) with a red left bar accent
- Read-only fields have `bg-surface-container-highest opacity-60 cursor-not-allowed` styling
- Password fields have show/hide toggle buttons (same pattern as Login page)

---

## Mobile Considerations

All screens should be responsive:
- **Card grids** (Units) → single column on mobile
- **Tables** (Carriers, Invoices) → collapse to card-based lists on mobile (< 768px)
- **Forms** → single column on mobile, 2-3 columns on desktop where appropriate
- **Action buttons** → full width on mobile at bottom of forms
- **Settings** → stacked sections, full-width inputs
- **Add Jobs Modal** → full-screen on mobile with scrollable job list

---

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

Generate these 7 screens:
1. **Units List** — Card grid with truck details, status badges, maintenance dates
2. **Unit Create/Edit** — Three-section form (Identification, Vehicle Details, Maintenance)
3. **Carriers List** — Table with rate type badges, contextual rate display, status dots
4. **Carrier Create/Edit** — Form with rate type dropdown and contextual rate field label
5. **Invoices List** — Table with status badges, linked job count, calculated totals
6. **Invoice Create/Edit** — Form with billing type toggle + nested linked jobs section (edit mode)
7. **Settings** — Single page with Organization, User Account, Password Change, Danger Zone sections

Use the exact same design system, colors, typography, spacing, and component patterns as Groups 1 & 2. The sidebar should show the relevant nav item as active (e.g. "Units" highlighted when on units pages, "Settings" highlighted on settings page).
