-- 5rivers app – SQL Server schema
-- Run against your database (e.g. FiveRivers). Ids are VARCHAR(36) (UUIDs).
-- Drops all tables first (child tables before parents). Requires SQL Server 2016+.

DROP TABLE IF EXISTS JobInvoice;
DROP TABLE IF EXISTS Images;
DROP TABLE IF EXISTS JobDriverPay;
DROP TABLE IF EXISTS DriverPayment;
DROP TABLE IF EXISTS Jobs;
DROP TABLE IF EXISTS Invoices;
DROP TABLE IF EXISTS JobTypes;
DROP TABLE IF EXISTS Companies;
DROP TABLE IF EXISTS Drivers;
DROP TABLE IF EXISTS Dispatchers;
DROP TABLE IF EXISTS Units;
DROP TABLE IF EXISTS OrganizationMember;
DROP TABLE IF EXISTS Organizations;
DROP TABLE IF EXISTS Users;

-- Users (global identity; no organizationId)
CREATE TABLE Users (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  email NVARCHAR(255) NOT NULL,
  passwordHash NVARCHAR(255) NOT NULL,
  name NVARCHAR(255) NULL,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT UQ_Users_email UNIQUE (email)
);

-- Organizations (root tenant)
CREATE TABLE Organizations (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  name NVARCHAR(255) NOT NULL,
  slug NVARCHAR(100) NOT NULL,
  settings NVARCHAR(MAX) NULL,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT UQ_Organizations_slug UNIQUE (slug)
);

-- OrganizationMember (user ↔ org with role)
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

-- Companies (per organization)
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

-- JobTypes (per company)
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

-- Drivers (per organization)
CREATE TABLE Drivers (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  organizationId VARCHAR(36) NOT NULL,
  name NVARCHAR(255) NOT NULL,
  description NVARCHAR(MAX) NULL,
  email NVARCHAR(255) NULL,
  phone NVARCHAR(100) NULL,
  hourlyRate DECIMAL(18,2) NOT NULL DEFAULT 0,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_Drivers_Organization FOREIGN KEY (organizationId) REFERENCES Organizations(id) ON DELETE CASCADE
);

-- Dispatchers (per organization)
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

-- Units (per organization)
CREATE TABLE Units (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  organizationId VARCHAR(36) NOT NULL,
  name NVARCHAR(255) NOT NULL,
  description NVARCHAR(MAX) NULL,
  color NVARCHAR(100) NULL,
  plateNumber NVARCHAR(100) NULL,
  vin NVARCHAR(100) NULL,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_Units_Organization FOREIGN KEY (organizationId) REFERENCES Organizations(id) ON DELETE CASCADE
);

-- Invoices (per organization; status CREATED|RAISED|RECEIVED)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Invoices')
CREATE TABLE Invoices (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  organizationId VARCHAR(36) NOT NULL,
  invoiceNumber NVARCHAR(100) NOT NULL,
  invoiceDate DATE NOT NULL,
  status NVARCHAR(50) NOT NULL,
  dispatcherId VARCHAR(36) NOT NULL,
  billedTo NVARCHAR(500) NULL,
  billedEmail NVARCHAR(255) NULL,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_Invoices_Organization FOREIGN KEY (organizationId) REFERENCES Organizations(id) ON DELETE CASCADE,
  CONSTRAINT FK_Invoices_Dispatcher FOREIGN KEY (dispatcherId) REFERENCES Dispatchers(id),
  CONSTRAINT UQ_Invoices_org_number UNIQUE (organizationId, invoiceNumber),
  CONSTRAINT CK_Invoices_status CHECK (status IN ('CREATED','RAISED','RECEIVED'))
);

-- Jobs (per organization; no invoiceStatus – derived from JobInvoice + Invoice.status)
CREATE TABLE Jobs (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  organizationId VARCHAR(36) NOT NULL,
  jobDate DATE NOT NULL,
  jobTypeId VARCHAR(36) NOT NULL,
  driverId VARCHAR(36) NULL,
  dispatcherId VARCHAR(36) NULL,
  unitId VARCHAR(36) NULL,
  weight NVARCHAR(MAX) NULL,
  loads INT NULL,
  startTime NVARCHAR(20) NULL,
  endTime NVARCHAR(20) NULL,
  amount DECIMAL(18,2) NULL,
  ticketIds NVARCHAR(MAX) NULL,
  driverPaid BIT NOT NULL DEFAULT 0,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  updatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_Jobs_Organization FOREIGN KEY (organizationId) REFERENCES Organizations(id) ON DELETE CASCADE,
  CONSTRAINT FK_Jobs_JobType FOREIGN KEY (jobTypeId) REFERENCES JobTypes(id),
  CONSTRAINT FK_Jobs_Driver FOREIGN KEY (driverId) REFERENCES Drivers(id),
  CONSTRAINT FK_Jobs_Dispatcher FOREIGN KEY (dispatcherId) REFERENCES Dispatchers(id),
  CONSTRAINT FK_Jobs_Unit FOREIGN KEY (unitId) REFERENCES Units(id)
);

-- JobInvoice (single link: job on invoice; one row per job)
CREATE TABLE JobInvoice (
  jobId VARCHAR(36) NOT NULL PRIMARY KEY,
  invoiceId VARCHAR(36) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  addedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_JobInvoice_Job FOREIGN KEY (jobId) REFERENCES Jobs(id) ON DELETE CASCADE,
  CONSTRAINT FK_JobInvoice_Invoice FOREIGN KEY (invoiceId) REFERENCES Invoices(id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Images (blob storage per job; one row per image)
CREATE TABLE Images (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  jobId VARCHAR(36) NOT NULL,
  content VARBINARY(MAX) NOT NULL,
  contentType NVARCHAR(100) NOT NULL,
  fileName NVARCHAR(500) NULL,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_Images_Job FOREIGN KEY (jobId) REFERENCES Jobs(id) ON DELETE CASCADE
);

-- DriverPayment (record of payment made to a driver)
CREATE TABLE DriverPayment (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  driverId VARCHAR(36) NOT NULL,
  organizationId VARCHAR(36) NOT NULL,
  amount DECIMAL(18,2) NOT NULL,
  paidAt DATE NOT NULL,
  reference NVARCHAR(500) NULL,
  createdAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
  CONSTRAINT FK_DriverPayment_Driver FOREIGN KEY (driverId) REFERENCES Drivers(id) ON DELETE CASCADE,
  CONSTRAINT FK_DriverPayment_Organization FOREIGN KEY (organizationId) REFERENCES Organizations(id) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- JobDriverPay (driver pay per job; paid vs pending)
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

-- Indexes for common filters
CREATE INDEX IX_Companies_organizationId ON Companies(organizationId);
CREATE INDEX IX_JobTypes_companyId ON JobTypes(companyId);
CREATE INDEX IX_Drivers_organizationId ON Drivers(organizationId);
CREATE INDEX IX_Dispatchers_organizationId ON Dispatchers(organizationId);
CREATE INDEX IX_Units_organizationId ON Units(organizationId);
CREATE INDEX IX_Invoices_organizationId ON Invoices(organizationId);
CREATE INDEX IX_Invoices_dispatcherId ON Invoices(dispatcherId);
CREATE INDEX IX_Jobs_organizationId ON Jobs(organizationId);
CREATE INDEX IX_Jobs_jobDate ON Jobs(jobDate);
CREATE INDEX IX_Jobs_jobTypeId ON Jobs(jobTypeId);
CREATE INDEX IX_JobInvoice_invoiceId ON JobInvoice(invoiceId);
CREATE INDEX IX_OrganizationMember_organizationId ON OrganizationMember(organizationId);
CREATE INDEX IX_Images_jobId ON Images(jobId);
CREATE INDEX IX_DriverPayment_driverId ON DriverPayment(driverId);
CREATE INDEX IX_DriverPayment_organizationId ON DriverPayment(organizationId);
CREATE INDEX IX_JobDriverPay_driverId ON JobDriverPay(driverId);
CREATE INDEX IX_JobDriverPay_paidAt ON JobDriverPay(paidAt);
