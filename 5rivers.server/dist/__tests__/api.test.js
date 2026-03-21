"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
const connection_1 = require("../db/connection");
const helpers_1 = require("./helpers");
describe('5rivers.server API', () => {
    let testContext;
    beforeAll(async () => {
        try {
            testContext = await (0, helpers_1.createTestOrgAndUser)();
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn('Database not available; skipping integration tests.', msg);
            testContext = undefined;
        }
    }, 60000);
    afterAll(async () => {
        if (testContext?.orgId && testContext?.userId) {
            await (0, helpers_1.deleteTestData)(testContext.orgId, testContext.userId);
        }
        await (0, connection_1.closePool)();
    }, 30000);
    describe('Health', () => {
        it('GET /health returns 200 and status ok', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/health');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('status', 'ok');
            expect(res.body).toHaveProperty('timestamp');
        });
        it('GET /health/db returns 200 when database is connected', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/health/db');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('status', 'ok');
            expect(res.body).toHaveProperty('database', 'connected');
        });
    });
    describe('Auth', () => {
        it('POST /api/auth/login returns token and user for valid credentials', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/login')
                .send({
                email: helpers_1.TEST_USER_EMAIL,
                password: helpers_1.TEST_PASSWORD,
                organizationSlug: helpers_1.TEST_ORG_SLUG,
            });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body).toHaveProperty('user');
            expect(res.body.user).toMatchObject({
                email: helpers_1.TEST_USER_EMAIL,
                organizationId: testContext.orgId,
                role: 'OWNER',
            });
            expect(res.body).toHaveProperty('expiresIn');
        });
        it('POST /api/auth/login returns 401 for invalid password', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/login')
                .send({
                email: helpers_1.TEST_USER_EMAIL,
                password: 'WrongPassword',
                organizationSlug: helpers_1.TEST_ORG_SLUG,
            });
            expect(res.status).toBe(401);
            expect(res.body.error).toBeDefined();
            expect(res.body.error.message).toMatch(/invalid|password/i);
        });
        it('POST /api/auth/login returns 401 for wrong organization', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/login')
                .send({
                email: helpers_1.TEST_USER_EMAIL,
                password: helpers_1.TEST_PASSWORD,
                organizationSlug: 'nonexistent-org-slug',
            });
            expect(res.status).toBe(403);
            expect(res.body.error).toBeDefined();
        });
        it('POST /api/auth/login returns 400 when body is incomplete', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/auth/login')
                .send({ email: helpers_1.TEST_USER_EMAIL });
            expect(res.status).toBe(400);
            expect(res.body.error).toBeDefined();
        });
    });
    describe('Companies', () => {
        it('GET /api/companies without token returns 401', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/companies');
            expect(res.status).toBe(401);
        });
        it('GET /api/companies with valid token returns list', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/companies')
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty('total');
            expect(res.body).toHaveProperty('page');
            expect(res.body).toHaveProperty('limit');
            expect(res.body).toHaveProperty('totalPages');
        });
        it('POST /api/companies creates a company and returns 201', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/companies')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({
                name: 'Test Company Alpha',
                description: 'Created by test',
                email: 'alpha@test.example',
            });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.name).toBe('Test Company Alpha');
            expect(res.body.description).toBe('Created by test');
            expect(res.body.email).toBe('alpha@test.example');
            expect(res.body.organizationId).toBe(testContext.orgId);
        });
        it('GET /api/companies/:id returns the created company', async () => {
            if (!testContext)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/companies')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Test Company Beta' });
            expect(createRes.status).toBe(201);
            const id = createRes.body.id;
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/companies/${id}`)
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(res.status).toBe(200);
            expect(res.body.id).toBe(id);
            expect(res.body.name).toBe('Test Company Beta');
        });
        it('GET /api/companies/:id returns 404 for unknown id', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/companies/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(res.status).toBe(404);
        });
        it('PATCH /api/companies/:id updates the company', async () => {
            if (!testContext)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/companies')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Test Company Gamma' });
            expect(createRes.status).toBe(201);
            const id = createRes.body.id;
            const res = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/companies/${id}`)
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Test Company Gamma Updated', phone: '555-1234' });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Test Company Gamma Updated');
            expect(res.body.phone).toBe('555-1234');
        });
        it('DELETE /api/companies/:id returns 204 and removes the company', async () => {
            if (!testContext)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/companies')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Test Company Delta' });
            expect(createRes.status).toBe(201);
            const id = createRes.body.id;
            const deleteRes = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/companies/${id}`)
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(deleteRes.status).toBe(204);
            const getRes = await (0, supertest_1.default)(app_1.default)
                .get(`/api/companies/${id}`)
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(getRes.status).toBe(404);
        });
        it('POST /api/companies without name returns 400', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/companies')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ description: 'No name' });
            expect(res.status).toBe(400);
        });
    });
    describe('Drivers', () => {
        it('GET /api/drivers without token returns 401', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/drivers');
            expect(res.status).toBe(401);
        });
        it('GET /api/drivers with valid token returns list', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/drivers')
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body).toHaveProperty('total');
        });
        it('POST /api/drivers creates a driver and returns 201', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/drivers')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Test Driver', email: 'driver@test.example', hourlyRate: 25 });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.name).toBe('Test Driver');
            expect(res.body.organizationId).toBe(testContext.orgId);
        });
        it('GET /api/drivers/:id returns 404 for unknown id', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/drivers/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(res.status).toBe(404);
        });
        it('PATCH /api/drivers/:id updates the driver', async () => {
            if (!testContext)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/drivers')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Driver To Update' });
            expect(createRes.status).toBe(201);
            const id = createRes.body.id;
            const res = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/drivers/${id}`)
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Driver Updated', phone: '555-9999' });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Driver Updated');
            expect(res.body.phone).toBe('555-9999');
        });
        it('DELETE /api/drivers/:id returns 204', async () => {
            if (!testContext)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/drivers')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Driver To Delete' });
            expect(createRes.status).toBe(201);
            const id = createRes.body.id;
            const deleteRes = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/drivers/${id}`)
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(deleteRes.status).toBe(204);
        });
        it('POST /api/drivers without name returns 400', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/drivers')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ email: 'noname@test.example' });
            expect(res.status).toBe(400);
        });
    });
    describe('Dispatchers', () => {
        it('GET /api/dispatchers without token returns 401', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/dispatchers');
            expect(res.status).toBe(401);
        });
        it('GET /api/dispatchers with valid token returns list', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/dispatchers')
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
        });
        it('POST /api/dispatchers creates a dispatcher and returns 201', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/dispatchers')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Test Dispatcher', commissionPercent: 10 });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.name).toBe('Test Dispatcher');
            expect(res.body.organizationId).toBe(testContext.orgId);
        });
        it('GET /api/dispatchers/:id returns 404 for unknown id', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/dispatchers/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(res.status).toBe(404);
        });
        it('PATCH /api/dispatchers/:id updates and DELETE returns 204', async () => {
            if (!testContext)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/dispatchers')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Dispatcher To Update' });
            expect(createRes.status).toBe(201);
            const id = createRes.body.id;
            const patchRes = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/dispatchers/${id}`)
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Dispatcher Updated' });
            expect(patchRes.status).toBe(200);
            expect(patchRes.body.name).toBe('Dispatcher Updated');
            const deleteRes = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/dispatchers/${id}`)
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(deleteRes.status).toBe(204);
        });
        it('POST /api/dispatchers without name returns 400', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/dispatchers')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ commissionPercent: 5 });
            expect(res.status).toBe(400);
        });
    });
    describe('Units', () => {
        it('GET /api/units without token returns 401', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/units');
            expect(res.status).toBe(401);
        });
        it('GET /api/units with valid token returns list', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/units')
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
        });
        it('POST /api/units creates a unit and returns 201', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/units')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Test Unit', color: 'Red' });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.name).toBe('Test Unit');
            expect(res.body.organizationId).toBe(testContext.orgId);
        });
        it('GET /api/units/:id returns 404 for unknown id', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/units/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(res.status).toBe(404);
        });
        it('PATCH /api/units/:id updates and DELETE returns 204', async () => {
            if (!testContext)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/units')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Unit To Update' });
            expect(createRes.status).toBe(201);
            const id = createRes.body.id;
            const patchRes = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/units/${id}`)
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Unit Updated', plateNumber: 'ABC-123' });
            expect(patchRes.status).toBe(200);
            expect(patchRes.body.plateNumber).toBe('ABC-123');
            const deleteRes = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/units/${id}`)
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(deleteRes.status).toBe(204);
        });
        it('POST /api/units without name returns 400', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/units')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ color: 'Blue' });
            expect(res.status).toBe(400);
        });
    });
    describe('JobTypes', () => {
        it('GET /api/job-types without token returns 401', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/job-types');
            expect(res.status).toBe(401);
        });
        it('GET /api/job-types with valid token returns list', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/job-types')
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
        });
        it('POST /api/job-types creates a job type and returns 201', async () => {
            if (!testContext)
                return;
            const companyRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/companies')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Company For JobTypes' });
            expect(companyRes.status).toBe(201);
            const companyId = companyRes.body.id;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/job-types')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ companyId, title: 'Haul', rateOfJob: 100 });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.title).toBe('Haul');
            expect(res.body.companyId).toBe(companyId);
        });
        it('GET /api/job-types/:id returns 404 for unknown id', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/job-types/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(res.status).toBe(404);
        });
        it('PATCH /api/job-types/:id updates and DELETE returns 204', async () => {
            if (!testContext)
                return;
            const companyRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/companies')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Company For JT Update' });
            expect(companyRes.status).toBe(201);
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/job-types')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ companyId: companyRes.body.id, title: 'JobType To Update' });
            expect(createRes.status).toBe(201);
            const id = createRes.body.id;
            const patchRes = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/job-types/${id}`)
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ title: 'JobType Updated', rateOfJob: 150 });
            expect(patchRes.status).toBe(200);
            expect(patchRes.body.rateOfJob).toBe(150);
            const deleteRes = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/job-types/${id}`)
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(deleteRes.status).toBe(204);
        });
        it('POST /api/job-types without companyId or title returns 400', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/job-types')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ title: 'No company' });
            expect(res.status).toBe(400);
        });
    });
    describe('Jobs', () => {
        it('GET /api/jobs without token returns 401', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/jobs');
            expect(res.status).toBe(401);
        });
        it('GET /api/jobs with valid token returns list', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/jobs')
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
        });
        it('POST /api/jobs creates a job and returns 201', async () => {
            if (!testContext)
                return;
            const companyRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/companies')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Company For Jobs' });
            expect(companyRes.status).toBe(201);
            const jtRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/job-types')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ companyId: companyRes.body.id, title: 'Haul Job' });
            expect(jtRes.status).toBe(201);
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ jobDate: '2025-01-15', jobTypeId: jtRes.body.id });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(String(res.body.jobDate)).toMatch(/2025-01-15/);
            expect(res.body.jobTypeId).toBe(jtRes.body.id);
            expect(res.body.organizationId).toBe(testContext.orgId);
        });
        it('GET /api/jobs/:id returns 404 for unknown id', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/jobs/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(res.status).toBe(404);
        });
        it('PATCH /api/jobs/:id updates and DELETE returns 204', async () => {
            if (!testContext)
                return;
            const companyRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/companies')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Company For Job Update' });
            expect(companyRes.status).toBe(201);
            const jtRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/job-types')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ companyId: companyRes.body.id, title: 'JobType For Job' });
            expect(jtRes.status).toBe(201);
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ jobDate: '2025-02-01', jobTypeId: jtRes.body.id });
            expect(createRes.status).toBe(201);
            const id = createRes.body.id;
            const patchRes = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/jobs/${id}`)
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ jobDate: '2025-02-02', amount: 500 });
            expect(patchRes.status).toBe(200);
            expect(patchRes.body.amount).toBe(500);
            const deleteRes = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/jobs/${id}`)
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(deleteRes.status).toBe(204);
        });
        it('POST /api/jobs without jobDate or jobTypeId returns 400', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ jobDate: '2025-01-01' });
            expect(res.status).toBe(400);
        });
    });
    describe('Invoices', () => {
        it('GET /api/invoices without token returns 401', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/invoices');
            expect(res.status).toBe(401);
        });
        it('GET /api/invoices with valid token returns list', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/invoices')
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
        });
        it('POST /api/invoices creates an invoice and returns 201', async () => {
            if (!testContext)
                return;
            const dispRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/dispatchers')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Dispatcher For Invoice' });
            expect(dispRes.status).toBe(201);
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({
                invoiceNumber: 'INV-TEST-001',
                invoiceDate: '2025-01-20',
                dispatcherId: dispRes.body.id,
            });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.invoiceNumber).toBe('INV-TEST-001');
            expect(res.body.dispatcherId).toBe(dispRes.body.id);
            expect(res.body.organizationId).toBe(testContext.orgId);
        });
        it('GET /api/invoices/:id returns 404 for unknown id', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/invoices/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(res.status).toBe(404);
        });
        it('PATCH /api/invoices/:id updates and DELETE returns 204', async () => {
            if (!testContext)
                return;
            const dispRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/dispatchers')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Dispatcher For Inv Update' });
            expect(dispRes.status).toBe(201);
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({
                invoiceNumber: 'INV-TEST-002',
                invoiceDate: '2025-01-21',
                dispatcherId: dispRes.body.id,
            });
            expect(createRes.status).toBe(201);
            const id = createRes.body.id;
            const patchRes = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/invoices/${id}`)
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ status: 'RAISED', billedTo: 'Acme Corp' });
            expect(patchRes.status).toBe(200);
            expect(patchRes.body.status).toBe('RAISED');
            expect(patchRes.body.billedTo).toBe('Acme Corp');
            const deleteRes = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/invoices/${id}`)
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(deleteRes.status).toBe(204);
        });
        it('POST /api/invoices without invoiceNumber, invoiceDate or dispatcherId returns 400', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ invoiceNumber: 'INV-1' });
            expect(res.status).toBe(400);
        });
    });
    describe('Invoice jobs (JobInvoice)', () => {
        it('GET /api/invoices/:id/jobs returns list of jobs on invoice', async () => {
            if (!testContext)
                return;
            const dispRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/dispatchers')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Disp For JobInv' });
            expect(dispRes.status).toBe(201);
            const invRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({
                invoiceNumber: 'INV-JOBS-001',
                invoiceDate: '2025-02-01',
                dispatcherId: dispRes.body.id,
            });
            expect(invRes.status).toBe(201);
            const listRes = await (0, supertest_1.default)(app_1.default)
                .get(`/api/invoices/${invRes.body.id}/jobs`)
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(listRes.status).toBe(200);
            expect(Array.isArray(listRes.body)).toBe(true);
            expect(listRes.body).toHaveLength(0);
        });
        it('POST /api/invoices/:id/jobs adds job with amount and returns 201', async () => {
            if (!testContext)
                return;
            const companyRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/companies')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Co For JobInv' });
            expect(companyRes.status).toBe(201);
            const jtRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/job-types')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ companyId: companyRes.body.id, title: 'Haul' });
            expect(jtRes.status).toBe(201);
            const jobRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ jobDate: '2025-02-10', jobTypeId: jtRes.body.id });
            expect(jobRes.status).toBe(201);
            const dispRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/dispatchers')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Disp JobInv Add' });
            expect(dispRes.status).toBe(201);
            const invRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({
                invoiceNumber: 'INV-JOBS-002',
                invoiceDate: '2025-02-11',
                dispatcherId: dispRes.body.id,
            });
            expect(invRes.status).toBe(201);
            const addRes = await (0, supertest_1.default)(app_1.default)
                .post(`/api/invoices/${invRes.body.id}/jobs`)
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ jobId: jobRes.body.id, amount: 250 });
            expect(addRes.status).toBe(201);
            expect(addRes.body).toMatchObject({ jobId: jobRes.body.id, invoiceId: invRes.body.id, amount: 250 });
            const listRes = await (0, supertest_1.default)(app_1.default)
                .get(`/api/invoices/${invRes.body.id}/jobs`)
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(listRes.status).toBe(200);
            expect(listRes.body).toHaveLength(1);
            expect(listRes.body[0].amount).toBe(250);
        });
        it('PATCH /api/invoices/:id/jobs/:jobId updates amount', async () => {
            if (!testContext)
                return;
            const companyRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/companies')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Co JobInv Patch' });
            const jtRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/job-types')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ companyId: companyRes.body.id, title: 'Haul' });
            const jobRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ jobDate: '2025-02-12', jobTypeId: jtRes.body.id });
            const dispRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/dispatchers')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Disp JobInv Patch' });
            const invRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({
                invoiceNumber: 'INV-JOBS-003',
                invoiceDate: '2025-02-13',
                dispatcherId: dispRes.body.id,
            });
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/invoices/${invRes.body.id}/jobs`)
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ jobId: jobRes.body.id, amount: 100 });
            const patchRes = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/invoices/${invRes.body.id}/jobs/${jobRes.body.id}`)
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ amount: 300 });
            expect(patchRes.status).toBe(200);
            expect(patchRes.body.amount).toBe(300);
        });
        it('DELETE /api/invoices/:id/jobs/:jobId removes job from invoice', async () => {
            if (!testContext)
                return;
            const companyRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/companies')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Co JobInv Del' });
            const jtRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/job-types')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ companyId: companyRes.body.id, title: 'Haul' });
            const jobRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ jobDate: '2025-02-14', jobTypeId: jtRes.body.id });
            const dispRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/dispatchers')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Disp JobInv Del' });
            const invRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({
                invoiceNumber: 'INV-JOBS-004',
                invoiceDate: '2025-02-15',
                dispatcherId: dispRes.body.id,
            });
            await (0, supertest_1.default)(app_1.default)
                .post(`/api/invoices/${invRes.body.id}/jobs`)
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ jobId: jobRes.body.id, amount: 99 });
            const delRes = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/invoices/${invRes.body.id}/jobs/${jobRes.body.id}`)
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(delRes.status).toBe(204);
            const listRes = await (0, supertest_1.default)(app_1.default)
                .get(`/api/invoices/${invRes.body.id}/jobs`)
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(listRes.body).toHaveLength(0);
        });
        it('POST /api/invoices/:id/jobs without jobId or amount returns 400', async () => {
            if (!testContext)
                return;
            const dispRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/dispatchers')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Disp JobInv Val' });
            const invRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({
                invoiceNumber: 'INV-JOBS-005',
                invoiceDate: '2025-02-16',
                dispatcherId: dispRes.body.id,
            });
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/invoices/${invRes.body.id}/jobs`)
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ jobId: '00000000-0000-0000-0000-000000000000' });
            expect(res.status).toBe(400);
        });
    });
    describe('Job images', () => {
        it('GET /api/jobs/:id/images returns list (empty then with items)', async () => {
            if (!testContext)
                return;
            const companyRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/companies')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Co For Imgs' });
            const jtRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/job-types')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ companyId: companyRes.body.id, title: 'Haul' });
            const jobRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ jobDate: '2025-03-01', jobTypeId: jtRes.body.id });
            const listRes = await (0, supertest_1.default)(app_1.default)
                .get(`/api/jobs/${jobRes.body.id}/images`)
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(listRes.status).toBe(200);
            expect(Array.isArray(listRes.body)).toBe(true);
            expect(listRes.body).toHaveLength(0);
        });
        it('POST /api/jobs/:id/images uploads file and returns 201', async () => {
            if (!testContext)
                return;
            const companyRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/companies')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Co Img Upload' });
            const jtRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/job-types')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ companyId: companyRes.body.id, title: 'Haul' });
            const jobRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ jobDate: '2025-03-02', jobTypeId: jtRes.body.id });
            const fileContent = Buffer.from('fake image content');
            const uploadRes = await (0, supertest_1.default)(app_1.default)
                .post(`/api/jobs/${jobRes.body.id}/images`)
                .set('Authorization', `Bearer ${testContext.token}`)
                .attach('file', fileContent, 'test.png');
            expect(uploadRes.status).toBe(201);
            expect(uploadRes.body).toHaveProperty('id');
            expect(uploadRes.body.jobId).toBe(jobRes.body.id);
            expect(uploadRes.body.contentType).toMatch(/image|octet/);
            expect(uploadRes.body.fileName).toBe('test.png');
            const listRes = await (0, supertest_1.default)(app_1.default)
                .get(`/api/jobs/${jobRes.body.id}/images`)
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(listRes.status).toBe(200);
            expect(listRes.body).toHaveLength(1);
            expect(listRes.body[0].id).toBe(uploadRes.body.id);
        });
        it('GET /api/jobs/:id/images/:imageId returns file content', async () => {
            if (!testContext)
                return;
            const companyRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/companies')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Co Img Get' });
            const jtRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/job-types')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ companyId: companyRes.body.id, title: 'Haul' });
            const jobRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ jobDate: '2025-03-03', jobTypeId: jtRes.body.id });
            const fileContent = Buffer.from('binary content here');
            const uploadRes = await (0, supertest_1.default)(app_1.default)
                .post(`/api/jobs/${jobRes.body.id}/images`)
                .set('Authorization', `Bearer ${testContext.token}`)
                .attach('file', fileContent, 'doc.bin');
            expect(uploadRes.status).toBe(201);
            const imageId = uploadRes.body.id;
            const getRes = await (0, supertest_1.default)(app_1.default)
                .get(`/api/jobs/${jobRes.body.id}/images/${imageId}`)
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(getRes.status).toBe(200);
            expect(Buffer.from(getRes.body).toString()).toBe('binary content here');
        });
        it('DELETE /api/jobs/:id/images/:imageId returns 204', async () => {
            if (!testContext)
                return;
            const companyRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/companies')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Co Img Del' });
            const jtRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/job-types')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ companyId: companyRes.body.id, title: 'Haul' });
            const jobRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ jobDate: '2025-03-04', jobTypeId: jtRes.body.id });
            const uploadRes = await (0, supertest_1.default)(app_1.default)
                .post(`/api/jobs/${jobRes.body.id}/images`)
                .set('Authorization', `Bearer ${testContext.token}`)
                .attach('file', Buffer.from('x'), 'tiny.bin');
            expect(uploadRes.status).toBe(201);
            const delRes = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/jobs/${jobRes.body.id}/images/${uploadRes.body.id}`)
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(delRes.status).toBe(204);
            const listRes = await (0, supertest_1.default)(app_1.default)
                .get(`/api/jobs/${jobRes.body.id}/images`)
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(listRes.body).toHaveLength(0);
        });
        it('POST /api/jobs/:id/images without file returns 400', async () => {
            if (!testContext)
                return;
            const companyRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/companies')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Co Img NoFile' });
            const jtRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/job-types')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ companyId: companyRes.body.id, title: 'Haul' });
            const jobRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ jobDate: '2025-03-05', jobTypeId: jtRes.body.id });
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/jobs/${jobRes.body.id}/images`)
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({});
            expect(res.status).toBe(400);
        });
    });
    describe('Driver payments', () => {
        it('GET /api/driver-payments without token returns 401', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/driver-payments');
            expect(res.status).toBe(401);
        });
        it('GET /api/driver-payments with valid token returns list', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/driver-payments')
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(Array.isArray(res.body.data)).toBe(true);
        });
        it('POST /api/driver-payments creates payment and returns 201', async () => {
            if (!testContext)
                return;
            const driverRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/drivers')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Driver For Payment' });
            expect(driverRes.status).toBe(201);
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/driver-payments')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({
                driverId: driverRes.body.id,
                amount: 500,
                paidAt: '2025-04-01',
                paymentMethod: 'CHECK',
                reference: 'Check 123',
                notes: 'April batch',
            });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.driverId).toBe(driverRes.body.id);
            expect(res.body.amount).toBe(500);
            expect(res.body.paidAt).toBe('2025-04-01');
            expect(res.body.paymentMethod).toBe('CHECK');
            expect(res.body.reference).toBe('Check 123');
            expect(res.body.notes).toBe('April batch');
            expect(res.body.organizationId).toBe(testContext.orgId);
            expect(res.body).toHaveProperty('createdAt');
            expect(res.body).toHaveProperty('updatedAt');
        });
        it('GET /api/driver-payments/:id returns 404 for unknown id', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/driver-payments/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(res.status).toBe(404);
        });
        it('DELETE /api/driver-payments/:id returns 204', async () => {
            if (!testContext)
                return;
            const driverRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/drivers')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Driver Pay Del' });
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/driver-payments')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ driverId: driverRes.body.id, amount: 100, paidAt: '2025-04-02' });
            expect(createRes.status).toBe(201);
            const delRes = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/driver-payments/${createRes.body.id}`)
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(delRes.status).toBe(204);
        });
        it('POST /api/driver-payments without driverId, amount or paidAt returns 400', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/driver-payments')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ amount: 50 });
            expect(res.status).toBe(400);
        });
        it('PATCH /api/driver-payments/:id updates payment and returns 200', async () => {
            if (!testContext)
                return;
            const driverRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/drivers')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Driver Pay Patch' });
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/driver-payments')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({
                driverId: driverRes.body.id,
                amount: 200,
                paidAt: '2025-04-05',
                paymentMethod: 'CASH',
                notes: 'Initial',
            });
            expect(createRes.status).toBe(201);
            const res = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/driver-payments/${createRes.body.id}`)
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({
                amount: 250,
                paidAt: '2025-04-06',
                paymentMethod: 'BANK_TRANSFER',
                reference: 'Ref-456',
                notes: 'Updated',
            });
            expect(res.status).toBe(200);
            expect(res.body.amount).toBe(250);
            expect(res.body.paidAt).toBe('2025-04-06');
            expect(res.body.paymentMethod).toBe('BANK_TRANSFER');
            expect(res.body.reference).toBe('Ref-456');
            expect(res.body.notes).toBe('Updated');
        });
        it('PATCH /api/driver-payments/:id returns 404 for unknown id', async () => {
            if (!testContext)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .patch('/api/driver-payments/00000000-0000-0000-0000-000000000000')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ amount: 100 });
            expect(res.status).toBe(404);
        });
    });
    describe('Job driver pay', () => {
        it('GET /api/jobs/:id/driver-pay returns 404 when not set', async () => {
            if (!testContext)
                return;
            const companyRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/companies')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Co JDP' });
            const jtRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/job-types')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ companyId: companyRes.body.id, title: 'Haul' });
            const jobRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ jobDate: '2025-04-10', jobTypeId: jtRes.body.id });
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/jobs/${jobRes.body.id}/driver-pay`)
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(res.status).toBe(404);
        });
        it('PUT /api/jobs/:id/driver-pay sets driver and amount', async () => {
            if (!testContext)
                return;
            const companyRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/companies')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Co JDP Set' });
            const jtRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/job-types')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ companyId: companyRes.body.id, title: 'Haul' });
            const driverRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/drivers')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Driver JDP' });
            const jobRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ jobDate: '2025-04-11', jobTypeId: jtRes.body.id });
            const putRes = await (0, supertest_1.default)(app_1.default)
                .put(`/api/jobs/${jobRes.body.id}/driver-pay`)
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ driverId: driverRes.body.id, amount: 75 });
            expect(putRes.status).toBe(200);
            expect(putRes.body).toMatchObject({ jobId: jobRes.body.id, driverId: driverRes.body.id, amount: 75 });
            expect(putRes.body.paidAt).toBeNull();
        });
        it('PATCH /api/jobs/:id/driver-pay marks as paid with paymentId', async () => {
            if (!testContext)
                return;
            const companyRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/companies')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Co JDP Paid' });
            const jtRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/job-types')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ companyId: companyRes.body.id, title: 'Haul' });
            const driverRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/drivers')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Driver JDP Paid' });
            const jobRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ jobDate: '2025-04-12', jobTypeId: jtRes.body.id });
            await (0, supertest_1.default)(app_1.default)
                .put(`/api/jobs/${jobRes.body.id}/driver-pay`)
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ driverId: driverRes.body.id, amount: 100 });
            const payRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/driver-payments')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ driverId: driverRes.body.id, amount: 100, paidAt: '2025-04-15' });
            expect(payRes.status).toBe(201);
            const patchRes = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/jobs/${jobRes.body.id}/driver-pay`)
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ paymentId: payRes.body.id });
            expect(patchRes.status).toBe(200);
            expect(patchRes.body.paymentId).toBe(payRes.body.id);
            expect(patchRes.body.paidAt).toBeTruthy();
        });
        it('DELETE /api/jobs/:id/driver-pay clears driver pay', async () => {
            if (!testContext)
                return;
            const companyRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/companies')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Co JDP Del' });
            const jtRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/job-types')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ companyId: companyRes.body.id, title: 'Haul' });
            const driverRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/drivers')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ name: 'Driver JDP Del' });
            const jobRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ jobDate: '2025-04-13', jobTypeId: jtRes.body.id });
            await (0, supertest_1.default)(app_1.default)
                .put(`/api/jobs/${jobRes.body.id}/driver-pay`)
                .set('Authorization', `Bearer ${testContext.token}`)
                .send({ driverId: driverRes.body.id, amount: 50 });
            const delRes = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/jobs/${jobRes.body.id}/driver-pay`)
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(delRes.status).toBe(204);
            const getRes = await (0, supertest_1.default)(app_1.default)
                .get(`/api/jobs/${jobRes.body.id}/driver-pay`)
                .set('Authorization', `Bearer ${testContext.token}`);
            expect(getRes.status).toBe(404);
        });
    });
});
