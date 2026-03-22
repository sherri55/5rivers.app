import sql from 'mssql';
import { config } from '../config';

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config.databaseUrl);
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
  }
}

/** Run a query; use for SELECT and single statements. */
export async function query<T = sql.IRecordSet<any>>(queryText: string, params?: Record<string, unknown>): Promise<T> {
  const p = await getPool();
  const request = p.request();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }
  }
  const result = await request.query(queryText);
  return result.recordset as T;
}

/** Execute non-query (e.g. schema script with multiple batches). */
export async function execute(sqlText: string): Promise<void> {
  const p = await getPool();
  await p.request().query(sqlText);
}
