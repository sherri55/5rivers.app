/**
 * Fix 2 tonnage jobs with NULL amounts by calculating: sum(weights) × rateOfJob
 * Run: npx ts-node scripts/fix-tonnage-amounts.ts
 */
import path from 'path';
import dotenv from 'dotenv';
import sql from 'mssql';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL not set in .env');

async function main() {
  await sql.connect(DATABASE_URL!);
  console.log('✅ Connected\n');

  const rows = await new sql.Request().query<any>(`
    SELECT j.id, CAST(j.jobDate AS VARCHAR(10)) AS jobDate,
           j.weight, jt.rateOfJob, jt.title AS jobType
    FROM Jobs j
    JOIN JobTypes jt ON jt.id = j.jobTypeId
    WHERE j.id IN (
      '6786415b-9fc3-4133-b9c0-10f230ff06ad',
      '3260cd95-686d-4360-917f-bba6e9a75f33'
    )
  `);

  for (const row of rows.recordset) {
    const weights: number[] = JSON.parse(row.weight || '[]');
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    const amount = Math.round(totalWeight * row.rateOfJob * 100) / 100;

    console.log(`Job: ${row.jobDate}  (${row.id.substring(0, 8)})`);
    console.log(`  Type: ${row.jobType}`);
    console.log(`  Weights: ${weights.join(' + ')} = ${totalWeight.toFixed(2)} tons`);
    console.log(`  Rate: $${row.rateOfJob}/ton`);
    console.log(`  Amount: ${totalWeight.toFixed(2)} × ${row.rateOfJob} = $${amount.toFixed(2)}\n`);

    const req = new sql.Request();
    req.input('amount', sql.Decimal(18, 2), amount);
    req.input('id', sql.NVarChar(36), row.id);
    await req.query(`UPDATE Jobs SET amount = @amount, updatedAt = GETUTCDATE() WHERE id = @id`);
    console.log(`  ✔ Updated\n`);
  }

  await (sql as any).close();
  console.log('✅ Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
