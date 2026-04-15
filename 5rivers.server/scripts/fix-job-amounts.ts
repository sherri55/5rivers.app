/**
 * Fix job amounts that are NULL or 0 by cross-referencing archive CSV.
 * Maps old `jobGrossAmount` → new `amount` field.
 *
 * Run: npx ts-node scripts/fix-job-amounts.ts
 */

import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL not set in .env');

const CSV_PATH = path.resolve(__dirname, '..', '..', 'archive', 'data', 'Jobs.csv');

// Parse CSV into map: jobId → jobGrossAmount
function parseArchiveCsv(): Map<string, number> {
  const lines = fs.readFileSync(CSV_PATH, 'utf8').split('\n');
  const header = lines[0].split(',');
  const idIdx     = header.indexOf('jobId');
  const amountIdx = header.indexOf('jobGrossAmount');

  if (idIdx === -1 || amountIdx === -1) {
    throw new Error(`CSV header missing jobId or jobGrossAmount. Header: ${lines[0]}`);
  }

  const map = new Map<string, number>();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Handle quoted fields by splitting on comma but respecting quotes
    const cols = line.split(',');
    const id  = cols[idIdx]?.trim();
    const raw = cols[amountIdx]?.trim();
    if (!id || !raw) continue;
    const val = parseFloat(raw);
    if (!isNaN(val) && val > 0) map.set(id, val);
  }
  return map;
}

async function main() {
  const archive = parseArchiveCsv();
  console.log(`📂 Archive CSV loaded — ${archive.size} jobs with valid amounts\n`);

  await sql.connect(DATABASE_URL!);
  console.log('✅ Connected to SQL Server\n');

  // Find all jobs in DB with NULL or 0 amount
  const rows = await new sql.Request().query<{ id: string; jobDate: string }>(`
    SELECT id, CAST(jobDate AS VARCHAR(20)) AS jobDate
    FROM Jobs
    WHERE amount IS NULL OR amount = 0
    ORDER BY jobDate
  `);

  console.log(`Found ${rows.recordset.length} jobs with NULL/0 amount\n`);

  let fixed = 0;
  let noMatch = 0;

  for (const row of rows.recordset) {
    const archiveAmount = archive.get(row.id);
    if (archiveAmount == null) {
      console.log(`  ⚠ No archive match: ${row.id}  (${row.jobDate}) — skipped`);
      noMatch++;
      continue;
    }

    const req = new sql.Request();
    req.input('amount', sql.Decimal(18, 2), archiveAmount);
    req.input('id', sql.NVarChar(36), row.id);
    await req.query(`UPDATE Jobs SET amount = @amount, updatedAt = GETUTCDATE() WHERE id = @id`);
    console.log(`  ✔ Fixed ${row.id}  (${row.jobDate})  →  amount = ${archiveAmount}`);
    fixed++;
  }

  await (sql as any).close();
  console.log(`\n✅ Done — ${fixed} fixed, ${noMatch} with no archive match.`);
}

main().catch(err => { console.error(err); process.exit(1); });
