/**
 * Org-isolation tests — the single most important security test in the suite.
 *
 * Creates TWO independent test organizations. For each major entity,
 * verifies that data created in Org A is invisible to Org B's queries:
 *   • listX returns 0 from B's perspective
 *   • getXById returns null
 *   • updateX / deleteX return null (not 404, not 500 — null means "no privilege/exists")
 *
 * Any failure here = a cross-tenant data leak.
 */

import { v4 as uuid } from 'uuid';
import { query } from '../../db/connection';
import { hashPassword, login } from '../../services/auth.service';
import * as companyService from '../../services/company.service';
import * as jobService from '../../services/job.service';
import * as invoiceService from '../../services/invoice.service';
import * as driverService from '../../services/driver.service';
import * as dispatcherService from '../../services/dispatcher.service';
import * as jobTypeService from '../../services/jobType.service';
import { normalizePagination } from '../../types';

interface TenantCtx {
  orgId: string;
  userId: string;
  token: string;
  slug: string;
}

async function makeTenant(suffix: string): Promise<TenantCtx> {
  const orgId = uuid();
  const userId = uuid();
  const slug = `test-isolation-${suffix}-${Date.now()}`;
  const email = `iso-${suffix}-${Date.now()}@test.local`;
  const passwordHash = await hashPassword('Hunter2!');
  const now = new Date();

  await query(
    `INSERT INTO Users (id, email, passwordHash, name, createdAt, updatedAt)
     VALUES (@userId, @email, @passwordHash, @name, @now, @now)`,
    { params: { userId, email, passwordHash, name: `Iso ${suffix}`, now } },
  );
  await query(
    `INSERT INTO Organizations (id, name, slug, settings, createdAt, updatedAt)
     VALUES (@orgId, @name, @slug, NULL, @now, @now)`,
    { params: { orgId, name: `Iso Org ${suffix}`, slug, now } },
  );
  await query(
    `INSERT INTO OrganizationMember (userId, organizationId, role, createdAt)
     VALUES (@userId, @orgId, 'OWNER', @now)`,
    { params: { userId, orgId, now } },
  );
  const { token } = await login({ email, password: 'Hunter2!', organizationSlug: slug });
  return { orgId, userId, token, slug };
}

async function cleanup(ctx: TenantCtx) {
  const pool = (await import('../../db/connection')).getPool;
  const p = await pool();
  const deletes = [
    `DELETE FROM JobInvoice WHERE jobId IN (SELECT id FROM Jobs WHERE organizationId = '${ctx.orgId}')`,
    `DELETE FROM Jobs WHERE organizationId = '${ctx.orgId}'`,
    `DELETE FROM Invoices WHERE organizationId = '${ctx.orgId}'`,
    `DELETE FROM JobTypes WHERE companyId IN (SELECT id FROM Companies WHERE organizationId = '${ctx.orgId}')`,
    `DELETE FROM Companies WHERE organizationId = '${ctx.orgId}'`,
    `DELETE FROM Drivers WHERE organizationId = '${ctx.orgId}'`,
    `DELETE FROM Dispatchers WHERE organizationId = '${ctx.orgId}'`,
    `DELETE FROM OrganizationMember WHERE organizationId = '${ctx.orgId}'`,
    `DELETE FROM Organizations WHERE id = '${ctx.orgId}'`,
    `DELETE FROM Users WHERE id = '${ctx.userId}'`,
  ];
  for (const sql of deletes) {
    try { await p.request().query(sql); } catch { /* table may be empty */ }
  }
}

let orgA: TenantCtx;
let orgB: TenantCtx;
let aCompanyId: string;
let aDriverId: string;
let aDispatcherId: string;
let aJobTypeId: string;
let aJobId: string;
let aInvoiceId: string;

beforeAll(async () => {
  orgA = await makeTenant('a');
  orgB = await makeTenant('b');

  // Seed Org A with one of every entity
  const company = await companyService.createCompany(orgA.orgId, { name: 'A Co' });
  aCompanyId = company.id;
  const jt = await jobTypeService.createJobType(orgA.orgId, {
    companyId: aCompanyId,
    title: 'A Route',
    dispatchType: 'fixed',
    rateOfJob: 500,
  });
  aJobTypeId = jt.id;
  const driver = await driverService.createDriver(orgA.orgId, { name: 'A Driver' });
  aDriverId = driver.id;
  const dispatcher = await dispatcherService.createDispatcher(orgA.orgId, { name: 'A Dispatcher' });
  aDispatcherId = dispatcher.id;
  const job = await jobService.createJob(orgA.orgId, {
    jobTypeId: aJobTypeId,
    jobDate: '2026-04-20',
    dispatcherId: aDispatcherId,
  });
  aJobId = job.id;
  const invoice = await invoiceService.createInvoice(orgA.orgId, {
    invoiceDate: '2026-04-20',
    dispatcherId: aDispatcherId,
  });
  aInvoiceId = invoice.id;
}, 60_000);

afterAll(async () => {
  await cleanup(orgA);
  await cleanup(orgB);
}, 30_000);

describe('Org isolation — listX returns 0 for the other tenant', () => {
  it('listCompanies', async () => {
    const r = await companyService.listCompanies(orgB.orgId, normalizePagination({}));
    expect(r.data).toEqual([]);
    expect(r.total).toBe(0);
  });

  it('listDrivers', async () => {
    const r = await driverService.listDrivers(orgB.orgId, normalizePagination({}));
    expect(r.data).toEqual([]);
  });

  it('listDispatchers', async () => {
    const r = await dispatcherService.listDispatchers(orgB.orgId, normalizePagination({}));
    expect(r.data).toEqual([]);
  });

  it('listJobs', async () => {
    const r = await jobService.listJobs(orgB.orgId, normalizePagination({}));
    expect(r.data).toEqual([]);
  });

  it('listInvoices', async () => {
    const r = await invoiceService.listInvoices(orgB.orgId, normalizePagination({}));
    expect(r.data).toEqual([]);
  });
});

describe('Org isolation — getXById from the wrong tenant returns null', () => {
  it('getCompanyById', async () => {
    expect(await companyService.getCompanyById(aCompanyId, orgB.orgId)).toBeNull();
  });
  it('getDriverById', async () => {
    expect(await driverService.getDriverById(aDriverId, orgB.orgId)).toBeNull();
  });
  it('getDispatcherById', async () => {
    expect(await dispatcherService.getDispatcherById(aDispatcherId, orgB.orgId)).toBeNull();
  });
  it('getJobById', async () => {
    expect(await jobService.getJobById(aJobId, orgB.orgId)).toBeNull();
  });
  it('getInvoiceById', async () => {
    expect(await invoiceService.getInvoiceById(aInvoiceId, orgB.orgId)).toBeNull();
  });
});

describe('Org isolation — updates/deletes from the wrong tenant are no-ops', () => {
  it('updateCompany returns null', async () => {
    expect(await companyService.updateCompany(orgB.orgId, { id: aCompanyId, name: 'HIJACK' })).toBeNull();
    // Confirm A's row is unchanged
    const stillThere = await companyService.getCompanyById(aCompanyId, orgA.orgId);
    expect(stillThere?.name).toBe('A Co');
  });

  it('updateJob returns null', async () => {
    expect(await jobService.updateJob(orgB.orgId, { id: aJobId, amount: 9999 })).toBeNull();
    const stillThere = await jobService.getJobById(aJobId, orgA.orgId);
    expect(stillThere?.amount).toBeNull(); // unchanged
  });

  it('deleteJob returns false', async () => {
    expect(await jobService.deleteJob(aJobId, orgB.orgId)).toBe(false);
    expect(await jobService.getJobById(aJobId, orgA.orgId)).not.toBeNull();
  });
});
