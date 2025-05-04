-- CreateTable
CREATE TABLE "Company" (
    "companyId" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Dispatcher" (
    "dispatcherId" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "commissionPercent" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Driver" (
    "driverId" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "hourlyRate" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Unit" (
    "unitId" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "JobType" (
    "jobTypeId" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "startLocation" TEXT,
    "endLocation" TEXT,
    "dispatchType" TEXT NOT NULL,
    "rateOfJob" REAL NOT NULL,
    "companyId" TEXT,
    "dispatcherId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JobType_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("companyId") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "JobType_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "Dispatcher" ("dispatcherId") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DriverRate" (
    "driverRateId" TEXT NOT NULL PRIMARY KEY,
    "driverId" TEXT NOT NULL,
    "jobTypeId" TEXT NOT NULL,
    "hourlyRate" REAL,
    "percentageRate" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DriverRate_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("driverId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DriverRate_jobTypeId_fkey" FOREIGN KEY ("jobTypeId") REFERENCES "JobType" ("jobTypeId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Job" (
    "jobId" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "jobDate" DATETIME NOT NULL,
    "dispatchType" TEXT NOT NULL,
    "jobGrossAmount" REAL,
    "driverRate" REAL,
    "driverPay" REAL,
    "estimatedFuel" REAL,
    "estimatedRevenue" REAL,
    "jobTypeId" TEXT,
    "driverId" TEXT,
    "dispatcherId" TEXT,
    "unitId" TEXT,
    "invoiceId" TEXT,
    "invoiceStatus" TEXT NOT NULL DEFAULT 'Pending',
    "weight" TEXT,
    "loads" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Job_jobTypeId_fkey" FOREIGN KEY ("jobTypeId") REFERENCES "JobType" ("jobTypeId") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("driverId") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "Dispatcher" ("dispatcherId") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("unitId") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("invoiceId") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobTicket" (
    "ticketId" TEXT NOT NULL PRIMARY KEY,
    "jobId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JobTicket_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("jobId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "invoiceId" TEXT NOT NULL PRIMARY KEY,
    "dispatcherId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Pending',
    "subTotal" REAL,
    "dispatchPercent" REAL,
    "commission" REAL,
    "hst" REAL,
    "total" REAL,
    "billedTo" TEXT,
    "billedEmail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "Dispatcher" ("dispatcherId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "invoiceLineId" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "lineAmount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("invoiceId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InvoiceLine_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("jobId") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DriverRate_driverId_jobTypeId_key" ON "DriverRate"("driverId", "jobTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "JobTicket_jobId_ticketNumber_key" ON "JobTicket"("jobId", "ticketNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
