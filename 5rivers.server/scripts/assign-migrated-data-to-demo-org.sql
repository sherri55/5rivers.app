-- Assign all organization-scoped rows to the demo organization so they appear
-- when you log in with: email=demo@5rivers.app, password=Demo123!, organizationSlug=demo
--
-- Prerequisites:
--   1. Organizations and Users exist (run: npm run db:seed)
--   2. Your migrated data is already in Companies, Drivers, Dispatchers, Units, Jobs, Invoices, DriverPayment
--
-- Run this script with sqlcmd or your SQL Server client against the 5rivers database.

DECLARE @demoOrgId VARCHAR(36);
SELECT @demoOrgId = id FROM Organizations WHERE slug = 'demo';

IF @demoOrgId IS NULL
BEGIN
  RAISERROR('No organization with slug ''demo'' found. Run: npm run db:seed', 16, 1);
  RETURN;
END

UPDATE Companies      SET organizationId = @demoOrgId;
UPDATE Drivers        SET organizationId = @demoOrgId;
UPDATE Dispatchers    SET organizationId = @demoOrgId;
UPDATE Units          SET organizationId = @demoOrgId;
UPDATE Invoices       SET organizationId = @demoOrgId;
UPDATE Jobs           SET organizationId = @demoOrgId;
UPDATE DriverPayment  SET organizationId = @demoOrgId;

PRINT 'All rows assigned to demo organization. Log in with organizationSlug: demo';
GO
