-- Migration 006: Make rateOfJob nullable (NULL = rate pending, 0 = free)
ALTER TABLE JobTypes ALTER COLUMN rateOfJob DECIMAL(18,2) NULL;
GO
