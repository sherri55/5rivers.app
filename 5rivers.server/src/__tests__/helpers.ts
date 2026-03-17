import { v4 as uuid } from 'uuid';
import { query } from '../db/connection';
import { hashPassword } from '../services/auth.service';
import { login } from '../services/auth.service';

export const TEST_ORG_SLUG = 'test-5rivers-server-cleanup';
export const TEST_USER_EMAIL = 'test-5rivers-server@example.com';
export const TEST_PASSWORD = 'TestPassword123!';

export interface TestContext {
  orgId: string;
  userId: string;
  token: string;
  email: string;
  password: string;
  organizationSlug: string;
}

/**
 * Create a dedicated test organization, user, and membership.
 * Use the returned context for authenticated requests.
 */
export async function createTestOrgAndUser(): Promise<TestContext> {
  const orgId = uuid();
  const userId = uuid();
  const passwordHash = await hashPassword(TEST_PASSWORD);
  const now = new Date();

  await query(
    `INSERT INTO Users (id, email, passwordHash, name, createdAt, updatedAt)
     VALUES (@userId, @email, @passwordHash, @name, @now, @now)`,
    {
      params: {
        userId,
        email: TEST_USER_EMAIL,
        passwordHash,
        name: 'Test User',
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
        name: 'Test Organization',
        slug: TEST_ORG_SLUG,
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

  const { token } = await login({
    email: TEST_USER_EMAIL,
    password: TEST_PASSWORD,
    organizationSlug: TEST_ORG_SLUG,
  });

  return {
    orgId,
    userId,
    token,
    email: TEST_USER_EMAIL,
    password: TEST_PASSWORD,
    organizationSlug: TEST_ORG_SLUG,
  };
}

/**
 * Remove all test data created during tests. Call in afterAll.
 * Order: child tables first, then OrganizationMember, Organizations, Users.
 */
export async function deleteTestData(orgId: string, userId: string): Promise<void> {
  const { getPool } = await import('../db/connection');
  const pool = await getPool();

  const steps: { sql: string; params: Record<string, string> }[] = [
    { sql: 'DELETE FROM JobDriverPay WHERE jobId IN (SELECT id FROM Jobs WHERE organizationId = @orgId)', params: { orgId } },
    { sql: 'DELETE FROM DriverPayment WHERE organizationId = @orgId', params: { orgId } },
    { sql: 'DELETE FROM JobInvoice WHERE jobId IN (SELECT id FROM Jobs WHERE organizationId = @orgId)', params: { orgId } },
    { sql: 'DELETE FROM Images WHERE jobId IN (SELECT id FROM Jobs WHERE organizationId = @orgId)', params: { orgId } },
    { sql: 'DELETE FROM Jobs WHERE organizationId = @orgId', params: { orgId } },
    { sql: 'DELETE FROM Invoices WHERE organizationId = @orgId', params: { orgId } },
    { sql: 'DELETE FROM JobTypes WHERE companyId IN (SELECT id FROM Companies WHERE organizationId = @orgId)', params: { orgId } },
    { sql: 'DELETE FROM Companies WHERE organizationId = @orgId', params: { orgId } },
    { sql: 'DELETE FROM Drivers WHERE organizationId = @orgId', params: { orgId } },
    { sql: 'DELETE FROM Dispatchers WHERE organizationId = @orgId', params: { orgId } },
    { sql: 'DELETE FROM Units WHERE organizationId = @orgId', params: { orgId } },
    { sql: 'DELETE FROM OrganizationMember WHERE userId = @userId AND organizationId = @orgId', params: { userId, orgId } },
    { sql: 'DELETE FROM Organizations WHERE id = @orgId', params: { orgId } },
    { sql: 'DELETE FROM Users WHERE id = @userId', params: { userId } },
  ];

  for (const { sql, params } of steps) {
    try {
      const request = pool.request();
      for (const [key, value] of Object.entries(params)) {
        request.input(key, value);
      }
      await request.query(sql);
    } catch (e) {
      console.warn('Cleanup step failed (may be expected if table empty):', sql.slice(0, 60), e);
    }
  }
}
