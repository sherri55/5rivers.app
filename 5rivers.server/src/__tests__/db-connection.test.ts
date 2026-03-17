/**
 * Standalone test to verify database connectivity.
 * Run with: npm test -- db-connection
 * If this passes, DATABASE_URL and SQL Server are reachable.
 */
import { getPool, closePool, query } from '../db/connection';

describe('DB connection', () => {
  afterAll(async () => {
    await closePool();
  }, 10000);

  it(
    'connects and runs a simple query',
    async () => {
      const pool = await getPool();
      expect(pool).toBeDefined();

      const rows = await query<[{ one: number }]>('SELECT 1 AS one');
      expect(rows).toHaveLength(1);
      expect(rows[0].one).toBe(1);
    },
    90000
  );
});
