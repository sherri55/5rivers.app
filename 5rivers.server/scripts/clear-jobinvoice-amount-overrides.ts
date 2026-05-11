/**
 * clear-jobinvoice-amount-overrides.ts
 *
 * One-shot: sets `JobInvoice.amount = NULL` for every invoice line.
 *
 * Why you'd run this:
 *   When invoice lines were added under the old model, the UI snapshotted
 *   the job's amount at add-time into `JobInvoice.amount`. Many of those
 *   snapshots are 0 (because the job's `amount` was NULL at the time), and
 *   the new `vJobInvoiceEffective` view treats any non-NULL value as a
 *   user override — so the cascade `COALESCE(ji.amount, j.effectiveAmount)`
 *   short-circuits on those 0s.
 *
 *   This script clears the column so every line inherits the underlying
 *   job's effective amount. Going forward, new lines are stored NULL by
 *   default (the UI sends amount: null) and only set when the user
 *   explicitly overrides via PATCH /invoices/:id/jobs/:jobId.
 *
 * Usage:
 *   cd 5rivers.server
 *   npx ts-node scripts/clear-jobinvoice-amount-overrides.ts            # do it
 *   npx ts-node scripts/clear-jobinvoice-amount-overrides.ts --dry-run  # preview
 *   npx ts-node scripts/clear-jobinvoice-amount-overrides.ts --zeros-only   # only NULL the rows where amount = 0 (safest)
 *
 * The --zeros-only flag is the most conservative — it preserves any
 * manual overrides you'd legitimately entered.
 */

import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { getPool, closePool } from '../src/db/connection';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const zerosOnly = process.argv.includes('--zeros-only');
  const pool = await getPool();

  const whereClause = zerosOnly ? 'WHERE amount = 0' : 'WHERE amount IS NOT NULL';

  const before = (
    await pool.request().query<{ n: number }>(
      `SELECT COUNT(*) AS n FROM JobInvoice ${whereClause}`,
    )
  ).recordset[0]?.n ?? 0;

  console.log(`Found ${before} invoice line(s) ${zerosOnly ? 'with amount = 0' : 'with a non-NULL amount'}.`);

  if (dryRun) {
    console.log('Dry run — nothing was changed.');
    return;
  }
  if (before === 0) {
    console.log('Nothing to do.');
    return;
  }

  const result = await pool
    .request()
    .query(`UPDATE JobInvoice SET amount = NULL ${whereClause}`);

  console.log(`Cleared amount on ${result.rowsAffected[0]} invoice line(s).`);
  console.log(`Going forward, these lines inherit their amount from the underlying job's effectiveAmount.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
