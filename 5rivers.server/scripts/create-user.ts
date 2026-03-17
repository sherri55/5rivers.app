/**
 * Create a user and add them to the demo organization so they can log in.
 * Run: npm run db:create-user
 *
 * Edit EMAIL and PASSWORD below, or pass as env: CREATE_USER_EMAIL, CREATE_USER_PASSWORD.
 */
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { v4 as uuid } from 'uuid';
import { query, closePool } from '../src/db/connection';
import { hashPassword } from '../src/services/auth.service';

const EMAIL = (process.env.CREATE_USER_EMAIL ?? 'info@5riverstruckinginc.ca').trim().toLowerCase();
const PASSWORD = process.env.CREATE_USER_PASSWORD ?? 'Edy@1234';
const DEMO_ORG_SLUG = 'demo';

async function main() {
  const passwordHash = await hashPassword(PASSWORD);

  const orgRows = await query<Array<{ id: string }>>(
    `SELECT id FROM Organizations WHERE slug = @slug`,
    { params: { slug: DEMO_ORG_SLUG } }
  );
  if (!Array.isArray(orgRows) || orgRows.length === 0) {
    console.error('Demo organization not found. Run: npm run db:seed');
    process.exit(1);
  }
  const demoOrgId = orgRows[0].id;

  const existing = await query<Array<{ id: string }>>(
    `SELECT id FROM Users WHERE email = @email`,
    { params: { email: EMAIL } }
  );

  let userId: string;
  const now = new Date();

  if (Array.isArray(existing) && existing.length > 0) {
    userId = existing[0].id;
    await query(
      `UPDATE Users SET passwordHash = @passwordHash, updatedAt = @now WHERE id = @userId`,
      { params: { passwordHash, now, userId } }
    );
    console.log('Updated existing user password:', EMAIL);
  } else {
    userId = uuid();
    await query(
      `INSERT INTO Users (id, email, passwordHash, name, createdAt, updatedAt)
       VALUES (@userId, @email, @passwordHash, @name, @now, @now)`,
      {
        params: {
          userId,
          email: EMAIL,
          passwordHash,
          name: EMAIL.split('@')[0] || 'User',
          now,
        },
      }
    );
    console.log('Created user:', EMAIL);
  }

  const memberRows = await query<Array<{ userId: string }>>(
    `SELECT userId FROM OrganizationMember WHERE userId = @userId AND organizationId = @organizationId`,
    { params: { userId, organizationId: demoOrgId } }
  );
  if (!Array.isArray(memberRows) || memberRows.length === 0) {
    await query(
      `INSERT INTO OrganizationMember (userId, organizationId, role, createdAt)
       VALUES (@userId, @organizationId, @role, @now)`,
      { params: { userId, organizationId: demoOrgId, role: 'OWNER', now } }
    );
    console.log('Added user to demo organization.');
  }

  console.log('\nLogin with:');
  console.log('  email:             ', EMAIL);
  console.log('  password:          ', PASSWORD);
  console.log('  organizationSlug:  ', DEMO_ORG_SLUG);
}

main()
  .then(() => closePool())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
