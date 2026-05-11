"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const connection_1 = require("../../db/connection");
const auth_service_1 = require("../../services/auth.service");
const companyService = __importStar(require("../../services/company.service"));
const jobService = __importStar(require("../../services/job.service"));
const invoiceService = __importStar(require("../../services/invoice.service"));
const driverService = __importStar(require("../../services/driver.service"));
const dispatcherService = __importStar(require("../../services/dispatcher.service"));
const jobTypeService = __importStar(require("../../services/jobType.service"));
const types_1 = require("../../types");
async function makeTenant(suffix) {
    const orgId = (0, uuid_1.v4)();
    const userId = (0, uuid_1.v4)();
    const slug = `test-isolation-${suffix}-${Date.now()}`;
    const email = `iso-${suffix}-${Date.now()}@test.local`;
    const passwordHash = await (0, auth_service_1.hashPassword)('Hunter2!');
    const now = new Date();
    await (0, connection_1.query)(`INSERT INTO Users (id, email, passwordHash, name, createdAt, updatedAt)
     VALUES (@userId, @email, @passwordHash, @name, @now, @now)`, { params: { userId, email, passwordHash, name: `Iso ${suffix}`, now } });
    await (0, connection_1.query)(`INSERT INTO Organizations (id, name, slug, settings, createdAt, updatedAt)
     VALUES (@orgId, @name, @slug, NULL, @now, @now)`, { params: { orgId, name: `Iso Org ${suffix}`, slug, now } });
    await (0, connection_1.query)(`INSERT INTO OrganizationMember (userId, organizationId, role, createdAt)
     VALUES (@userId, @orgId, 'OWNER', @now)`, { params: { userId, orgId, now } });
    const { token } = await (0, auth_service_1.login)({ email, password: 'Hunter2!', organizationSlug: slug });
    return { orgId, userId, token, slug };
}
async function cleanup(ctx) {
    const pool = (await Promise.resolve().then(() => __importStar(require('../../db/connection')))).getPool;
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
        try {
            await p.request().query(sql);
        }
        catch { /* table may be empty */ }
    }
}
let orgA;
let orgB;
let aCompanyId;
let aDriverId;
let aDispatcherId;
let aJobTypeId;
let aJobId;
let aInvoiceId;
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
        const r = await companyService.listCompanies(orgB.orgId, (0, types_1.normalizePagination)({}));
        expect(r.data).toEqual([]);
        expect(r.total).toBe(0);
    });
    it('listDrivers', async () => {
        const r = await driverService.listDrivers(orgB.orgId, (0, types_1.normalizePagination)({}));
        expect(r.data).toEqual([]);
    });
    it('listDispatchers', async () => {
        const r = await dispatcherService.listDispatchers(orgB.orgId, (0, types_1.normalizePagination)({}));
        expect(r.data).toEqual([]);
    });
    it('listJobs', async () => {
        const r = await jobService.listJobs(orgB.orgId, (0, types_1.normalizePagination)({}));
        expect(r.data).toEqual([]);
    });
    it('listInvoices', async () => {
        const r = await invoiceService.listInvoices(orgB.orgId, (0, types_1.normalizePagination)({}));
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
