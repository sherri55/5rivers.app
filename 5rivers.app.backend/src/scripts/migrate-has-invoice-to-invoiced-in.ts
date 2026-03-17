/**
 * Migration: ensure every Job–Invoice link has INVOICED_IN (canonical relationship).
 * - For each (j)-[:HAS_INVOICE]->(i) that does NOT already have (j)-[:INVOICED_IN]->(i),
 *   create INVOICED_IN with amount and createdAt from HAS_INVOICE (or from relationship props).
 * - Does NOT delete HAS_INVOICE (so existing Job.invoice resolver that reads HAS_INVOICE still works
 *   until you switch the resolver to INVOICED_IN). After switching, you can run a follow-up to remove HAS_INVOICE.
 *
 * Run: npx ts-node src/scripts/migrate-has-invoice-to-invoiced-in.ts
 * Back up Neo4j before running.
 */
import { neo4jService } from '../database/neo4j';

async function main() {
  console.log('Checking for Job–Invoice links that have HAS_INVOICE but no INVOICED_IN...\n');

  const findMissing = `
    MATCH (j:Job)-[r:HAS_INVOICE]->(i:Invoice)
    WHERE NOT (j)-[:INVOICED_IN]->(i)
    RETURN j.id AS jobId, i.id AS invoiceId, r.amount AS amount, r.invoicedAt AS invoicedAt
  `;
  const rows = await neo4jService.runQuery<{ jobId: string; invoiceId: string; amount?: number; invoicedAt?: string }>(
    findMissing,
    {}
  );

  if (rows.length === 0) {
    console.log('No Job–Invoice pairs found with HAS_INVOICE but missing INVOICED_IN. Nothing to do.');
    return;
  }

  console.log(`Found ${rows.length} job–invoice pair(s) to sync (create INVOICED_IN).\n`);

  let created = 0;
  let errors = 0;
  for (const row of rows) {
    const amount = row.amount != null ? row.amount : 0;
    const createdAtStr = row.invoicedAt != null ? String(row.invoicedAt) : new Date().toISOString();
    const createRel = `
      MATCH (j:Job {id: $jobId}), (i:Invoice {id: $invoiceId})
      CREATE (j)-[:INVOICED_IN {amount: $amount, createdAt: $createdAt}]->(i)
    `;
    try {
      await neo4jService.runQuery(createRel, {
        jobId: row.jobId,
        invoiceId: row.invoiceId,
        amount,
        createdAt: createdAtStr,
      });
      created++;
      console.log(`  Created INVOICED_IN: Job ${row.jobId} -> Invoice ${row.invoiceId} (amount: ${amount})`);
    } catch (e) {
      errors++;
      console.error(`  Error Job ${row.jobId} -> Invoice ${row.invoiceId}:`, e);
    }
  }

  console.log(`\nDone. Created ${created} INVOICED_IN relationship(s), ${errors} error(s).`);
  console.log('You can now switch Job.invoice resolver to use INVOICED_IN only.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
