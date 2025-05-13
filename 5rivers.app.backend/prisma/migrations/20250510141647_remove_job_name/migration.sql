/*
  Warnings:

  - You are about to drop the column `name` on the `Job` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Job" (
    "jobId" TEXT NOT NULL PRIMARY KEY,
    "jobDate" DATETIME NOT NULL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Job_jobTypeId_fkey" FOREIGN KEY ("jobTypeId") REFERENCES "JobType" ("jobTypeId") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("driverId") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_dispatcherId_fkey" FOREIGN KEY ("dispatcherId") REFERENCES "Dispatcher" ("dispatcherId") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("unitId") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Job_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("invoiceId") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Job" ("createdAt", "dispatcherId", "driverId", "endTime", "invoiceId", "invoiceStatus", "jobDate", "jobGrossAmount", "jobId", "jobTypeId", "loads", "startTime", "unitId", "updatedAt", "weight") SELECT "createdAt", "dispatcherId", "driverId", "endTime", "invoiceId", "invoiceStatus", "jobDate", "jobGrossAmount", "jobId", "jobTypeId", "loads", "startTime", "unitId", "updatedAt", "weight" FROM "Job";
DROP TABLE "Job";
ALTER TABLE "new_Job" RENAME TO "Job";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
