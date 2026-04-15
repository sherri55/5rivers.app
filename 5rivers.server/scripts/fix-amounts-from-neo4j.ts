/**
 * Fix job amounts that are NULL or 0 by querying Neo4j directly.
 * Uses the live Neo4j instance at 192.168.68.63.
 *
 * Run: npx ts-node scripts/fix-amounts-from-neo4j.ts
 */

import path from 'path';
import dotenv from 'dotenv';
import sql from 'mssql';
import neo4j from 'neo4j-driver';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL not set in .env');

const NEO4J_URI = 'neo4j://192.168.68.63:7687';
const NEO4J_USER = 'neo4j';
const NEO4J_PASS = 'Edy@1234';

async function main() {
  // ── Connect to both databases ──────────────────────────────────────────────
  const pool = await sql.connect(DATABASE_URL!);
  console.log('✅ Connected to SQL Server\n');

  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASS));
  await driver.verifyConnectivity();
  console.log('✅ Connected to Neo4j\n');

  // ── Find SQL jobs with NULL or 0 amount ────────────────────────────────────
  const nullRows = await new sql.Request().query<{ id: string; jobDate: string }>(`
    SELECT id, CAST(jobDate AS VARCHAR(20)) AS jobDate
    FROM Jobs
    WHERE amount IS NULL OR amount = 0
    ORDER BY jobDate
  `);
  console.log(`Found ${nullRows.recordset.length} SQL jobs with NULL/0 amount\n`);

  if (nullRows.recordset.length === 0) {
    console.log('Nothing to fix.');
    await driver.close();
    await (sql as any).close();
    return;
  }

  const missingIds = nullRows.recordset.map(r => r.id);

  // ── Query Neo4j for amounts ────────────────────────────────────────────────
  const session = driver.session({ database: 'neo4j' });
  const result = await session.run(
    `MATCH (j:Job)
     WHERE j.id IN $ids AND j.jobGrossAmount IS NOT NULL AND j.jobGrossAmount > 0
     RETURN j.id AS id, j.jobGrossAmount AS amount`,
    { ids: missingIds }
  );
  await session.close();

  const neo4jMap = new Map<string, number>(
    result.records.map(r => [r.get('id') as string, (r.get('amount') as any).toNumber ? (r.get('amount') as any).toNumber() : Number(r.get('amount'))])
  );

  console.log(`Neo4j returned amounts for ${neo4jMap.size} of ${missingIds.length} jobs\n`);

  // ── Update SQL ─────────────────────────────────────────────────────────────
  let fixed = 0;
  let noMatch = 0;

  for (const row of nullRows.recordset) {
    const amount = neo4jMap.get(row.id);
    if (amount == null) {
      console.log(`  ⚠ No Neo4j match: ${row.id}  (${row.jobDate}) — skipped`);
      noMatch++;
      continue;
    }

    const req = new sql.Request();
    req.input('amount', sql.Decimal(18, 2), amount);
    req.input('id', sql.NVarChar(36), row.id);
    await req.query(`UPDATE Jobs SET amount = @amount, updatedAt = GETUTCDATE() WHERE id = @id`);
    console.log(`  ✔ Fixed ${row.id}  (${row.jobDate})  →  amount = ${amount}`);
    fixed++;
  }

  await driver.close();
  await (sql as any).close();
  console.log(`\n✅ Done — ${fixed} fixed, ${noMatch} with no Neo4j match.`);
}

main().catch(err => { console.error(err); process.exit(1); });
