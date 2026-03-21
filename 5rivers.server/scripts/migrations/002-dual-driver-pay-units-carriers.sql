-- Migration 002: Dual driver pay model, comprehensive unit records, carrier/self-dispatch support
-- Run with: sqlcmd or via application migration runner

-- ============================================================
-- 1. DRIVER PAY MODEL: Support both hourly and percentage rates
-- ============================================================

-- Add payType and percentageRate to Drivers
ALTER TABLE Drivers ADD payType NVARCHAR(20) NOT NULL DEFAULT 'HOURLY';
ALTER TABLE Drivers ADD percentageRate DECIMAL(5,2) NOT NULL DEFAULT 0;

-- Constraint: payType must be HOURLY, PERCENTAGE, or CUSTOM
ALTER TABLE Drivers ADD CONSTRAINT CK_Drivers_payType CHECK (payType IN ('HOURLY', 'PERCENTAGE', 'CUSTOM'));

-- Per-job-type rate overrides for drivers
CREATE TABLE DriverJobTypeRate (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  driverId VARCHAR(36) NOT NULL,
  jobTypeId VARCHAR(36) NOT NULL,
  payType NVARCHAR(20) NOT NULL,
  hourlyRate DECIMAL(18,2) NOT NULL DEFAULT 0,
  percentageRate DECIMAL(5,2) NOT NULL DEFAULT 0,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_DriverJobTypeRate_Driver FOREIGN KEY (driverId) REFERENCES Drivers(id) ON DELETE CASCADE,
  CONSTRAINT FK_DriverJobTypeRate_JobType FOREIGN KEY (jobTypeId) REFERENCES JobTypes(id) ON DELETE NO ACTION,
  CONSTRAINT UQ_DriverJobTypeRate_driver_jobType UNIQUE (driverId, jobTypeId),
  CONSTRAINT CK_DriverJobTypeRate_payType CHECK (payType IN ('HOURLY', 'PERCENTAGE'))
);

CREATE INDEX IX_DriverJobTypeRate_driverId ON DriverJobTypeRate(driverId);
CREATE INDEX IX_DriverJobTypeRate_jobTypeId ON DriverJobTypeRate(jobTypeId);

-- ============================================================
-- 2. COMPREHENSIVE UNIT RECORDS
-- ============================================================

-- Add vehicle detail and lifecycle fields to Units
ALTER TABLE Units ADD status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE Units ADD year INT NULL;
ALTER TABLE Units ADD make NVARCHAR(100) NULL;
ALTER TABLE Units ADD model NVARCHAR(100) NULL;
ALTER TABLE Units ADD mileage INT NULL;
ALTER TABLE Units ADD insuranceExpiry DATE NULL;
ALTER TABLE Units ADD lastMaintenanceDate DATE NULL;
ALTER TABLE Units ADD nextMaintenanceDate DATE NULL;

ALTER TABLE Units ADD CONSTRAINT CK_Units_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED'));

-- Unit event log for maintenance, inspections, repairs, incidents
CREATE TABLE UnitEvents (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  unitId VARCHAR(36) NOT NULL,
  organizationId VARCHAR(36) NOT NULL,
  eventType NVARCHAR(50) NOT NULL,
  eventDate DATE NOT NULL,
  description NVARCHAR(MAX) NULL,
  cost DECIMAL(18,2) NULL,
  mileageAtEvent INT NULL,
  performedBy NVARCHAR(255) NULL,
  nextDueDate DATE NULL,
  notes NVARCHAR(MAX) NULL,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_UnitEvents_Unit FOREIGN KEY (unitId) REFERENCES Units(id) ON DELETE CASCADE,
  CONSTRAINT FK_UnitEvents_Organization FOREIGN KEY (organizationId) REFERENCES Organizations(id) ON DELETE NO ACTION,
  CONSTRAINT CK_UnitEvents_eventType CHECK (eventType IN ('MAINTENANCE', 'INSPECTION', 'REPAIR', 'INCIDENT', 'TIRE_CHANGE', 'OIL_CHANGE', 'REGISTRATION', 'NOTE'))
);

CREATE INDEX IX_UnitEvents_unitId ON UnitEvents(unitId);
CREATE INDEX IX_UnitEvents_organizationId ON UnitEvents(organizationId);
CREATE INDEX IX_UnitEvents_eventDate ON UnitEvents(eventDate);

-- ============================================================
-- 3. CARRIERS: Other trucking companies we subcontract work to
-- ============================================================

CREATE TABLE Carriers (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  organizationId VARCHAR(36) NOT NULL,
  name NVARCHAR(255) NOT NULL,
  description NVARCHAR(MAX) NULL,
  contactPerson NVARCHAR(255) NULL,
  email NVARCHAR(255) NULL,
  phone NVARCHAR(100) NULL,
  rateType NVARCHAR(50) NOT NULL DEFAULT 'PERCENTAGE',
  rate DECIMAL(18,2) NOT NULL DEFAULT 0,
  status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_Carriers_Organization FOREIGN KEY (organizationId) REFERENCES Organizations(id) ON DELETE CASCADE,
  CONSTRAINT CK_Carriers_rateType CHECK (rateType IN ('PERCENTAGE', 'FLAT_PER_JOB', 'FLAT_PER_LOAD', 'FLAT_PER_TON', 'HOURLY')),
  CONSTRAINT CK_Carriers_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE INDEX IX_Carriers_organizationId ON Carriers(organizationId);

-- Carrier payment tracking (parallel to DriverPayment)
CREATE TABLE CarrierPayments (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  carrierId VARCHAR(36) NOT NULL,
  organizationId VARCHAR(36) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  paidAt DATE NOT NULL,
  paymentMethod NVARCHAR(50) NOT NULL DEFAULT 'OTHER',
  reference NVARCHAR(500) NULL,
  notes NVARCHAR(500) NULL,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_CarrierPayments_Carrier FOREIGN KEY (carrierId) REFERENCES Carriers(id) ON DELETE CASCADE,
  CONSTRAINT FK_CarrierPayments_Organization FOREIGN KEY (organizationId) REFERENCES Organizations(id) ON DELETE NO ACTION,
  CONSTRAINT CK_CarrierPayments_method CHECK (paymentMethod IN ('CASH', 'CHECK', 'BANK_TRANSFER', 'E_TRANSFER', 'OTHER'))
);

CREATE INDEX IX_CarrierPayments_carrierId ON CarrierPayments(carrierId);
CREATE INDEX IX_CarrierPayments_organizationId ON CarrierPayments(organizationId);

-- ============================================================
-- 4. JOB CHANGES: Support dispatched vs direct-to-company jobs
--    and subcontracting to carriers
-- ============================================================

-- sourceType: where the job comes from
-- DISPATCHED = traditional model (external dispatcher gives us work)
-- DIRECT     = company contacts us directly (we act as dispatcher)
ALTER TABLE Jobs ADD sourceType NVARCHAR(20) NOT NULL DEFAULT 'DISPATCHED';
ALTER TABLE Jobs ADD carrierId VARCHAR(36) NULL;
ALTER TABLE Jobs ADD carrierAmount DECIMAL(18,2) NULL;

ALTER TABLE Jobs ADD CONSTRAINT CK_Jobs_sourceType CHECK (sourceType IN ('DISPATCHED', 'DIRECT'));
ALTER TABLE Jobs ADD CONSTRAINT FK_Jobs_Carrier FOREIGN KEY (carrierId) REFERENCES Carriers(id);

CREATE INDEX IX_Jobs_carrierId ON Jobs(carrierId);
CREATE INDEX IX_Jobs_sourceType ON Jobs(sourceType);

-- ============================================================
-- 5. INVOICE CHANGES: Allow direct-company invoicing
--    (dispatcher is no longer always required)
-- ============================================================

-- Make dispatcherId nullable for direct invoices
ALTER TABLE Invoices ALTER COLUMN dispatcherId VARCHAR(36) NULL;

-- Add companyId for direct-to-company invoices
ALTER TABLE Invoices ADD companyId VARCHAR(36) NULL;
ALTER TABLE Invoices ADD CONSTRAINT FK_Invoices_Company FOREIGN KEY (companyId) REFERENCES Companies(id);

CREATE INDEX IX_Invoices_companyId ON Invoices(companyId);
