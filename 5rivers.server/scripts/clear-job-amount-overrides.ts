/**
 * clear-job-amount-overrides.ts
 *
 * One-shot: sets `Jobs.amount = NULL` for every job in the org.
 *
 * Why you'd run this:
 *   The auto-calc behaviour on the server toggled a few times over the
 *   project's history. As a result, many rows have an `amount` column
 *   populated by old auto-calc passes — those now look like manual user
 *   overrides in the UI ("OVERRIDE" chip). This script wipes the column
 *   so every job re-derives its amount from rate × hours/loads/weight at
 *   display time, and only future user-entered overrides will show the chip.
 *
 * What you'll see after running:
 *   • UI list page: amounts still show (computed from job type rate ×
 *     hours / loads / weight). No "OVERRIDE" chips.
 *   • Editing any job and saving with the Amount Override field blank
 *     will repopulate `amount` with the computed value going forward.
 *
 * Usage:
 *   cd 5rivers.server
 *   npx ts-node scripts/clear-job-amount-overrides.ts
 *
 * Optional flag: --dry-run prints how many rows would be affected without
 * touching the DB.
 */

import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { getPool, closePool } from '../src/db/connection';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const pool = await getPool();

  // Count first so the user sees the impact before/after.
  const beforeCount = (
    await pool
      .request()
      .query<{ n: number }>('SELECT COUNT(*) AS n FROM Jobs WHERE amount IS NOT NULL')
  ).recordset[0]?.n ?? 0;

  console.log(`Found ${beforeCount} job(s) with a non-NULL amount.`);

  if (dryRun) {
    console.log('Dry run — nothing was changed.');
    return;
  }

  if (beforeCount === 0) {
    console.log('Nothing to do.');
    return;
  }

  const result = await pool
    .request()
    .query('UPDATE Jobs SET amount = NULL, updatedAt = SYSUTCDATETIME() WHERE amount IS NOT NULL');

  console.log(`Cleared amount on ${result.rowsAffected[0]} job(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
