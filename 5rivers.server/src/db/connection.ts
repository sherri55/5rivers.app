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

export interface QueryOptions {
  params?: Record<string, unknown>;
}

/** Run a query and return the recordset. */
export async function query<T = unknown[]>(
  queryText: string,
  options: QueryOptions = {}
): Promise<T> {
  const p = await getPool();
  const request = p.request();
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      if (Buffer.isBuffer(value)) {
        request.input(key, sql.VarBinary(sql.MAX), value);
      } else {
        request.input(key, value);
      }
    }
  }
  const result = await request.query(queryText);
  return result.recordset as T;
}
