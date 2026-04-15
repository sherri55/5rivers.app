/**
 * Audit script — read-only, no changes to DB.
 * Reports: ID format distribution, amount issues, custom-ID FK chains.
 *
 * Run: npx ts-node scripts/audit-jobs.ts
 */

import path from 'path';
import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL not set in .env');

async function main() {
  await sql.connect(DATABASE_URL!);
  console.log('✅ Connected to SQL Server\n');

  // ── 1. ID format distribution ──────────────────────────────────
  const formatRows = await new sql.Request().query<{ format: string; count: number }>(`
    SELECT
      CASE WHEN id LIKE 'job_%' THEN 'custom (job_*)' ELSE 'uuid' END AS format,
      COUNT(*) AS count
    FROM Jobs
    GROUP BY CASE WHEN id LIKE 'job_%' THEN 'custom (job_*)' ELSE 'uuid' END
  `);
  console.log('=== ID Format Distribution ===');
  formatRows.recordset.forEach(r => console.log(`  ${r.format}: ${r.count}`));

  // ── 2. Jobs with amount NULL or 0 ─────────────────────────────
  const amountRows = await new sql.Request().query<{ id: string; jobDate: string; amount: number | null }>(`
    SELECT id, CAST(jobDate AS VARCHAR(20)) AS jobDate, amount
    FROM Jobs
    WHERE amount IS NULL OR amount = 0
    ORDER BY jobDate
  `);
  console.log(`\n=== Jobs with amount NULL or 0 (${amountRows.recordset.length} rows) ===`);
  amountRows.recordset.forEach(r =>
    console.log(`  ${r.id}  ${r.jobDate}  amount=${r.amount ?? 'NULL'}`)
  );

  // ── 3. Custom-ID jobs with FK detail ──────────────────────────
  const customRows = await new sql.Request().query<{
    id: string; jobDate: string; amount: number | null;
    invoiceId: string | null; imageCount: number; driverPayAmount: number | null;
  }>(`
    SELECT
      j.id,
      CAST(j.jobDate AS VARCHAR(20)) AS jobDate,
      j.amount,
      ji.invoiceId,
      (SELECT COUNT(*) FROM Images img WHERE img.jobId = j.id) AS imageCount,
      jdp.amount AS driverPayAmount
    FROM Jobs j
    LEFT JOIN JobInvoice ji  ON ji.jobId  = j.id
    LEFT JOIN JobDriverPay jdp ON jdp.jobId = j.id
    WHERE j.id LIKE 'job_%'
    ORDER BY j.jobDate
  `);
  console.log(`\n=== Custom-ID jobs (${customRows.recordset.length} rows) ===`);
  customRows.recordset.forEach(r =>
    console.log(
      `  ${r.id}  ${r.jobDate}  amount=${r.amount ?? 'NULL'}` +
      `  invoice=${r.invoiceId ?? '—'}  images=${r.imageCount}  driverPay=${r.driverPayAmount ?? '—'}`
    )
  );

  // ── 4. Jobs missing jobTypeId ──────────────────────────────────
  const missingType = await new sql.Request().query<{ id: string }>(`
    SELECT id FROM Jobs WHERE jobTypeId IS NULL OR jobTypeId = ''
  `);
  console.log(`\n=== Jobs missing jobTypeId (${missingType.recordset.length}) ===`);
  missingType.recordset.forEach(r => console.log(`  ${r.id}`));

  await (sql as any).close();
  console.log('\n✅ Audit complete.');
}

main().catch(err => { console.error(err); process.exit(1); });
