-- Add Inquiries table for public website contact form submissions.
-- These rows are NOT scoped to an organization (no organizationId column) —
-- they're public leads that the platform owner reviews via /dashboard/inquiries.

IF NOT EXISTS (
  SELECT 1 FROM sys.tables WHERE name = 'Inquiries'
)
BEGIN
  CREATE TABLE Inquiries (
    id              UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    fullName        NVARCHAR(200)    NOT NULL,
    email           NVARCHAR(320)    NOT NULL,
    phone           NVARCHAR(50)     NULL,
    serviceType     NVARCHAR(50)     NOT NULL,
    projectDetails  NVARCHAR(MAX)    NULL,
    -- Lead lifecycle: NEW (just submitted), CONTACTED (we replied),
    -- QUALIFIED (real opportunity), CLOSED_WON, CLOSED_LOST
    status          NVARCHAR(20)     NOT NULL DEFAULT 'NEW',
    source          NVARCHAR(50)     NOT NULL DEFAULT 'website',
    notes           NVARCHAR(MAX)    NULL,
    -- Diagnostic info captured at submission time
    userAgent       NVARCHAR(500)    NULL,
    ipAddress       NVARCHAR(50)     NULL,
    createdAt       DATETIME2        NOT NULL DEFAULT GETUTCDATE(),
    updatedAt       DATETIME2        NOT NULL DEFAULT GETUTCDATE()
  );

  CREATE INDEX IX_Inquiries_createdAt ON Inquiries (createdAt DESC);
  CREATE INDEX IX_Inquiries_status    ON Inquiries (status);
END
GO

IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE name = 'CK_Inquiries_status' AND parent_object_id = OBJECT_ID('Inquiries')
)
  ALTER TABLE Inquiries ADD CONSTRAINT CK_Inquiries_status
    CHECK (status IN ('NEW','CONTACTED','QUALIFIED','CLOSED_WON','CLOSED_LOST'));
GO
