---
name: Rate Pending Feature
description: Handling jobs where the rate isn't known upfront — nullable rates, auto-calc, backfill, UI indicators
type: feature
---

# Rate Pending Feature

## Problem
Sometimes a job type's rate isn't known upfront (new route, pending negotiation). Jobs get created but have no amount. Previously there was no way to distinguish "rate unknown" from "free" (both were 0), and no visual indicator to flag these jobs.

## Design
- `JobTypes.rateOfJob` is now **nullable**: `NULL` = rate not yet known, `0` = free
- `Jobs.amount` remains nullable: `NULL` when rate is pending or data insufficient
- Server auto-calculates amount from job type rate when amount isn't explicitly provided
- When a rate is confirmed on a job type, all NULL-amount jobs of that type are backfilled
- UI shows amber badges/indicators for rate-pending jobs

## Schema
- Migration 006: `ALTER TABLE JobTypes ALTER COLUMN rateOfJob DECIMAL(18,2) NULL`
- `Jobs.amount` was already `DECIMAL(18,2) NULL` (no change)

## Server (`5rivers.server`)

### Auto-calculation (`job.service.ts`)
`autoCalcAmount(orgId, jobTypeId, loads, weight, startTime, endTime)`:
- `load` → `rate * (loads || 1)`
- `fixed` → `rate`
- `hourly` → `rate * hours` (from start/end times, if both provided)
- `tonnage` → `rate * weight` (if weight provided)
- Returns `null` if rate is NULL (pending) or insufficient data

Called in both `createJob` and `updateJob` when amount is not explicitly provided.

### Backfill (`jobType.service.ts`)
`backfillJobAmounts(orgId, jobTypeId)`:
- Triggered automatically when `updateJobType` detects rate changed from NULL → value
- Updates all jobs of that type where `amount IS NULL`
- Only for `load`/`fixed` dispatch types (hourly/tonnage need per-job data)
- SQL: `UPDATE j SET j.amount = @rate * COALESCE(j.loads, 1) FROM Jobs j WHERE j.jobTypeId = @jobTypeId AND j.amount IS NULL`

## MCP Tools (`5rivers.app.mcp`)
- **`update_job_type`** — New tool. Accepts `id` (required), optional `title`, `rateOfJob`, `dispatchType`, `startLocation`, `endLocation`. Allows `rateOfJob: null` to clear rate back to pending. Server auto-triggers backfill when rate is confirmed.
- **`create_job_type`** — Updated description: "Omit or set to null if rate is not yet known"
- **`fmtMoney()`** — Returns `"⏳ pending"` for null amounts (flows through to job tables/details)

## UI Indicators

### JobsListPage
- **Amount column**: Amber pill badge with `pending` icon and "No Rate" text when `amount == null`
- **Job Type column**: Shows "Rate Pending" in amber text when `rateOfJob` is null/0 (replaces the rate currency display)
- **Selection totals bar**: Shows "(X jobs excluded — no rate)" when selected jobs include null-amount entries

### JobFormPage
- **Job type select**: Shows "Rate Pending" instead of formatted rate when rate is null/0
- **Amber warning banner**: Appears when a rate-pending job type is selected: "Rate not yet set for this job type. Enter an amount manually or update the job type rate later."
- **Calculated Amount preview**: Shows amber "Rate Pending" box instead of green calculated amount when rate is null/0

## Typical Flow
```
1. New route, rate unknown → create job type with rate = NULL
2. Jobs created from tickets → amount auto-set to NULL
3. Jobs list shows amber "No Rate" badges
4. Rate gets negotiated/confirmed → update_job_type(id, rateOfJob: 85)
5. Server backfills all NULL-amount jobs of that type
6. Badges disappear, amounts now show correctly
```
