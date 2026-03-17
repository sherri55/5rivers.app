-- Add payment tracking fields to DriverPayment (date, mode of payment, notes).
-- Run this on existing databases that already have DriverPayment.

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('DriverPayment') AND name = 'paymentMethod'
)
  ALTER TABLE DriverPayment ADD paymentMethod NVARCHAR(50) NOT NULL DEFAULT 'OTHER';
GO
IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE name = 'CK_DriverPayment_method' AND parent_object_id = OBJECT_ID('DriverPayment')
)
  ALTER TABLE DriverPayment ADD CONSTRAINT CK_DriverPayment_method
    CHECK (paymentMethod IN ('CASH','CHECK','BANK_TRANSFER','E_TRANSFER','OTHER'));
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('DriverPayment') AND name = 'notes'
)
  ALTER TABLE DriverPayment ADD notes NVARCHAR(500) NULL;
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('DriverPayment') AND name = 'updatedAt'
)
  ALTER TABLE DriverPayment ADD updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE();
GO
