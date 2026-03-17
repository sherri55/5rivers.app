/**
 * Insert a sample user and organization for local/demo login.
 * Run: npm run db:seed
 *
 * Credentials (use for login):
 *   email: demo@5rivers.app
 *   password: Demo123!
 *   organizationSlug: demo
 */
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { v4 as uuid } from 'uuid';
import { getPool, closePool, query } from '../src/db/connection';
import { hashPassword } from '../src/services/auth.service';

const DEMO_EMAIL = 'demo@5rivers.app';
const DEMO_PASSWORD = 'Demo123!';
const DEMO_ORG_SLUG = 'demo';
const DEMO_ORG_NAME = 'Demo Organization';

async function main() {
  const pool = await getPool();

  // Remove existing demo user/org if present (idempotent re-run)
  const existingUser = await query<Array<{ id: string }>>(
    `SELECT id FROM Users WHERE email = @email`,
    { params: { email: DEMO_EMAIL } }
  );
  const existingOrg = await query<Array<{ id: string }>>(
    `SELECT id FROM Organizations WHERE slug = @slug`,
    { params: { slug: DEMO_ORG_SLUG } }
  );

  if (Array.isArray(existingUser) && existingUser.length > 0) {
    const userId = existingUser[0].id;
    await query(`DELETE FROM OrganizationMember WHERE userId = @userId`, { params: { userId } });
    await query(`DELETE FROM Users WHERE id = @userId`, { params: { userId } });
  }
  if (Array.isArray(existingOrg) && existingOrg.length > 0) {
    const orgId = existingOrg[0].id;
    await query(`DELETE FROM OrganizationMember WHERE organizationId = @orgId`, { params: { orgId } });
    await query(`DELETE FROM Organizations WHERE id = @orgId`, { params: { orgId } });
  }

  const orgId = uuid();
  const userId = uuid();
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const now = new Date();

  await query(
    `INSERT INTO Users (id, email, passwordHash, name, createdAt, updatedAt)
     VALUES (@userId, @email, @passwordHash, @name, @now, @now)`,
    {
      params: {
        userId,
        email: DEMO_EMAIL,
        passwordHash,
        name: 'Demo User',
        now,
      },
    }
  );

  await query(
    `INSERT INTO Organizations (id, name, slug, settings, createdAt, updatedAt)
     VALUES (@orgId, @name, @slug, NULL, @now, @now)`,
    {
      params: {
        orgId,
        name: DEMO_ORG_NAME,
        slug: DEMO_ORG_SLUG,
        now,
      },
    }
  );

  await query(
    `INSERT INTO OrganizationMember (userId, organizationId, role, createdAt)
     VALUES (@userId, @orgId, @role, @now)`,
    {
      params: {
        userId,
        orgId,
        role: 'OWNER',
        now,
      },
    }
  );

  console.log('Sample user created. Login with:');
  console.log('  email:             ', DEMO_EMAIL);
  console.log('  password:          ', DEMO_PASSWORD);
  console.log('  organizationSlug:  ', DEMO_ORG_SLUG);
}

main()
  .then(() => closePool())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
