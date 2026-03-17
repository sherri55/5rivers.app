/**
 * Assign all organization-scoped rows to the demo organization so migrated data
 * appears when you log in with: email=demo@5rivers.app, password=Demo123!, organizationSlug=demo
 *
 * Run: npm run db:assign-demo
 */
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { getPool, closePool, query } from '../src/db/connection';

async function main() {
  const rows = await query<Array<{ id: string }>>(
    `SELECT id FROM Organizations WHERE slug = 'demo'`
  );
  if (!Array.isArray(rows) || rows.length === 0) {
    console.error('No organization with slug "demo" found. Run: npm run db:seed');
    process.exit(1);
  }
  const demoOrgId = rows[0].id;
  console.log('Demo organization id:', demoOrgId);

  await query(`UPDATE Companies SET organizationId = @demoOrgId`, { params: { demoOrgId } });
  await query(`UPDATE Drivers SET organizationId = @demoOrgId`, { params: { demoOrgId } });
  await query(`UPDATE Dispatchers SET organizationId = @demoOrgId`, { params: { demoOrgId } });
  await query(`UPDATE Units SET organizationId = @demoOrgId`, { params: { demoOrgId } });
  await query(`UPDATE Invoices SET organizationId = @demoOrgId`, { params: { demoOrgId } });
  await query(`UPDATE Jobs SET organizationId = @demoOrgId`, { params: { demoOrgId } });
  await query(`UPDATE DriverPayment SET organizationId = @demoOrgId`, { params: { demoOrgId } });

  console.log('All organization-scoped rows assigned to demo org.');
  console.log('Log in with: email=demo@5rivers.app, password=Demo123!, organizationSlug=demo');
}

main()
  .then(() => closePool())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
