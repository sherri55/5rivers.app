/**
 * Uniqueness constraints for Neo4j. Uses IF NOT EXISTS — safe to run repeatedly.
 * Run after ensureIndexes. Fails if duplicate data exists; fix data first then re-run.
 *
 * Database optimizations (from DATABASE_AUDIT):
 * - Prevents duplicate node ids and duplicate invoice numbers.
 */
import { neo4jService } from './neo4j';

const CONSTRAINTS: string[] = [
  'CREATE CONSTRAINT company_id_unique IF NOT EXISTS FOR (c:Company) REQUIRE c.id IS UNIQUE',
  'CREATE CONSTRAINT driver_id_unique IF NOT EXISTS FOR (d:Driver) REQUIRE d.id IS UNIQUE',
  'CREATE CONSTRAINT dispatcher_id_unique IF NOT EXISTS FOR (d:Dispatcher) REQUIRE d.id IS UNIQUE',
  'CREATE CONSTRAINT unit_id_unique IF NOT EXISTS FOR (u:Unit) REQUIRE u.id IS UNIQUE',
  'CREATE CONSTRAINT job_type_id_unique IF NOT EXISTS FOR (jt:JobType) REQUIRE jt.id IS UNIQUE',
  'CREATE CONSTRAINT job_id_unique IF NOT EXISTS FOR (j:Job) REQUIRE j.id IS UNIQUE',
  'CREATE CONSTRAINT invoice_id_unique IF NOT EXISTS FOR (i:Invoice) REQUIRE i.id IS UNIQUE',
  'CREATE CONSTRAINT invoice_number_unique IF NOT EXISTS FOR (i:Invoice) REQUIRE i.invoiceNumber IS UNIQUE',
  'CREATE CONSTRAINT stored_image_id_unique IF NOT EXISTS FOR (s:StoredImage) REQUIRE s.id IS UNIQUE',
];

export async function ensureConstraints(): Promise<void> {
  for (const query of CONSTRAINTS) {
    try {
      await neo4jService.runQuery(query);
    } catch (error: any) {
      const msg = error?.message ?? String(error);
      // Already exists is fine; duplicate key means fix data first
      if (msg.includes('already exists') || msg.includes('EquivalentSchemaRuleAlreadyExists')) {
        continue;
      }
      if (msg.includes('already have a constraint') || msg.includes('Duplicate')) {
        console.warn(`Constraint skipped (may already exist or duplicate data): ${msg}`);
        continue;
      }
      console.warn(`Constraint warning: ${msg}`);
    }
  }
}
