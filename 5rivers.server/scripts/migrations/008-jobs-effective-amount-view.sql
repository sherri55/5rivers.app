-- Add a SQL VIEW that exposes `effectiveAmount` for every job — either the
-- explicit override stored in `Jobs.amount` OR the live calculation from
-- the JobType's rate × the job's own hours/loads/weight.
--
-- This is the single source of truth for amount computation server-side,
-- mirroring `lib/format.ts → computeJobPreviewAmount` in the UI. Analytics
-- queries should `SUM(effectiveAmount)` instead of `SUM(j.amount)` so that
-- jobs without an override (the common case in the dynamic-calc model)
-- still contribute their calculated value to totals.
--
-- Re-create on every run with CREATE OR ALTER so the script is idempotent.

CREATE OR ALTER VIEW vJobsEffective AS
SELECT
  j.id,
  j.organizationId,
  j.jobDate,
  j.jobTypeId,
  j.driverId,
  j.dispatcherId,
  j.unitId,
  j.carrierId,
  j.sourceType,
  j.weight,
  j.loads,
  j.startTime,
  j.endTime,
  j.amount,                      -- raw override column (NULL = no override)
  j.carrierAmount,
  j.ticketIds,
  j.jobPaid,
  j.driverPaid,
  j.createdAt,
  j.updatedAt,
  COALESCE(
    j.amount,
    CASE LOWER(jt.dispatchType)
      WHEN 'fixed'   THEN jt.rateOfJob
      WHEN 'load'    THEN jt.rateOfJob * COALESCE(j.loads, 1)
      WHEN 'loads'   THEN jt.rateOfJob * COALESCE(j.loads, 1)
      WHEN 'hourly'  THEN
        CASE
          WHEN j.startTime IS NOT NULL
           AND j.endTime IS NOT NULL
           AND j.endTime > j.startTime
          THEN jt.rateOfJob * (DATEDIFF(SECOND, j.startTime, j.endTime) / 3600.0)
          ELSE NULL
        END
      -- Tonnage: weight is stored as a JSON / space-delimited string which
      -- isn't feasible to sum in pure T-SQL. Falls through to NULL — only
      -- a manual override on j.amount can contribute these rows to totals.
      -- If tonnage volume grows enough to matter, denormalize weight sum
      -- into its own column at save time.
      WHEN 'tonnage' THEN NULL
      ELSE jt.rateOfJob          -- unknown dispatchType → flat-rate fallback
    END
  ) AS effectiveAmount
FROM Jobs j
LEFT JOIN JobTypes jt ON j.jobTypeId = jt.id;
GO
