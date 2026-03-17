/**
 * Run pending migrations from scripts/migrations/ in order.
 * Loads .env from project root. Run: npm run db:migrate
 */
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { getPool, closePool } from '../src/db/connection';

const migrationsDir = path.resolve(__dirname, 'migrations');

function getBatches(content: string): string[] {
  return content
    .split(/\s*GO\s*/i)
    .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
    .filter((s) => s.length > 0);
}

async function main() {
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory, skipping.');
    return;
  }
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  const pool = await getPool();
  try {
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const batches = getBatches(content);
      for (let i = 0; i < batches.length; i++) {
        await pool.request().query(batches[i]);
      }
      console.log('Applied:', file);
    }
    console.log('Migrations complete.');
  } finally {
    await closePool();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
