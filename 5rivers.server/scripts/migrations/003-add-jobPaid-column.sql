-- Add jobPaid column to Jobs table (separate from driverPaid)
-- jobPaid = payment received from client (linked to invoice RECEIVED status)
-- driverPaid = driver has been paid for this job
IF NOT EXISTS (
  SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Jobs') AND name = 'jobPaid'
)
BEGIN
  ALTER TABLE Jobs ADD jobPaid BIT NOT NULL DEFAULT 0;
END
