-- Add a SQL VIEW that exposes `effectiveAmount` for every invoice line:
-- the explicit override stored in `JobInvoice.amount` if set, otherwise
-- the underlying job's `effectiveAmount` (from vJobsEffective, which is
-- the override OR computed rate × inputs).
--
-- This means invoice totals, outstanding amounts, and PDF exports all
-- track the current job-type rate automatically — without requiring a
-- backfill whenever a rate changes.
--
-- `JobInvoice.amount` is now an override-only column. NULL = inherit
-- from the job. The route handler accepts the amount as optional.
--
-- Idempotent: CREATE OR ALTER on each run.

CREATE OR ALTER VIEW vJobInvoiceEffective AS
SELECT
  ji.jobId,
  ji.invoiceId,
  ji.amount,                   -- raw override on the invoice line (NULL = inherit)
  ji.addedAt,
  COALESCE(ji.amount, j.effectiveAmount) AS effectiveAmount
FROM JobInvoice ji
LEFT JOIN vJobsEffective j ON j.id = ji.jobId;
GO
