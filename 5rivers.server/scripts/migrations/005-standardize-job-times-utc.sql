-- Migration 005: Standardize startTime/endTime to DATETIME2 (UTC)
--
-- Before: NVARCHAR(20) storing mixed formats (after batch 1-2 ran, all are now ISO-like):
--   "2025-12-05T07:00"     — ISO without Z (Eastern time)
--   "2025-12-05T07:00:00"  — ISO with seconds (Eastern time)
--   "2025-12-05T7:00 AM"   — edge case with AM/PM
--
-- After: DATETIME2 storing proper UTC datetimes.

-- Step 1: Clean up "T" separator → space (SQL Server needs "YYYY-MM-DD HH:MM" not "YYYY-MM-DDTHH:MM")
UPDATE Jobs
SET startTime = REPLACE(startTime, 'T', ' ')
WHERE startTime IS NOT NULL AND CHARINDEX('T', startTime) > 0;
GO

UPDATE Jobs
SET endTime = REPLACE(endTime, 'T', ' ')
WHERE endTime IS NOT NULL AND CHARINDEX('T', endTime) > 0;
GO

-- Step 2: Handle AM/PM format — convert "2025-12-05 7:00 AM" → 24h format
-- SQL Server's CAST handles "2025-12-05 7:00 AM" correctly when T is removed, so this is fine.

-- Step 3: Add new DATETIME2 columns
ALTER TABLE Jobs ADD startTimeUTC DATETIME2 NULL;
GO

ALTER TABLE Jobs ADD endTimeUTC DATETIME2 NULL;
GO

-- Step 4: Convert Eastern → UTC using AT TIME ZONE
-- TRY_CAST handles any remaining edge cases gracefully (returns NULL instead of error)
UPDATE Jobs
SET startTimeUTC = TRY_CAST(startTime AS DATETIME2) AT TIME ZONE 'Eastern Standard Time' AT TIME ZONE 'UTC'
WHERE startTime IS NOT NULL;
GO

UPDATE Jobs
SET endTimeUTC = TRY_CAST(endTime AS DATETIME2) AT TIME ZONE 'Eastern Standard Time' AT TIME ZONE 'UTC'
WHERE endTime IS NOT NULL;
GO

-- Step 5: Log any rows that failed conversion (TRY_CAST returned NULL but source was not NULL)
-- These need manual review
SELECT id, startTime, endTime
FROM Jobs
WHERE (startTime IS NOT NULL AND startTimeUTC IS NULL)
   OR (endTime IS NOT NULL AND endTimeUTC IS NULL);
GO

-- Step 6: Drop old columns, rename new ones
ALTER TABLE Jobs DROP COLUMN startTime;
GO

ALTER TABLE Jobs DROP COLUMN endTime;
GO

EXEC sp_rename 'Jobs.startTimeUTC', 'startTime', 'COLUMN';
GO

EXEC sp_rename 'Jobs.endTimeUTC', 'endTime', 'COLUMN';
GO
