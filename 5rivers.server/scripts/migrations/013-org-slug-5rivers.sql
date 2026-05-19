-- Update organization slug from 'five-rivers' to '5rivers'.
-- Run once. Safe to re-run (no-op if already updated).
UPDATE Organizations SET slug = '5rivers' WHERE slug = 'five-rivers';
GO
