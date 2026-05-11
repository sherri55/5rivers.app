-- Allow `JobInvoice.amount` to be NULL.
--
-- In the dynamic-calc model, the column is an override-only field:
-- NULL means "inherit from the underlying job's effectiveAmount via the
-- vJobInvoiceEffective view". Non-NULL means "user manually overrode this
-- specific invoice line's amount" (e.g., a negotiated discount).
--
-- Idempotent: only alters if currently NOT NULL.

IF EXISTS (
  SELECT 1
  FROM sys.columns
  WHERE object_id = OBJECT_ID('JobInvoice')
    AND name = 'amount'
    AND is_nullable = 0
)
  ALTER TABLE JobInvoice ALTER COLUMN amount DECIMAL(18,2) NULL;
GO
