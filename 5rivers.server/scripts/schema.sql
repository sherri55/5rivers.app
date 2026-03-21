-- 5rivers.server – SQL Server schema
-- Run with: npm run db:schema
-- Requires SQL Server 2016+ (DROP TABLE IF EXISTS). Ids are VARCHAR(36) (UUIDs).

DROP TABLE IF EXISTS JobInvoice;
DROP TABLE IF EXISTS Images;
DROP TABLE IF EXISTS JobDriverPay;
DROP TABLE IF EXISTS DriverPayment;
DROP TABLE IF EXISTS CarrierPayments;
DROP TABLE IF EXISTS DriverJobTypeRate;
DROP TABLE IF EXISTS UnitEvents;
DROP TABLE IF EXISTS Jobs;
DROP TABLE IF EXISTS Invoices;
DROP TABLE IF EXISTS JobTypes;
DROP TABLE IF EXISTS Companies;
DROP TABLE IF EXISTS Carriers;
DROP TABLE IF EXISTS Drivers;
DROP TABLE IF EXISTS Dispatchers;
DROP TABLE IF EXISTS Units;
DROP TABLE IF EXISTS OrganizationMember;
DROP TABLE IF EXISTS Organizations;
DROP TABLE IF EXISTS Users;

CREATE TABLE Users (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  email NVARCHAR(255) NOT NULL,
  passwordHash NVARCHAR(255) NOT NULL,
  name NVARCHAR(255) NULL,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT UQ_Users_email UNIQUE (email)
);

CREATE TABLE Organizations (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name NVARCHAR(255) NOT NULL,
  slug NVARCHAR(100) NOT NULL,
  settings NVARCHAR(MAX) NULL,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT UQ_Organizations_slug UNIQUE (slug)
);

CREATE TABLE OrganizationMember (
  userId VARCHAR(36) NOT NULL,
  organizationId VARCHAR(36) NOT NULL,
  role NVARCHAR(50) NOT NULL,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  PRIMARY KEY (userId, organizationId),
  CONSTRAINT FK_OrganizationMember_User FOREIGN KEY (userId) REFERENCES Users(id) ON DELETE CASCADE,
  CONSTRAINT FK_OrganizationMember_Org FOREIGN KEY (organizationId) REFERENCES Organizations(id) ON DELETE CASCADE,
  CONSTRAINT CK_OrganizationMember_role CHECK (role IN ('OWNER','ADMIN','DISPATCHER','MEMBER','VIEWER'))
);

CREATE TABLE Companies (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  organizationId VARCHAR(36) NOT NULL,
  name NVARCHAR(255) NOT NULL,
  description NVARCHAR(MAX) NULL,
  website NVARCHAR(500) NULL,
  industry NVARCHAR(255) NULL,
  location NVARCHAR(500) NULL,
  size NVARCHAR(50) NULL,
  founded INT NULL,
  logo NVARCHAR(500) NULL,
  email NVARCHAR(255) NULL,
  phone NVARCHAR(100) NULL,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_Companies_Organization FOREIGN KEY (organizationId) REFERENCES Organizations(id) ON DELETE CASCADE
);

CREATE TABLE JobTypes (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  companyId VARCHAR(36) NOT NULL,
  title NVARCHAR(255) NOT NULL,
  startLocation NVARCHAR(500) NULL,
  endLocation NVARCHAR(500) NULL,
  dispatchType NVARCHAR(50) NOT NULL,
  rateOfJob DECIMAL(18,2) NOT NULL DEFAULT 0,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_JobTypes_Company FOREIGN KEY (companyId) REFERENCES Companies(id) ON DELETE CASCADE
);

CREATE TABLE Drivers (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  organizationId VARCHAR(36) NOT NULL,
  name NVARCHAR(255) NOT NULL,
  description NVARCHAR(MAX) NULL,
  email NVARCHAR(255) NULL,
  phone NVARCHAR(100) NULL,
  payType NVARCHAR(20) NOT NULL DEFAULT 'HOURLY',
  hourlyRate DECIMAL(18,2) NOT NULL DEFAULT 0,
  percentageRate DECIMAL(5,2) NOT NULL DEFAULT 0,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_Drivers_Organization FOREIGN KEY (organizationId) REFERENCES Organizations(id) ON DELETE CASCADE,
  CONSTRAINT CK_Drivers_payType CHECK (payType IN ('HOURLY','PERCENTAGE','CUSTOM'))
);

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
  CONSTRAINT CK_DriverJobTypeRate_payType CHECK (payType IN ('HOURLY','PERCENTAGE'))
);

CREATE TABLE Dispatchers (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  organizationId VARCHAR(36) NOT NULL,
  name NVARCHAR(255) NOT NULL,
  description NVARCHAR(MAX) NULL,
  email NVARCHAR(255) NULL,
  phone NVARCHAR(100) NULL,
  commissionPercent DECIMAL(5,2) NOT NULL DEFAULT 0,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_Dispatchers_Organization FOREIGN KEY (organizationId) REFERENCES Organizations(id) ON DELETE CASCADE
);

CREATE TABLE Units (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  organizationId VARCHAR(36) NOT NULL,
  name NVARCHAR(255) NOT NULL,
  description NVARCHAR(MAX) NULL,
  color NVARCHAR(100) NULL,
  plateNumber NVARCHAR(100) NULL,
  vin NVARCHAR(100) NULL,
  status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  year INT NULL,
  make NVARCHAR(100) NULL,
  model NVARCHAR(100) NULL,
  mileage INT NULL,
  insuranceExpiry DATE NULL,
  lastMaintenanceDate DATE NULL,
  nextMaintenanceDate DATE NULL,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_Units_Organization FOREIGN KEY (organizationId) REFERENCES Organizations(id) ON DELETE CASCADE,
  CONSTRAINT CK_Units_status CHECK (status IN ('ACTIVE','INACTIVE','MAINTENANCE','RETIRED'))
);

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
  CONSTRAINT CK_UnitEvents_eventType CHECK (eventType IN ('MAINTENANCE','INSPECTION','REPAIR','INCIDENT','TIRE_CHANGE','OIL_CHANGE','REGISTRATION','NOTE'))
);

-- Carriers: other trucking companies we subcontract work to
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
  CONSTRAINT CK_Carriers_rateType CHECK (rateType IN ('PERCENTAGE','FLAT_PER_JOB','FLAT_PER_LOAD','FLAT_PER_TON','HOURLY')),
  CONSTRAINT CK_Carriers_status CHECK (status IN ('ACTIVE','INACTIVE'))
);

CREATE TABLE Invoices (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  organizationId VARCHAR(36) NOT NULL,
  invoiceNumber NVARCHAR(100) NOT NULL,
  invoiceDate DATE NOT NULL,
  status NVARCHAR(50) NOT NULL,
  dispatcherId VARCHAR(36) NULL,
  companyId VARCHAR(36) NULL,
  billedTo NVARCHAR(500) NULL,
  billedEmail NVARCHAR(255) NULL,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_Invoices_Organization FOREIGN KEY (organizationId) REFERENCES Organizations(id) ON DELETE CASCADE,
  CONSTRAINT FK_Invoices_Dispatcher FOREIGN KEY (dispatcherId) REFERENCES Dispatchers(id),
  CONSTRAINT FK_Invoices_Company FOREIGN KEY (companyId) REFERENCES Companies(id),
  CONSTRAINT UQ_Invoices_org_number UNIQUE (organizationId, invoiceNumber),
  CONSTRAINT CK_Invoices_status CHECK (status IN ('CREATED','RAISED','RECEIVED'))
);

CREATE TABLE Jobs (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  organizationId VARCHAR(36) NOT NULL,
  jobDate DATE NOT NULL,
  jobTypeId VARCHAR(36) NOT NULL,
  driverId VARCHAR(36) NULL,
  dispatcherId VARCHAR(36) NULL,
  unitId VARCHAR(36) NULL,
  carrierId VARCHAR(36) NULL,
  sourceType NVARCHAR(20) NOT NULL DEFAULT 'DISPATCHED',
  weight NVARCHAR(MAX) NULL,
  loads INT NULL,
  startTime NVARCHAR(20) NULL,
  endTime NVARCHAR(20) NULL,
  amount DECIMAL(18,2) NULL,
  carrierAmount DECIMAL(18,2) NULL,
  ticketIds NVARCHAR(MAX) NULL,
  driverPaid BIT NOT NULL DEFAULT 0,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_Jobs_Organization FOREIGN KEY (organizationId) REFERENCES Organizations(id) ON DELETE CASCADE,
  CONSTRAINT FK_Jobs_JobType FOREIGN KEY (jobTypeId) REFERENCES JobTypes(id),
  CONSTRAINT FK_Jobs_Driver FOREIGN KEY (driverId) REFERENCES Drivers(id),
  CONSTRAINT FK_Jobs_Dispatcher FOREIGN KEY (dispatcherId) REFERENCES Dispatchers(id),
  CONSTRAINT FK_Jobs_Unit FOREIGN KEY (unitId) REFERENCES Units(id),
  CONSTRAINT FK_Jobs_Carrier FOREIGN KEY (carrierId) REFERENCES Carriers(id),
  CONSTRAINT CK_Jobs_sourceType CHECK (sourceType IN ('DISPATCHED','DIRECT'))
);

CREATE TABLE JobInvoice (
  jobId VARCHAR(36) NOT NULL PRIMARY KEY,
  invoiceId VARCHAR(36) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  addedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_JobInvoice_Job FOREIGN KEY (jobId) REFERENCES Jobs(id) ON DELETE CASCADE,
  CONSTRAINT FK_JobInvoice_Invoice FOREIGN KEY (invoiceId) REFERENCES Invoices(id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE TABLE Images (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  jobId VARCHAR(36) NOT NULL,
  content VARBINARY(MAX) NOT NULL,
  contentType NVARCHAR(100) NOT NULL,
  fileName NVARCHAR(500) NULL,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_Images_Job FOREIGN KEY (jobId) REFERENCES Jobs(id) ON DELETE CASCADE
);

CREATE TABLE DriverPayment (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  driverId VARCHAR(36) NOT NULL,
  organizationId VARCHAR(36) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  paidAt DATE NOT NULL,
  paymentMethod NVARCHAR(50) NOT NULL DEFAULT 'OTHER',
  reference NVARCHAR(500) NULL,
  notes NVARCHAR(500) NULL,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_DriverPayment_Driver FOREIGN KEY (driverId) REFERENCES Drivers(id) ON DELETE CASCADE,
  CONSTRAINT FK_DriverPayment_Organization FOREIGN KEY (organizationId) REFERENCES Organizations(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT CK_DriverPayment_method CHECK (paymentMethod IN ('CASH','CHECK','BANK_TRANSFER','E_TRANSFER','OTHER'))
);

CREATE TABLE JobDriverPay (
  jobId VARCHAR(36) NOT NULL PRIMARY KEY,
  driverId VARCHAR(36) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  paidAt DATETIME2 NULL,
  paymentId VARCHAR(36) NULL,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_JobDriverPay_Job FOREIGN KEY (jobId) REFERENCES Jobs(id) ON DELETE CASCADE,
  CONSTRAINT FK_JobDriverPay_Driver FOREIGN KEY (driverId) REFERENCES Drivers(id) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT FK_JobDriverPay_Payment FOREIGN KEY (paymentId) REFERENCES DriverPayment(id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Carrier payment tracking
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
  CONSTRAINT CK_CarrierPayments_method CHECK (paymentMethod IN ('CASH','CHECK','BANK_TRANSFER','E_TRANSFER','OTHER'))
);

-- Indexes
CREATE INDEX IX_Companies_organizationId ON Companies(organizationId);
CREATE INDEX IX_JobTypes_companyId ON JobTypes(companyId);
CREATE INDEX IX_Drivers_organizationId ON Drivers(organizationId);
CREATE INDEX IX_DriverJobTypeRate_driverId ON DriverJobTypeRate(driverId);
CREATE INDEX IX_DriverJobTypeRate_jobTypeId ON DriverJobTypeRate(jobTypeId);
CREATE INDEX IX_Dispatchers_organizationId ON Dispatchers(organizationId);
CREATE INDEX IX_Units_organizationId ON Units(organizationId);
CREATE INDEX IX_UnitEvents_unitId ON UnitEvents(unitId);
CREATE INDEX IX_UnitEvents_organizationId ON UnitEvents(organizationId);
CREATE INDEX IX_UnitEvents_eventDate ON UnitEvents(eventDate);
CREATE INDEX IX_Carriers_organizationId ON Carriers(organizationId);
CREATE INDEX IX_Invoices_organizationId ON Invoices(organizationId);
CREATE INDEX IX_Invoices_dispatcherId ON Invoices(dispatcherId);
CREATE INDEX IX_Invoices_companyId ON Invoices(companyId);
CREATE INDEX IX_Jobs_organizationId ON Jobs(organizationId);
CREATE INDEX IX_Jobs_jobDate ON Jobs(jobDate);
CREATE INDEX IX_Jobs_jobTypeId ON Jobs(jobTypeId);
CREATE INDEX IX_Jobs_carrierId ON Jobs(carrierId);
CREATE INDEX IX_Jobs_sourceType ON Jobs(sourceType);
CREATE INDEX IX_JobInvoice_invoiceId ON JobInvoice(invoiceId);
CREATE INDEX IX_OrganizationMember_organizationId ON OrganizationMember(organizationId);
CREATE INDEX IX_Images_jobId ON Images(jobId);
CREATE INDEX IX_DriverPayment_driverId ON DriverPayment(driverId);
CREATE INDEX IX_DriverPayment_organizationId ON DriverPayment(organizationId);
CREATE INDEX IX_JobDriverPay_driverId ON JobDriverPay(driverId);
CREATE INDEX IX_JobDriverPay_paidAt ON JobDriverPay(paidAt);
CREATE INDEX IX_CarrierPayments_carrierId ON CarrierPayments(carrierId);
CREATE INDEX IX_CarrierPayments_organizationId ON CarrierPayments(organizationId);
