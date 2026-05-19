---
name: Timezone Architecture
description: UTC storage, Eastern display, and cross-stack timezone handling
type: architecture
---

# Timezone Architecture

## Principle
**Store UTC, display Eastern.** All times are stored as UTC in the database. All user-facing display converts to Eastern Time (America/Toronto), which automatically handles EST/EDT transitions.

## Database
- `jobDate` — SQL `DATE` column. The `mssql` driver returns it as `2025-12-05T00:00:00.000Z` (midnight UTC). This is a date-only value; the `T00:00:00.000Z` suffix is a driver artifact.
- `startTime`, `endTime` — SQL `DATETIME2` columns storing proper UTC datetimes. Migrated from `NVARCHAR(20)` via migration 005.

### Migration 005 (`scripts/migrations/005-standardize-job-times-utc.sql`)
Converted legacy string times to DATETIME2 UTC:
1. Normalize `T` separator → space (SQL Server needs `YYYY-MM-DD HH:MM`)
2. Add temp DATETIME2 columns
3. `TRY_CAST(startTime AS DATETIME2) AT TIME ZONE 'Eastern Standard Time' AT TIME ZONE 'UTC'`
4. Drop old columns, rename new ones

## Server (`5rivers.server/src/utils/timezone.ts`)
- `nowUTC()` — Returns `new Date()` (actual UTC)
- `nowEastern()` — Deprecated alias for `nowUTC()` (kept for backward compat)
- `parseTimeInputToUTC(jobDate, timeStr)` — Accepts "07:15", "7:00 AM", "2025-12-05T07:00", "2025-12-05T12:00:00.000Z" → returns UTC Date
- `formatTimeEastern(utcDate)` — Returns "7:00 AM" in Eastern

### Server services
- `job.service.ts` — `createJob()`/`updateJob()` call `parseTimeInputToUTC()` to normalize any time format to UTC before writing
- `driverPay.service.ts` — `extractEasternHM()` converts UTC Date → Eastern hours/minutes for pay calculations
- `pdf.service.ts` — `extractHM()` same pattern for invoice PDF generation

## MCP Tools (`5rivers.app.mcp/src/tools.ts`)
- `fmtDate(val)` — Uses `getUTCMonth()`/`getUTCDate()`/`getUTCFullYear()` to display DATE values correctly (avoids timezone shift on midnight UTC)
- `fmtTime(val)` — Detects UTC ISO strings (ends with Z) → `toLocaleTimeString('en-US', { timeZone: 'America/Toronto' })`. Falls back to regex for legacy formats.
- `fmtMoney(val)` — USD currency formatting

## UI (`5rivers.app.ui/src/lib/format.ts`)
- `formatDate(dateStr)` — Slices to `YYYY-MM-DD`, creates Date with `T00:00:00` (local), displays with `timeZone: 'America/Toronto'`
- `formatTime(timeStr)` — Detects UTC ISO → Eastern display. Legacy HH:MM fallback.
- `extractTimeForInput(timeStr)` — UTC → Eastern `HH:MM` for `<input type="time">` elements
- `parseTimeMinutesET(timeStr)` — Minutes from midnight in Eastern (for hours calculations)
- `todayEastern()` — Today's `YYYY-MM-DD` in Eastern (avoids UTC date boundary issues after 8pm ET)

## Common Pitfalls (resolved)
1. **`jobDate` off by one day:** `toLocaleDateString` with Eastern timezone shifts midnight UTC to previous day. Fix: use `getUTCMonth()`/`getUTCDate()` directly.
2. **`nowEastern()` was buggy:** Created a Date with Eastern value pretending to be UTC. Fixed to just return `new Date()`.
3. **UI time inputs empty after migration:** API returns `"2025-12-05T12:00:00.000Z"` but old regex expected `HH:MM` at end. Fixed with `extractTimeForInput()`.
4. **SQL Server `CAST` with T separator:** `CAST('2025-12-05T07:00' AS DATETIME2)` fails. Must replace `T` with space first.
