/**
 * Migrate data from Neo4j (5rivers.app.backend) to SQL Server (5rivers.server).
 * Requires: DATABASE_URL in .env, and NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD (optional: NEO4J_DATABASE).
 *
 * Run: npm run migrate:neo4j-to-sql
 * Ensure SQL schema is applied first (npm run db:schema).
 */

import path from 'path';
import dotenv from 'dotenv';
// Use require so TS doesn't require module resolution of neo4j-driver (run from 5rivers.server after npm install)
const neo4j = require('neo4j-driver') as {
  driver: (uri: string, auth: unknown, options?: { disableLosslessIntegers?: boolean }) => Neo4jDriver;
  auth: { basic: (user: string, password: string) => unknown };
};
interface Neo4jDriver {
  session(config: { database: string }): {
    run(query: string, params: object): Promise<{ records: Array<{ toObject(): unknown }> }>;
    close(): Promise<void>;
  };
  verifyConnectivity(): Promise<void>;
  close(): Promise<void>;
}
import sql from 'mssql';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// ----- Config -----
const NEO4J_URI = process.env.NEO4J_URI ?? 'neo4j://127.0.0.1:7687';
const NEO4J_USER = process.env.NEO4J_USERNAME ?? process.env.NEO4J_USER ?? 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD ?? 'password';
const NEO4J_DATABASE = process.env.NEO4J_DATABASE ?? 'neo4j';

const DEFAULT_ORG_NAME = process.env.MIGRATION_ORG_NAME ?? '5 Rivers Trucking Inc';
const DEFAULT_ORG_SLUG = process.env.MIGRATION_ORG_SLUG ?? 'demo';

const DEMO_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? 'demo@5rivers.app';
const DEMO_PASSWORD = 'Demo123!';
const DEMO_USER_NAME = '5 Rivers Admin';

// ----- Helpers -----
function toDateOrNull(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  const d = v instanceof Date ? v : new Date(v as string | number);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function toDateOnly(v: unknown): string | null {
  const iso = toDateOrNull(v);
  if (!iso) return null;
  return iso.slice(0, 10);
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && !isNaN(v)) return v;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function toStr(v: unknown, maxLen?: number): string | null {
  if (v == null) return null;
  const s = String(v);
  return maxLen ? s.slice(0, maxLen) : s;
}

function toBool(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  return String(v).toLowerCase() === 'true' || String(v) === '1';
}

/** Serialize weight (array) or ticketIds (array) for NVARCHAR(MAX). */
function serializeArray(v: unknown): string | null {
  if (v == null) return null;
  if (Array.isArray(v)) return JSON.stringify(v);
  if (typeof v === 'string') return v;
  return String(v);
}

function mapInvoiceStatus(status: unknown): string {
  const s = toStr(status)?.toUpperCase() ?? 'CREATED';
  if (s === 'DRAFT') return 'CREATED';
  if (['CREATED', 'RAISED', 'RECEIVED'].includes(s)) return s;
  return 'CREATED';
}

// ----- Neo4j -----
let neo4jDriver: Neo4jDriver;

async function neo4jRun<T = Record<string, unknown>>(
  query: string,
  params: Record<string, unknown> = {}
): Promise<T[]> {
  const session = neo4jDriver.session({ database: NEO4J_DATABASE });
  try {
    const result = await session.run(query, params);
    return result.records.map((r: { toObject(): unknown }) => r.toObject() as T);
  } finally {
    await session.close();
  }
}

function nodeProps<T = Record<string, unknown>>(record: Record<string, unknown>, key: string): T {
  const node = record[key];
  if (node && typeof node === 'object' && 'properties' in node) {
    return (node as { properties: T }).properties;
  }
  return record as T;
}

// ----- SQL -----
let sqlPool: sql.ConnectionPool;

async function getSqlPool(): Promise<sql.ConnectionPool> {
  if (!sqlPool) {
    let url = (process.env.DATABASE_URL ?? '').trim();
    if (!url) throw new Error('DATABASE_URL is required');
    url = url.replace(/^Data Source=/i, 'Server=').replace(/User ID=/gi, 'User Id=');
    if (!/Database=/i.test(url)) url = `${url};Database=5rivers`;
    sqlPool = await sql.connect(url);
  }
  return sqlPool;
}

async function sqlRun(
  queryText: string,
  params: Record<string, unknown> = {}
): Promise<sql.IResult<unknown>> {
  const pool = await getSqlPool();
  const request = pool.request();
  for (const [key, value] of Object.entries(params)) {
    if (Buffer.isBuffer(value)) {
      request.input(key, sql.VarBinary(sql.MAX), value);
    } else if (value instanceof Date) {
      request.input(key, sql.DateTime2, value);
    } else {
      request.input(key, value);
    }
  }
  return request.query(queryText);
}

// ----- Migration steps -----
async function getOrCreateDefaultOrg(): Promise<string> {
  const pool = await getSqlPool();
  const existing = await pool
    .request()
    .input('slug', sql.VarChar(100), DEFAULT_ORG_SLUG)
    .query('SELECT id FROM Organizations WHERE slug = @slug');
  if (existing.recordset?.length) {
    const orgId = existing.recordset[0].id;
    console.log('  Using existing organization:', orgId, DEFAULT_ORG_SLUG);
    return orgId;
  }
  const { v4: uuid } = await import('uuid');
  const orgId = uuid();
  await sqlRun(
    `INSERT INTO Organizations (id, name, slug, settings, createdAt, updatedAt)
     VALUES (@id, @name, @slug, NULL, GETUTCDATE(), GETUTCDATE())`,
    { id: orgId, name: DEFAULT_ORG_NAME, slug: DEFAULT_ORG_SLUG }
  );
  console.log('  Created organization:', orgId, DEFAULT_ORG_SLUG);
  return orgId;
}

async function migrateCompanies(orgId: string): Promise<void> {
  const records = await neo4jRun('MATCH (c:Company) RETURN c');
  if (records.length === 0) {
    console.log('  No companies in Neo4j.');
    return;
  }
  for (const record of records) {
    const c = nodeProps(record, 'c');
    const id = toStr(c.id);
    if (!id) continue;
    await sqlRun(
      `INSERT INTO Companies (id, organizationId, name, description, website, industry, location, size, founded, logo, email, phone, createdAt, updatedAt)
       VALUES (@id, @organizationId, @name, @description, @website, @industry, @location, @size, @founded, @logo, @email, @phone, @createdAt, @updatedAt)`,
      {
        id,
        organizationId: orgId,
        name: toStr(c.name) ?? '',
        description: toStr(c.description),
        website: toStr(c.website, 500),
        industry: toStr(c.industry, 255),
        location: toStr(c.location, 500),
        size: toStr(c.size, 50),
        founded: toNum(c.founded),
        logo: toStr(c.logo, 500),
        email: toStr(c.email, 255),
        phone: toStr(c.phone, 100),
        createdAt: toDateOrNull(c.createdAt),
        updatedAt: toDateOrNull(c.updatedAt),
      }
    );
  }
  console.log('  Companies:', records.length);
}

async function getOrCreatePlaceholderCompany(orgId: string): Promise<string> {
  const pool = await getSqlPool();
  const existing = await pool
    .request()
    .input('organizationId', sql.VarChar(36), orgId)
    .input('name', sql.NVarChar(255), 'Migrated (placeholder)')
    .query(`SELECT id FROM Companies WHERE organizationId = @organizationId AND name = @name`);
  if (existing.recordset?.length) {
    return existing.recordset[0].id;
  }
  const { v4: uuid } = await import('uuid');
  const companyId = uuid();
  await sqlRun(
    `INSERT INTO Companies (id, organizationId, name, description, website, industry, location, size, founded, logo, email, phone, createdAt, updatedAt)
     VALUES (@id, @organizationId, @name, @description, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, GETUTCDATE(), GETUTCDATE())`,
    {
      id: companyId,
      organizationId: orgId,
      name: 'Migrated (placeholder)',
      description: 'Used for job types that had no company link in Neo4j',
    }
  );
  console.log('  Created placeholder company for orphan job types');
  return companyId;
}

async function migrateJobTypes(orgId: string, placeholderCompanyId: string): Promise<void> {
  const seen = new Set<string>();

  // 1) JobTypes linked from a Company (have companyId)
  const fromCompany = await neo4jRun(
    `MATCH (c:Company)-[:HAS_JOB_TYPE]->(jt:JobType) RETURN c, jt`
  );
  for (const record of fromCompany) {
    const c = nodeProps(record, 'c');
    const jt = nodeProps(record, 'jt');
    const id = toStr(jt.id);
    const companyId = toStr(c.id);
    if (!id || !companyId) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    await sqlRun(
      `INSERT INTO JobTypes (id, companyId, title, startLocation, endLocation, dispatchType, rateOfJob, createdAt, updatedAt)
       VALUES (@id, @companyId, @title, @startLocation, @endLocation, @dispatchType, @rateOfJob, @createdAt, @updatedAt)`,
      {
        id,
        companyId,
        title: toStr(jt.title) ?? '',
        startLocation: toStr(jt.startLocation, 500),
        endLocation: toStr(jt.endLocation, 500),
        dispatchType: toStr(jt.dispatchType) ?? 'Load',
        rateOfJob: toNum(jt.rateOfJob) ?? 0,
        createdAt: toDateOrNull(jt.createdAt),
        updatedAt: toDateOrNull(jt.updatedAt),
      }
    );
  }

  // 2) JobTypes referenced by Jobs but not yet migrated (orphans: no HAS_JOB_TYPE from Company)
  const fromJobs = await neo4jRun(
    `MATCH (j:Job)-[:OF_TYPE]->(jt:JobType) RETURN DISTINCT jt`
  );
  let orphanCount = 0;
  for (const record of fromJobs) {
    const jt = nodeProps(record, 'jt');
    const id = toStr(jt.id);
    if (!id) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    orphanCount++;
    await sqlRun(
      `INSERT INTO JobTypes (id, companyId, title, startLocation, endLocation, dispatchType, rateOfJob, createdAt, updatedAt)
       VALUES (@id, @companyId, @title, @startLocation, @endLocation, @dispatchType, @rateOfJob, @createdAt, @updatedAt)`,
      {
        id,
        companyId: placeholderCompanyId,
        title: toStr(jt.title) ?? '(orphan)',
        startLocation: toStr(jt.startLocation, 500),
        endLocation: toStr(jt.endLocation, 500),
        dispatchType: toStr(jt.dispatchType) ?? 'Load',
        rateOfJob: toNum(jt.rateOfJob) ?? 0,
        createdAt: toDateOrNull(jt.createdAt),
        updatedAt: toDateOrNull(jt.updatedAt),
      }
    );
  }
  if (orphanCount) console.log('  Orphan job types (no company link):', orphanCount);
  console.log('  JobTypes:', seen.size);
}

async function migrateDrivers(orgId: string): Promise<void> {
  const records = await neo4jRun('MATCH (d:Driver) RETURN d');
  for (const record of records) {
    const d = nodeProps(record, 'd');
    const id = toStr(d.id);
    if (!id) continue;
    await sqlRun(
      `INSERT INTO Drivers (id, organizationId, name, description, email, phone, hourlyRate, createdAt, updatedAt)
       VALUES (@id, @organizationId, @name, @description, @email, @phone, @hourlyRate, @createdAt, @updatedAt)`,
      {
        id,
        organizationId: orgId,
        name: toStr(d.name) ?? '',
        description: toStr(d.description),
        email: toStr(d.email, 255),
        phone: toStr(d.phone, 100),
        hourlyRate: toNum(d.hourlyRate) ?? 0,
        createdAt: toDateOrNull(d.createdAt),
        updatedAt: toDateOrNull(d.updatedAt),
      }
    );
  }
  console.log('  Drivers:', records.length);
}

async function migrateDispatchers(orgId: string): Promise<void> {
  const records = await neo4jRun('MATCH (d:Dispatcher) RETURN d');
  for (const record of records) {
    const d = nodeProps(record, 'd');
    const id = toStr(d.id);
    if (!id) continue;
    await sqlRun(
      `INSERT INTO Dispatchers (id, organizationId, name, description, email, phone, commissionPercent, createdAt, updatedAt)
       VALUES (@id, @organizationId, @name, @description, @email, @phone, @commissionPercent, @createdAt, @updatedAt)`,
      {
        id,
        organizationId: orgId,
        name: toStr(d.name) ?? '',
        description: toStr(d.description),
        email: toStr(d.email, 255),
        phone: toStr(d.phone, 100),
        commissionPercent: toNum(d.commissionPercent) ?? 0,
        createdAt: toDateOrNull(d.createdAt),
        updatedAt: toDateOrNull(d.updatedAt),
      }
    );
  }
  console.log('  Dispatchers:', records.length);
}

async function migrateUnits(orgId: string): Promise<void> {
  const records = await neo4jRun('MATCH (u:Unit) RETURN u');
  for (const record of records) {
    const u = nodeProps(record, 'u');
    const id = toStr(u.id);
    if (!id) continue;
    await sqlRun(
      `INSERT INTO Units (id, organizationId, name, description, color, plateNumber, vin, createdAt, updatedAt)
       VALUES (@id, @organizationId, @name, @description, @color, @plateNumber, @vin, @createdAt, @updatedAt)`,
      {
        id,
        organizationId: orgId,
        name: toStr(u.name) ?? '',
        description: toStr(u.description),
        color: toStr(u.color, 100),
        plateNumber: toStr(u.plateNumber, 100),
        vin: toStr(u.vin, 100),
        createdAt: toDateOrNull(u.createdAt),
        updatedAt: toDateOrNull(u.updatedAt),
      }
    );
  }
  console.log('  Units:', records.length);
}

async function migrateInvoices(orgId: string): Promise<string | null> {
  const records = await neo4jRun(
    `MATCH (i:Invoice) OPTIONAL MATCH (i)-[:BILLED_BY]->(d:Dispatcher) RETURN i, d.id as dispatcherId`
  );
  let placeholderDispatcherId: string | null = null;
  const needsPlaceholder = records.some((r) => !toStr(r.dispatcherId));
  if (needsPlaceholder && records.length > 0) {
    const { v4: uuid } = await import('uuid');
    placeholderDispatcherId = uuid();
    await sqlRun(
      `INSERT INTO Dispatchers (id, organizationId, name, description, email, phone, commissionPercent, createdAt, updatedAt)
       VALUES (@id, @organizationId, @name, @description, NULL, NULL, 0, GETUTCDATE(), GETUTCDATE())`,
      {
        id: placeholderDispatcherId,
        organizationId: orgId,
        name: 'Migrated (placeholder)',
        description: 'Created for invoices without a dispatcher in Neo4j',
      }
    );
    console.log('  Created placeholder dispatcher for invoices without BILLED_BY');
  }
  for (const record of records) {
    const i = nodeProps(record, 'i');
    const id = toStr(i.id);
    if (!id) continue;
    const dispatcherId = toStr(record.dispatcherId) ?? placeholderDispatcherId;
    if (!dispatcherId) {
      console.warn('  Invoice', id, 'has no BILLED_BY dispatcher; skipping.');
      continue;
    }
    await sqlRun(
      `INSERT INTO Invoices (id, organizationId, invoiceNumber, invoiceDate, status, dispatcherId, billedTo, billedEmail, createdAt, updatedAt)
       VALUES (@id, @organizationId, @invoiceNumber, @invoiceDate, @status, @dispatcherId, @billedTo, @billedEmail, @createdAt, @updatedAt)`,
      {
        id,
        organizationId: orgId,
        invoiceNumber: toStr(i.invoiceNumber) ?? '',
        invoiceDate: toDateOnly(i.invoiceDate) ?? new Date().toISOString().slice(0, 10),
        status: mapInvoiceStatus(i.status),
        dispatcherId,
        billedTo: toStr(i.billedTo, 500),
        billedEmail: toStr(i.billedEmail, 255),
        createdAt: toDateOrNull(i.createdAt),
        updatedAt: toDateOrNull(i.updatedAt),
      }
    );
  }
  console.log('  Invoices:', records.length);
  return placeholderDispatcherId;
}

async function migrateJobs(orgId: string): Promise<void> {
  const records = await neo4jRun(
    `MATCH (j:Job)
     OPTIONAL MATCH (j)-[:OF_TYPE]->(jt:JobType)
     OPTIONAL MATCH (j)-[:ASSIGNED_TO]->(dr:Driver)
     OPTIONAL MATCH (j)-[:MANAGED_BY]->(d:Dispatcher)
     OPTIONAL MATCH (j)-[:USES_UNIT]->(u:Unit)
     RETURN j, jt.id as jobTypeId, dr.id as driverId, d.id as dispatcherId, u.id as unitId`
  );
  for (const record of records) {
    const j = nodeProps(record, 'j');
    const id = toStr(j.id);
    const jobTypeId = toStr(record.jobTypeId);
    if (!id || !jobTypeId) {
      console.warn('  Job', id, 'missing jobTypeId; skipping.');
      continue;
    }
    const jobDate = toDateOnly(j.jobDate);
    if (!jobDate) {
      console.warn('  Job', id, 'missing jobDate; skipping.');
      continue;
    }
    await sqlRun(
      `INSERT INTO Jobs (id, organizationId, jobDate, jobTypeId, driverId, dispatcherId, unitId, sourceType, weight, loads, startTime, endTime, amount, ticketIds, jobPaid, driverPaid, createdAt, updatedAt)
       VALUES (@id, @organizationId, @jobDate, @jobTypeId, @driverId, @dispatcherId, @unitId, @sourceType, @weight, @loads, @startTime, @endTime, @amount, @ticketIds, @jobPaid, @driverPaid, @createdAt, @updatedAt)`,
      {
        id,
        organizationId: orgId,
        jobDate,
        jobTypeId,
        driverId: toStr(record.driverId) || null,
        dispatcherId: toStr(record.dispatcherId) || null,
        unitId: toStr(record.unitId) || null,
        sourceType: toStr(record.dispatcherId) ? 'DISPATCHED' : 'DIRECT',
        weight: serializeArray(j.weight),
        loads: toNum(j.loads),
        startTime: toStr(j.startTime, 20),
        endTime: toStr(j.endTime, 20),
        amount: toNum(j.amount),
        ticketIds: serializeArray(j.ticketIds),
        jobPaid: toBool(j.driverPaid),
        driverPaid: toBool(j.driverPaid),
        createdAt: toDateOrNull(j.createdAt),
        updatedAt: toDateOrNull(j.updatedAt),
      }
    );
  }
  console.log('  Jobs:', records.length);
}

async function migrateJobInvoice(): Promise<void> {
  const records = await neo4jRun(
    `MATCH (j:Job)-[r:INVOICED_IN]->(i:Invoice)
     RETURN j.id as jobId, i.id as invoiceId, r.amount as amount, r.createdAt as addedAt`
  );
  for (const record of records) {
    const jobId = toStr(record.jobId);
    const invoiceId = toStr(record.invoiceId);
    if (!jobId || !invoiceId) continue;
    const amount = toNum(record.amount) ?? 0;
    await sqlRun(
      `INSERT INTO JobInvoice (jobId, invoiceId, amount, addedAt)
       VALUES (@jobId, @invoiceId, @amount, @addedAt)`,
      {
        jobId,
        invoiceId,
        amount,
        addedAt: toDateOrNull(record.addedAt) ?? new Date().toISOString(),
      }
    );
  }
  console.log('  JobInvoice:', records.length);
}

async function migrateImages(): Promise<void> {
  const records = await neo4jRun(
    `MATCH (j:Job)-[:HAS_IMAGE]->(s:StoredImage) RETURN j.id as jobId, s`
  );
  for (const record of records) {
    const jobId = toStr(record.jobId);
    const s = nodeProps(record, 's');
    const id = toStr(s.id);
    if (!id || !jobId) continue;
    const data = (s as { data?: string }).data;
    if (!data || typeof data !== 'string') {
      console.warn('  StoredImage', id, 'missing data; skipping.');
      continue;
    }
    let content: Buffer;
    try {
      content = Buffer.from(data, 'base64');
    } catch {
      console.warn('  StoredImage', id, 'invalid base64; skipping.');
      continue;
    }
    await sqlRun(
      `INSERT INTO Images (id, jobId, content, contentType, fileName, createdAt)
       VALUES (@id, @jobId, @content, @contentType, @fileName, @createdAt)`,
      {
        id,
        jobId,
        content,
        contentType: toStr((s as { mimeType?: unknown }).mimeType) ?? 'image/jpeg',
        fileName: toStr((s as { originalName?: unknown }).originalName, 500),
        createdAt: toDateOrNull((s as { createdAt?: unknown }).createdAt),
      }
    );
  }
  console.log('  Images:', records.length);
}

async function createUserForOrg(orgId: string): Promise<void> {
  const bcrypt = require('bcrypt');
  const { v4: uuid } = await import('uuid');
  const userId = uuid();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // Clear existing users table (since we wiped everything)
  const pool = await getSqlPool();
  await pool.request().query('DELETE FROM Users');

  await sqlRun(
    `INSERT INTO Users (id, email, passwordHash, name, createdAt, updatedAt)
     VALUES (@id, @email, @passwordHash, @name, GETUTCDATE(), GETUTCDATE())`,
    { id: userId, email: DEMO_EMAIL, passwordHash, name: DEMO_USER_NAME }
  );
  await sqlRun(
    `INSERT INTO OrganizationMember (userId, organizationId, role, createdAt)
     VALUES (@userId, @organizationId, @role, GETUTCDATE())`,
    { userId, organizationId: orgId, role: 'OWNER' }
  );
  console.log('  User created:', DEMO_EMAIL, '/ password:', DEMO_PASSWORD);
}

async function migrateDriverJobTypeRates(): Promise<void> {
  const records = await neo4jRun(
    `MATCH (d:Driver)-[:HAS_RATE]->(r:DriverRate)<-[:RATE_FOR]-(jt:JobType)
     RETURN d.id as driverId, jt.id as jobTypeId, r`
  );
  const { v4: uuid } = await import('uuid');
  for (const record of records) {
    const driverId = toStr(record.driverId);
    const jobTypeId = toStr(record.jobTypeId);
    if (!driverId || !jobTypeId) continue;
    const r = nodeProps(record, 'r');
    const hourlyRate = toNum(r.hourlyRate);
    const percentageRate = toNum(r.percentageRate);
    const payType = percentageRate && percentageRate > 0 ? 'PERCENTAGE' : 'HOURLY';
    await sqlRun(
      `INSERT INTO DriverJobTypeRate (id, driverId, jobTypeId, payType, hourlyRate, percentageRate, createdAt, updatedAt)
       VALUES (@id, @driverId, @jobTypeId, @payType, @hourlyRate, @percentageRate, @createdAt, @updatedAt)`,
      {
        id: uuid(),
        driverId,
        jobTypeId,
        payType,
        hourlyRate: hourlyRate ?? 0,
        percentageRate: percentageRate ?? 0,
        createdAt: toDateOrNull(r.createdAt),
        updatedAt: toDateOrNull(r.updatedAt),
      }
    );
  }
  console.log('  DriverJobTypeRates:', records.length);
}

// ----- Clear SQL data (FK-safe order) -----
async function clearAllMigrationData(): Promise<void> {
  const pool = await getSqlPool();
  const tables = [
    'JobDriverPay',
    'DriverPayment',
    'CarrierPayments',
    'Images',
    'JobInvoice',
    'Jobs',
    'Invoices',
    'DriverJobTypeRate',
    'JobTypes',
    'Companies',
    'UnitEvents',
    'Units',
    'Carriers',
    'Drivers',
    'Dispatchers',
    'OrganizationMember',
    'Organizations',
  ];
  for (const table of tables) {
    await pool.request().query(`DELETE FROM ${table}`);
  }
  console.log('  Cleared existing data from', tables.length, 'tables.');
}

// ----- Main -----
async function main(): Promise<void> {
  console.log('Neo4j → SQL Server migration\n');

  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    throw new Error('DATABASE_URL is required. Add it to 5rivers.server/.env');
  }

  neo4jDriver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD), {
    disableLosslessIntegers: true,
  });

  try {
    await neo4jDriver.verifyConnectivity();
    console.log('Neo4j: connected');
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Neo4j connection failed:', msg);
    if (msg.includes('authentication failure') || msg.includes('unauthorized')) {
      console.error('\n  → Check Neo4j credentials in 5rivers.server/.env:');
      console.error('     NEO4J_URI=' + NEO4J_URI);
      console.error('     NEO4J_USERNAME=' + (process.env.NEO4J_USERNAME ?? process.env.NEO4J_USER ?? '(default: neo4j)'));
      console.error('     NEO4J_PASSWORD=*** (set to your Neo4j password)');
    }
    process.exit(1);
  }

  try {
    await getSqlPool();
    console.log('SQL Server: connected');
  } catch (e) {
    console.error('SQL Server connection failed:', e);
    process.exit(1);
  }

  console.log('\n0. Clearing existing data');
  await clearAllMigrationData();

  try {
    console.log('\n1. Organization + User');
    const orgId = await getOrCreateDefaultOrg();
    await createUserForOrg(orgId);

    console.log('\n2. Companies');
    await migrateCompanies(orgId);

    const placeholderCompanyId = await getOrCreatePlaceholderCompany(orgId);

    console.log('\n3. JobTypes');
    await migrateJobTypes(orgId, placeholderCompanyId);

    console.log('\n4. Drivers');
    await migrateDrivers(orgId);

    console.log('\n5. Dispatchers');
    await migrateDispatchers(orgId);

    console.log('\n6. Units');
    await migrateUnits(orgId);

    console.log('\n7. Invoices');
    await migrateInvoices(orgId);

    console.log('\n8. Jobs');
    await migrateJobs(orgId);

    console.log('\n9. JobInvoice');
    await migrateJobInvoice();

    console.log('\n10. DriverJobTypeRates');
    await migrateDriverJobTypeRates();

    console.log('\n11. Images');
    await migrateImages();

    console.log('\nMigration completed.');
    console.log('\n⚠️  Run "npm run db:seed" to re-create the demo user, then log in.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await neo4jDriver?.close();
    if (sqlPool) await sqlPool.close();
  }
}

main();
