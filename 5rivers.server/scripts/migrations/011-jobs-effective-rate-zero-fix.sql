-- Recreate `vJobsEffective` so it explicitly returns NULL when the job
-- type's rate is NULL OR ≤ 0. Previously the `fixed` branch returned 0
-- when the rate was 0, and the `load` branch returned 0 × loads = 0.
-- The TypeScript `computeJobAmountFromInputs` treats those as
-- "rate pending" → null. This view must agree, or the SQL/TS test parity
-- suite will report drift.
--
-- Idempotent: CREATE OR ALTER on every run.

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
  j.amount,
  j.carrierAmount,
  j.ticketIds,
  j.jobPaid,
  j.driverPaid,
  j.createdAt,
  j.updatedAt,
  COALESCE(
    j.amount,
    CASE
      -- Rate-pending guard: any non-positive / NULL rate short-circuits to NULL,
      -- matching `computeJobAmountFromInputs` in job.service.ts.
      WHEN jt.rateOfJob IS NULL OR jt.rateOfJob <= 0 THEN NULL
      ELSE
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
          -- Tonnage: weight string parsing isn't feasible in pure T-SQL.
          -- These rows contribute only via a manual override on j.amount.
          WHEN 'tonnage' THEN NULL
          ELSE jt.rateOfJob          -- unknown dispatchType → flat-rate fallback
        END
    END
  ) AS effectiveAmount
FROM Jobs j
LEFT JOIN JobTypes jt ON j.jobTypeId = jt.id;
GO
