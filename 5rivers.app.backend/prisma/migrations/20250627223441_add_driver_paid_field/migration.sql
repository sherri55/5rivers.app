/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `User` table. The data in that column could be lost. The data in that column will be cast from `String` to `Unsupported("uuid")`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Job" (
    "jobId" TEXT NOT NULL PRIMARY KEY,
    "jobDate" TEXT NOT NULL,
    "jobGrossAmount" REAL,
    "jobTypeId" TEXT,
    "driverId" TEXT,
    "dispatcherId" TEXT,
    "unitId" TEXT,
    "invoiceId" TEXT,
    "invoiceStatus" TEXT NOT NULL DEFAULT 'Pending',
    "weight" TEXT,
    "loads" INTEGER,
    "startTime" TEXT,
    "endTime" TEXT,
    "ticketIds" TEXT,
    "paymentReceived" BOOLEAN NOT NULL DEFAULT false,
    "driverPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "imageUrls" TEXT,
    CONSTRAINT "Job_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("invoiceId") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("unitId") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "Dispatcher" ("dispatcherId") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("driverId") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_jobTypeId_fkey" FOREIGN KEY ("jobTypeId") REFERENCES "JobType" ("jobTypeId") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Job" ("createdAt", "dispatcherId", "driverId", "endTime", "imageUrls", "invoiceId", "invoiceStatus", "jobDate", "jobGrossAmount", "jobId", "jobTypeId", "loads", "paymentReceived", "startTime", "ticketIds", "unitId", "updatedAt", "weight") SELECT "createdAt", "dispatcherId", "driverId", "endTime", "imageUrls", "invoiceId", "invoiceStatus", "jobDate", "jobGrossAmount", "jobId", "jobTypeId", "loads", "paymentReceived", "startTime", "ticketIds", "unitId", "updatedAt", "weight" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
CREATE TABLE "new_User" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "id" uuid
);
INSERT INTO "new_User" ("createdAt", "email", "id", "password", "updatedAt", "userId") SELECT "createdAt", "email", "id", "password", "updatedAt", "userId" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
Pragma writable_schema=1;
CREATE UNIQUE INDEX "sqlite_autoindex_User_1" ON "User"("email");
Pragma writable_schema=0;
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
