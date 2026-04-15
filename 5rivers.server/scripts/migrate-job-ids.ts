/**
 * Migrate custom-format job IDs (job_<timestamp>_<random>) to standard UUIDs.
 * Updates Jobs + all FK tables (JobInvoice, Images, JobDriverPay) atomically per job.
 * Writes old→new mapping to scripts/id-migration-log.json for auditability.
 *
 * Run: npx ts-node scripts/migrate-job-ids.ts
 */

import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import sql from 'mssql';
import { v4 as uuid } from 'uuid';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL not set in .env');

const LOG_PATH = path.resolve(__dirname, 'id-migration-log.json');

async function main() {
  const pool = await sql.connect(DATABASE_URL!);
  console.log('✅ Connected to SQL Server\n');

  // Find all custom-format job IDs
  const rows = await new sql.Request().query<{ id: string; jobDate: string }>(`
    SELECT id, CAST(jobDate AS VARCHAR(20)) AS jobDate
    FROM Jobs
    WHERE id LIKE 'job_%'
    ORDER BY jobDate
  `);

  console.log(`Found ${rows.recordset.length} jobs with custom IDs\n`);

  if (rows.recordset.length === 0) {
    console.log('Nothing to migrate.');
    await (sql as any).close();
    return;
  }

  // Disable FK constraints so we can update parent (Jobs.id) and children in any order
  const disableReq = new sql.Request();
  await disableReq.query(`
    ALTER TABLE Images       NOCHECK CONSTRAINT FK_Images_Job;
    ALTER TABLE JobInvoice   NOCHECK CONSTRAINT FK_JobInvoice_Job;
    ALTER TABLE JobDriverPay NOCHECK CONSTRAINT FK_JobDriverPay_Job;
  `);
  console.log('⏸  FK constraints disabled\n');

  const log: Array<{ oldId: string; newId: string; jobDate: string }> = [];
  let migrated = 0;
  let failed = 0;

  for (const row of rows.recordset) {
    const oldId = row.id;
    const newId = uuid();

    const tx = new sql.Transaction(pool);
    try {
      await tx.begin();

      const r = (q: string, p: Record<string, string>) => {
        const req = new sql.Request(tx);
        Object.entries(p).forEach(([k, v]) => req.input(k, sql.NVarChar(100), v));
        return req.query(q);
      };

      await r(`UPDATE Jobs         SET id    = @newId WHERE id    = @oldId`, { newId, oldId });
      await r(`UPDATE JobInvoice   SET jobId = @newId WHERE jobId = @oldId`, { newId, oldId });
      await r(`UPDATE Images       SET jobId = @newId WHERE jobId = @oldId`, { newId, oldId });
      await r(`UPDATE JobDriverPay SET jobId = @newId WHERE jobId = @oldId`, { newId, oldId });

      await tx.commit();
      log.push({ oldId, newId, jobDate: row.jobDate });
      console.log(`  ✔ ${oldId}  →  ${newId}  (${row.jobDate})`);
      migrated++;
    } catch (err) {
      await tx.rollback();
      console.error(`  ✗ Failed: ${oldId} — ${(err as Error).message}`);
      failed++;
    }
  }

  // Re-enable and re-validate FK constraints
  const enableReq = new sql.Request();
  await enableReq.query(`
    ALTER TABLE Images       WITH CHECK CHECK CONSTRAINT FK_Images_Job;
    ALTER TABLE JobInvoice   WITH CHECK CHECK CONSTRAINT FK_JobInvoice_Job;
    ALTER TABLE JobDriverPay WITH CHECK CHECK CONSTRAINT FK_JobDriverPay_Job;
  `);
  console.log('\n▶  FK constraints re-enabled and validated');

  // Write audit log
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
  console.log(`\n📄 Migration log written to ${LOG_PATH}`);

  await (sql as any).close();
  console.log(`\n✅ Done — ${migrated} migrated, ${failed} failed.`);
}

main().catch(err => { console.error(err); process.exit(1); });
