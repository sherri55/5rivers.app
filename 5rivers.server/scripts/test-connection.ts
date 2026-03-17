/**
 * Standalone script to test database connectivity.
 * Run from project root: npx ts-node scripts/test-connection.ts
 * Or: npm run test:db
 */
import path from 'path';
import dotenv from 'dotenv';

// Load .env from project root (5rivers.server/)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// Use a shorter timeout for this script so we fail fast (15s)
process.env.DATABASE_CONNECTION_TIMEOUT = '15000';

import { getPool, query, closePool } from '../src/db/connection';

const PORT_HINT = `
Named-instance connections often hang from Node when SQL Server Browser is not used.
Use the instance TCP port instead (no Browser needed):

1. Open "SQL Server Configuration Manager"
2. SQL Server Network Configuration → Protocols for MSSQL2025 → TCP/IP
3. Right-click TCP/IP → Properties → IP Addresses → scroll to "IPAll"
4. Note "TCP Dynamic Ports" or "TCP Port" (e.g. 49152)
5. In .env set:
   DATABASE_URL=Server=localhost,<PORT>;User Id=sa;Password=...;Encrypt=True;TrustServerCertificate=True;Database=5rivers
   (replace <PORT> with the number from step 4)
`;

async function main() {
  console.log('Connecting (15s timeout)...');
  const pool = await getPool();
  console.log('Connected. Running SELECT 1...');
  const rows = await query<[{ one: number }]>('SELECT 1 AS one');
  console.log('Result:', rows);
  await closePool();
  console.log('Done.');
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('Failed:', msg);
  if (/timeout|ETIMEDOUT|connect/i.test(msg)) {
    console.error(PORT_HINT);
  }
  process.exit(1);
});
