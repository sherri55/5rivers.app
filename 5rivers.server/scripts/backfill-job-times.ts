/**
 * Backfill startTime/endTime for 17 migrated jobs that have null times in SQL.
 * Queries Neo4j directly using the same job IDs (IDs are shared between Neo4j and SQL).
 *
 * Run: npx ts-node --esm scripts/backfill-job-times.ts
 */

import path from 'path';
import dotenv from 'dotenv';

const neo4j = require('neo4j-driver') as {
  driver: (uri: string, auth: unknown, options?: { disableLosslessIntegers?: boolean }) => any;
  auth: { basic: (user: string, password: string) => unknown };
};
import sql from 'mssql';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const NEO4J_URI      = process.env.NEO4J_URI      ?? 'bolt://localhost:7687';
const NEO4J_USER     = process.env.NEO4J_USERNAME  ?? 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD  ?? 'password';
const NEO4J_DATABASE = process.env.NEO4J_DATABASE  ?? 'neo4j';
const DATABASE_URL   = process.env.DATABASE_URL;

// The 17 job IDs missing startTime/endTime
const MISSING_JOB_IDS = [
  'job_1765735529538_cat0e1bsz',
  'job_1765565600694_ngoqlmvh3',
  'job_1765565427595_exlgti2la',
  'job_1765565361871_jch5yoxa8',
  'job_1764450659005_7rxk151ne',
  'job_1759773793537_d59ogjlar',
  'job_1757222325710_b0fppwd3f',
  'job_1757221997408_hudp8fi21',
  'job_1757214481902_c3xg3lbvv',
  'job_1757214446677_zhnx1xv34',
  'job_1754958946834_diox3ja3x',
  'job_1754957664138_dhye0019h',
  'job_1752812277144_a210hclhn',
  'job_1752812229572_rv05noi1i',
  'job_1752811895374_6nib7wrq5',
  'job_1752184278918_8671spztw',
  'job_1752178528531_l5048qnb7',
];

async function main() {
  // ── Connect Neo4j ────────────────────────────────────────────
  const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
    { disableLosslessIntegers: true }
  );
  await driver.verifyConnectivity();
  console.log('✅ Neo4j connected:', NEO4J_URI);

  const session = driver.session({ database: NEO4J_DATABASE });

  // Query all 17 jobs from Neo4j
  const result = await session.run(
    `MATCH (j:Job) WHERE j.id IN $ids RETURN j.id AS id, j.startTime AS startTime, j.endTime AS endTime`,
    { ids: MISSING_JOB_IDS }
  );
  await session.close();
  await driver.close();

  const found = result.records.map((r: any) => ({
    id:        r.get('id'),
    startTime: r.get('startTime') ?? null,
    endTime:   r.get('endTime')   ?? null,
  }));

  console.log(`\nNeo4j returned ${found.length} / ${MISSING_JOB_IDS.length} jobs:`);
  found.forEach((j: any) => {
    console.log(`  ${j.id}  startTime=${j.startTime ?? 'NULL'}  endTime=${j.endTime ?? 'NULL'}`);
  });

  const withTimes = found.filter((j: any) => j.startTime || j.endTime);
  console.log(`\n${withTimes.length} jobs have times to backfill.`);
  if (withTimes.length === 0) {
    console.log('Nothing to update — times were null in Neo4j too.');
    return;
  }

  // ── Connect SQL ──────────────────────────────────────────────
  if (!DATABASE_URL) throw new Error('DATABASE_URL not set in .env');
  await sql.connect(DATABASE_URL);
  console.log('✅ SQL Server connected');

  let updated = 0;
  for (const job of withTimes) {
    const req = new sql.Request();
    req.input('startTime', sql.NVarChar(20), job.startTime);
    req.input('endTime',   sql.NVarChar(20), job.endTime);
    req.input('id',        sql.NVarChar(100), job.id);
    await req.query(`UPDATE Jobs SET startTime = @startTime, endTime = @endTime WHERE id = @id`);
    console.log(`  ✔ Updated ${job.id}  ${job.startTime} → ${job.endTime}`);
    updated++;
  }

  await (sql as any).close();
  console.log(`\n✅ Done — ${updated} jobs updated.`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
