-- Add `breaks` column to Jobs for storing time-exclusion breaks on hourly jobs.
-- Stored as a JSON array: [{"start":"HH:MM","end":"HH:MM","tag":"Label"}, ...]
-- HH:MM values are Eastern local time (24h). Duration arithmetic works correctly
-- because DATEDIFF on TIME values gives seconds regardless of timezone.
--
-- Also recreates vJobsEffective to subtract total break seconds from hourly hours.

ALTER TABLE Jobs ADD breaks NVARCHAR(MAX) NULL;
GO

CREATE OR ALTER VIEW vJobsEffective AS
SELECT
  j.id,
  j.organizationId,
  j.jobDate,
  j.jobTypeId,
  j.driverId,
  j.dispatcherId,
  j.unitId,
  j.carrierId,
  j.sourceType,
  j.weight,
  j.loads,
  j.startTime,
  j.endTime,
  j.amount,
  j.carrierAmount,
  j.ticketIds,
  j.breaks,
  j.jobPaid,
  j.driverPaid,
  j.createdAt,
  j.updatedAt,
  COALESCE(
    j.amount,
    CASE
      WHEN jt.rateOfJob IS NULL OR jt.rateOfJob <= 0 THEN NULL
      ELSE
        CASE LOWER(jt.dispatchType)
          WHEN 'fixed'  THEN jt.rateOfJob
          WHEN 'load'   THEN jt.rateOfJob * COALESCE(j.loads, 1)
          WHEN 'loads'  THEN jt.rateOfJob * COALESCE(j.loads, 1)
          WHEN 'hourly' THEN
            CASE
              WHEN j.startTime IS NOT NULL
               AND j.endTime   IS NOT NULL
               AND j.endTime > j.startTime
              THEN jt.rateOfJob * (
                (
                  DATEDIFF(SECOND, j.startTime, j.endTime)
                  - COALESCE((
                      SELECT SUM(DATEDIFF(SECOND,
                        CAST(JSON_VALUE(b.[value], '$.start') AS TIME),
                        CAST(JSON_VALUE(b.[value], '$.end')   AS TIME)
                      ))
                      FROM OPENJSON(j.breaks) AS b
                      WHERE JSON_VALUE(b.[value], '$.start') IS NOT NULL
                        AND JSON_VALUE(b.[value], '$.end')   IS NOT NULL
                        AND JSON_VALUE(b.[value], '$.end') > JSON_VALUE(b.[value], '$.start')
                    ), 0)
                ) / 3600.0
              )
              ELSE NULL
            END
          WHEN 'tonnage' THEN NULL
          ELSE jt.rateOfJob
        END
    END
  ) AS effectiveAmount
FROM Jobs j
LEFT JOIN JobTypes jt ON j.jobTypeId = jt.id;
GO
