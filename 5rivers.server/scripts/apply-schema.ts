/**
 * Apply schema.sql to the database. Loads .env from project root.
 * Run: npm run db:schema
 */
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { getPool, closePool } from '../src/db/connection';

async function main() {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  const pool = await getPool();
  try {
    await pool.request().query(schema);
    console.log('Schema applied successfully.');
  } finally {
    await closePool();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
