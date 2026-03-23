"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
const connection_1 = require("../db/connection");
const helpers_1 = require("./helpers");
/**
 * Comprehensive tests for new architecture features:
 * 1. Driver dual pay model (CRUD + payType, hourlyRate, percentageRate)
 * 2. Unit comprehensive fields (CRUD + status, year, make, model, mileage, maintenance, insurance)
 * 3. Job sourceType + carrier (CRUD + DISPATCHED/DIRECT, carrierId, carrierAmount)
 * 4. Invoice direct company invoicing (CRUD + optional dispatcherId, companyId)
 * 5. JobInvoice validation (dispatcher match, cross-invoice duplicate, source type checks)
 */
describe('New Architecture Features – Comprehensive', () => {
    let ctx;
    beforeAll(async () => {
        try {
            ctx = await (0, helpers_1.createTestOrgAndUser)();
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.warn('Database not available; skipping integration tests.', msg);
            ctx = undefined;
        }
    }, 60000);
    afterAll(async () => {
        if (ctx?.orgId && ctx?.userId) {
            await (0, helpers_1.deleteTestData)(ctx.orgId, ctx.userId);
        }
        await (0, connection_1.closePool)();
    }, 30000);
    const auth = () => (ctx ? { Authorization: `Bearer ${ctx.token}` } : {});
    const UNKNOWN_UUID = '00000000-0000-0000-0000-000000000000';
    // ════════════════════════════════════════════════
    //  1. DRIVER DUAL PAY MODEL
    // ════════════════════════════════════════════════
    describe('Drivers – Dual Pay Model', () => {
        // --- CREATE ---
        it('POST creates driver with default payType HOURLY and percentageRate 0', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/drivers')
                .set(auth())
                .send({ name: 'Hourly Default', hourlyRate: 28 });
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.name).toBe('Hourly Default');
            expect(res.body.payType).toBe('HOURLY');
            expect(res.body.hourlyRate).toBe(28);
            expect(res.body.percentageRate).toBe(0);
            expect(res.body.organizationId).toBe(ctx.orgId);
            expect(res.body).toHaveProperty('createdAt');
            expect(res.body).toHaveProperty('updatedAt');
        });
        it('POST creates driver with PERCENTAGE payType', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/drivers')
                .set(auth())
                .send({ name: 'Pct Driver', payType: 'PERCENTAGE', percentageRate: 15.5, hourlyRate: 0 });
            expect(res.status).toBe(201);
            expect(res.body.payType).toBe('PERCENTAGE');
            expect(res.body.percentageRate).toBe(15.5);
            expect(res.body.hourlyRate).toBe(0);
        });
        it('POST creates driver with CUSTOM payType and both rates set', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/drivers')
                .set(auth())
                .send({ name: 'Custom Driver', payType: 'CUSTOM', hourlyRate: 25, percentageRate: 10.0 });
            expect(res.status).toBe(201);
            expect(res.body.payType).toBe('CUSTOM');
            expect(res.body.hourlyRate).toBe(25);
            expect(res.body.percentageRate).toBe(10);
        });
        it('POST creates driver with all optional fields (description, email, phone)', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/drivers')
                .set(auth())
                .send({
                name: 'Full Driver',
                description: 'Experienced driver',
                email: 'driver@test.com',
                phone: '555-0001',
                payType: 'HOURLY',
                hourlyRate: 30,
                percentageRate: 5,
            });
            expect(res.status).toBe(201);
            expect(res.body.description).toBe('Experienced driver');
            expect(res.body.email).toBe('driver@test.com');
            expect(res.body.phone).toBe('555-0001');
        });
        it('POST without name returns 400', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/drivers')
                .set(auth())
                .send({ payType: 'HOURLY', hourlyRate: 20 });
            expect(res.status).toBe(400);
        });
        it('POST without auth returns 401', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/drivers')
                .send({ name: 'No Auth Driver' });
            expect(res.status).toBe(401);
        });
        // --- READ ---
        it('GET /api/drivers returns paginated list with pay fields', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/drivers')
                .set(auth());
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('total');
            expect(res.body).toHaveProperty('page');
            expect(res.body).toHaveProperty('limit');
            expect(res.body).toHaveProperty('totalPages');
            expect(Array.isArray(res.body.data)).toBe(true);
            if (res.body.data.length > 0) {
                const d = res.body.data[0];
                expect(d).toHaveProperty('payType');
                expect(d).toHaveProperty('hourlyRate');
                expect(d).toHaveProperty('percentageRate');
            }
        });
        it('GET /api/drivers with pagination params works', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/drivers?page=1&limit=2')
                .set(auth());
            expect(res.status).toBe(200);
            expect(res.body.page).toBe(1);
            expect(res.body.limit).toBe(2);
            expect(res.body.data.length).toBeLessThanOrEqual(2);
        });
        it('GET /api/drivers/:id returns driver with all pay fields', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/drivers')
                .set(auth())
                .send({ name: 'Get By Id Driver', payType: 'PERCENTAGE', percentageRate: 12, hourlyRate: 18 });
            expect(createRes.status).toBe(201);
            const getRes = await (0, supertest_1.default)(app_1.default)
                .get(`/api/drivers/${createRes.body.id}`)
                .set(auth());
            expect(getRes.status).toBe(200);
            expect(getRes.body.id).toBe(createRes.body.id);
            expect(getRes.body.payType).toBe('PERCENTAGE');
            expect(getRes.body.percentageRate).toBe(12);
            expect(getRes.body.hourlyRate).toBe(18);
        });
        it('GET /api/drivers/:id returns 404 for unknown id', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/drivers/${UNKNOWN_UUID}`)
                .set(auth());
            expect(res.status).toBe(404);
        });
        it('GET /api/drivers without token returns 401', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/drivers');
            expect(res.status).toBe(401);
        });
        // --- FILTERING ---
        it('GET /api/drivers filters by payType', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/drivers?filter_payType=PERCENTAGE')
                .set(auth());
            expect(res.status).toBe(200);
            for (const d of res.body.data) {
                expect(d.payType).toBe('PERCENTAGE');
            }
        });
        it('GET /api/drivers filters by name', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/drivers?filter_name=Custom')
                .set(auth());
            expect(res.status).toBe(200);
            for (const d of res.body.data) {
                expect(d.name.toLowerCase()).toContain('custom');
            }
        });
        // --- SORTING ---
        it('GET /api/drivers sorts by percentageRate desc', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/drivers?sortBy=percentageRate&order=desc')
                .set(auth());
            expect(res.status).toBe(200);
            const rates = res.body.data.map((d) => d.percentageRate);
            for (let i = 1; i < rates.length; i++) {
                expect(rates[i]).toBeLessThanOrEqual(rates[i - 1]);
            }
        });
        // --- UPDATE ---
        it('PATCH updates driver name only, preserves other fields', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/drivers')
                .set(auth())
                .send({ name: 'Patch Name Test', payType: 'PERCENTAGE', percentageRate: 20, hourlyRate: 15 });
            expect(createRes.status).toBe(201);
            const patchRes = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/drivers/${createRes.body.id}`)
                .set(auth())
                .send({ name: 'Patched Name' });
            expect(patchRes.status).toBe(200);
            expect(patchRes.body.name).toBe('Patched Name');
            // All other fields preserved
            expect(patchRes.body.payType).toBe('PERCENTAGE');
            expect(patchRes.body.percentageRate).toBe(20);
            expect(patchRes.body.hourlyRate).toBe(15);
        });
        it('PATCH switches payType from HOURLY to PERCENTAGE', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/drivers')
                .set(auth())
                .send({ name: 'Pay Switch', hourlyRate: 22 });
            expect(createRes.body.payType).toBe('HOURLY');
            const patchRes = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/drivers/${createRes.body.id}`)
                .set(auth())
                .send({ payType: 'PERCENTAGE', percentageRate: 18 });
            expect(patchRes.status).toBe(200);
            expect(patchRes.body.payType).toBe('PERCENTAGE');
            expect(patchRes.body.percentageRate).toBe(18);
            expect(patchRes.body.hourlyRate).toBe(22); // preserved
        });
        it('PATCH updates hourlyRate and percentageRate independently', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/drivers')
                .set(auth())
                .send({ name: 'Rate Update', payType: 'CUSTOM', hourlyRate: 10, percentageRate: 5 });
            expect(createRes.status).toBe(201);
            const patch1 = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/drivers/${createRes.body.id}`)
                .set(auth())
                .send({ hourlyRate: 35 });
            expect(patch1.status).toBe(200);
            expect(patch1.body.hourlyRate).toBe(35);
            expect(patch1.body.percentageRate).toBe(5); // untouched
            const patch2 = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/drivers/${createRes.body.id}`)
                .set(auth())
                .send({ percentageRate: 25 });
            expect(patch2.status).toBe(200);
            expect(patch2.body.percentageRate).toBe(25);
            expect(patch2.body.hourlyRate).toBe(35); // untouched
        });
        it('PATCH on unknown id returns 404', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/drivers/${UNKNOWN_UUID}`)
                .set(auth())
                .send({ name: 'Ghost' });
            expect(res.status).toBe(404);
        });
        // --- DELETE ---
        it('DELETE removes driver and returns 204', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/drivers')
                .set(auth())
                .send({ name: 'Delete Me Driver' });
            expect(createRes.status).toBe(201);
            const delRes = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/drivers/${createRes.body.id}`)
                .set(auth());
            expect(delRes.status).toBe(204);
            const getRes = await (0, supertest_1.default)(app_1.default)
                .get(`/api/drivers/${createRes.body.id}`)
                .set(auth());
            expect(getRes.status).toBe(404);
        });
        it('DELETE on unknown id returns 404', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/drivers/${UNKNOWN_UUID}`)
                .set(auth());
            expect(res.status).toBe(404);
        });
        it('DELETE driver twice returns 404 on second attempt', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/drivers')
                .set(auth())
                .send({ name: 'Double Delete Driver' });
            expect(createRes.status).toBe(201);
            await (0, supertest_1.default)(app_1.default).delete(`/api/drivers/${createRes.body.id}`).set(auth());
            const res = await (0, supertest_1.default)(app_1.default).delete(`/api/drivers/${createRes.body.id}`).set(auth());
            expect(res.status).toBe(404);
        });
    });
    // ════════════════════════════════════════════════
    //  2. UNIT COMPREHENSIVE FIELDS
    // ════════════════════════════════════════════════
    describe('Units – Comprehensive Fields', () => {
        // --- CREATE ---
        it('POST creates unit with all new fields', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/units')
                .set(auth())
                .send({
                name: 'Truck 200',
                color: 'White',
                plateNumber: 'ABC-100',
                vin: '1HGCM82633A004352',
                status: 'ACTIVE',
                year: 2022,
                make: 'Freightliner',
                model: 'Cascadia',
                mileage: 150000,
                insuranceExpiry: '2026-06-15',
                lastMaintenanceDate: '2026-01-10',
                nextMaintenanceDate: '2026-04-10',
            });
            expect(res.status).toBe(201);
            expect(res.body.name).toBe('Truck 200');
            expect(res.body.status).toBe('ACTIVE');
            expect(res.body.year).toBe(2022);
            expect(res.body.make).toBe('Freightliner');
            expect(res.body.model).toBe('Cascadia');
            expect(res.body.mileage).toBe(150000);
            expect(String(res.body.insuranceExpiry)).toMatch(/2026-06-15/);
            expect(String(res.body.lastMaintenanceDate)).toMatch(/2026-01-10/);
            expect(String(res.body.nextMaintenanceDate)).toMatch(/2026-04-10/);
            expect(res.body.organizationId).toBe(ctx.orgId);
        });
        it('POST creates unit with only name (all optional fields default to null/ACTIVE)', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/units')
                .set(auth())
                .send({ name: 'Minimal Unit' });
            expect(res.status).toBe(201);
            expect(res.body.status).toBe('ACTIVE');
            expect(res.body.year).toBeNull();
            expect(res.body.make).toBeNull();
            expect(res.body.model).toBeNull();
            expect(res.body.mileage).toBeNull();
            expect(res.body.color).toBeNull();
            expect(res.body.plateNumber).toBeNull();
            expect(res.body.vin).toBeNull();
            expect(res.body.insuranceExpiry).toBeNull();
            expect(res.body.lastMaintenanceDate).toBeNull();
            expect(res.body.nextMaintenanceDate).toBeNull();
        });
        it('POST creates unit with MAINTENANCE status', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/units')
                .set(auth())
                .send({ name: 'In Shop', status: 'MAINTENANCE' });
            expect(res.status).toBe(201);
            expect(res.body.status).toBe('MAINTENANCE');
        });
        it('POST creates unit with RETIRED status', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/units')
                .set(auth())
                .send({ name: 'Old Truck', status: 'RETIRED', year: 2005, make: 'Peterbilt', model: '379' });
            expect(res.status).toBe(201);
            expect(res.body.status).toBe('RETIRED');
            expect(res.body.year).toBe(2005);
        });
        it('POST without name returns 400', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/units')
                .set(auth())
                .send({ color: 'Blue', year: 2020 });
            expect(res.status).toBe(400);
        });
        it('POST without auth returns 401', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/units')
                .send({ name: 'No Auth Unit' });
            expect(res.status).toBe(401);
        });
        // --- READ ---
        it('GET /api/units returns paginated list with all new fields', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/units')
                .set(auth());
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('total');
            expect(res.body).toHaveProperty('page');
            expect(res.body).toHaveProperty('limit');
            expect(res.body).toHaveProperty('totalPages');
            if (res.body.data.length > 0) {
                const u = res.body.data[0];
                expect(u).toHaveProperty('status');
                expect(u).toHaveProperty('year');
                expect(u).toHaveProperty('make');
                expect(u).toHaveProperty('model');
                expect(u).toHaveProperty('mileage');
                expect(u).toHaveProperty('insuranceExpiry');
                expect(u).toHaveProperty('lastMaintenanceDate');
                expect(u).toHaveProperty('nextMaintenanceDate');
            }
        });
        it('GET /api/units with pagination', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/units?page=1&limit=2')
                .set(auth());
            expect(res.status).toBe(200);
            expect(res.body.limit).toBe(2);
            expect(res.body.data.length).toBeLessThanOrEqual(2);
        });
        it('GET /api/units/:id returns single unit with all fields', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/units')
                .set(auth())
                .send({ name: 'Get By Id Unit', year: 2023, make: 'Kenworth', model: 'T680', mileage: 80000 });
            expect(createRes.status).toBe(201);
            const getRes = await (0, supertest_1.default)(app_1.default)
                .get(`/api/units/${createRes.body.id}`)
                .set(auth());
            expect(getRes.status).toBe(200);
            expect(getRes.body.id).toBe(createRes.body.id);
            expect(getRes.body.year).toBe(2023);
            expect(getRes.body.make).toBe('Kenworth');
            expect(getRes.body.model).toBe('T680');
            expect(getRes.body.mileage).toBe(80000);
        });
        it('GET /api/units/:id returns 404 for unknown id', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/units/${UNKNOWN_UUID}`)
                .set(auth());
            expect(res.status).toBe(404);
        });
        it('GET /api/units without token returns 401', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/units');
            expect(res.status).toBe(401);
        });
        // --- FILTERING ---
        it('filters units by status', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/units?filter_status=ACTIVE')
                .set(auth());
            expect(res.status).toBe(200);
            for (const u of res.body.data) {
                expect(u.status).toBe('ACTIVE');
            }
        });
        it('filters units by make', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/units?filter_make=Freightliner')
                .set(auth());
            expect(res.status).toBe(200);
            for (const u of res.body.data) {
                expect(u.make.toLowerCase()).toContain('freightliner');
            }
        });
        it('filters units by model', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/units?filter_model=Cascadia')
                .set(auth());
            expect(res.status).toBe(200);
            for (const u of res.body.data) {
                expect(u.model.toLowerCase()).toContain('cascadia');
            }
        });
        it('filters units by plateNumber', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/units?filter_plateNumber=ABC')
                .set(auth());
            expect(res.status).toBe(200);
            for (const u of res.body.data) {
                expect(u.plateNumber.toUpperCase()).toContain('ABC');
            }
        });
        // --- SORTING ---
        it('sorts units by mileage desc', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/units?sortBy=mileage&order=desc')
                .set(auth());
            expect(res.status).toBe(200);
        });
        it('sorts units by year asc', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/units?sortBy=year&order=asc')
                .set(auth());
            expect(res.status).toBe(200);
        });
        // --- UPDATE ---
        it('PATCH updates status to MAINTENANCE', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/units')
                .set(auth())
                .send({ name: 'Status Update Unit' });
            expect(createRes.status).toBe(201);
            const patchRes = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/units/${createRes.body.id}`)
                .set(auth())
                .send({ status: 'MAINTENANCE' });
            expect(patchRes.status).toBe(200);
            expect(patchRes.body.status).toBe('MAINTENANCE');
        });
        it('PATCH updates mileage only, preserves other fields', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/units')
                .set(auth())
                .send({ name: 'Mileage Unit', mileage: 100000, year: 2020, make: 'Volvo' });
            expect(createRes.status).toBe(201);
            const patchRes = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/units/${createRes.body.id}`)
                .set(auth())
                .send({ mileage: 110000 });
            expect(patchRes.status).toBe(200);
            expect(patchRes.body.mileage).toBe(110000);
            expect(patchRes.body.year).toBe(2020);
            expect(patchRes.body.make).toBe('Volvo');
            expect(patchRes.body.name).toBe('Mileage Unit');
        });
        it('PATCH updates maintenance dates', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/units')
                .set(auth())
                .send({ name: 'Maint Date Unit' });
            expect(createRes.status).toBe(201);
            const patchRes = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/units/${createRes.body.id}`)
                .set(auth())
                .send({ lastMaintenanceDate: '2026-03-01', nextMaintenanceDate: '2026-06-01' });
            expect(patchRes.status).toBe(200);
            expect(String(patchRes.body.lastMaintenanceDate)).toMatch(/2026-03-01/);
            expect(String(patchRes.body.nextMaintenanceDate)).toMatch(/2026-06-01/);
        });
        it('PATCH updates insuranceExpiry', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/units')
                .set(auth())
                .send({ name: 'Insurance Unit', insuranceExpiry: '2026-12-31' });
            expect(createRes.status).toBe(201);
            const patchRes = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/units/${createRes.body.id}`)
                .set(auth())
                .send({ insuranceExpiry: '2027-06-30' });
            expect(patchRes.status).toBe(200);
            expect(String(patchRes.body.insuranceExpiry)).toMatch(/2027-06-30/);
        });
        it('PATCH updates make, model, year together', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/units')
                .set(auth())
                .send({ name: 'Vehicle Detail Unit' });
            expect(createRes.status).toBe(201);
            const patchRes = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/units/${createRes.body.id}`)
                .set(auth())
                .send({ make: 'International', model: 'LT', year: 2024 });
            expect(patchRes.status).toBe(200);
            expect(patchRes.body.make).toBe('International');
            expect(patchRes.body.model).toBe('LT');
            expect(patchRes.body.year).toBe(2024);
        });
        it('PATCH on unknown id returns 404', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/units/${UNKNOWN_UUID}`)
                .set(auth())
                .send({ name: 'Ghost' });
            expect(res.status).toBe(404);
        });
        // --- DELETE ---
        it('DELETE removes unit and returns 204', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/units')
                .set(auth())
                .send({ name: 'Delete Me Unit' });
            expect(createRes.status).toBe(201);
            const delRes = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/units/${createRes.body.id}`)
                .set(auth());
            expect(delRes.status).toBe(204);
            const getRes = await (0, supertest_1.default)(app_1.default)
                .get(`/api/units/${createRes.body.id}`)
                .set(auth());
            expect(getRes.status).toBe(404);
        });
        it('DELETE on unknown id returns 404', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/units/${UNKNOWN_UUID}`)
                .set(auth());
            expect(res.status).toBe(404);
        });
        it('DELETE unit twice returns 404 on second attempt', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/units')
                .set(auth())
                .send({ name: 'Double Delete Unit' });
            expect(createRes.status).toBe(201);
            await (0, supertest_1.default)(app_1.default).delete(`/api/units/${createRes.body.id}`).set(auth());
            const res = await (0, supertest_1.default)(app_1.default).delete(`/api/units/${createRes.body.id}`).set(auth());
            expect(res.status).toBe(404);
        });
    });
    // ════════════════════════════════════════════════
    //  3. JOBS – sourceType + CARRIER SUPPORT
    // ════════════════════════════════════════════════
    describe('Jobs – sourceType and Carrier Fields', () => {
        let companyId;
        let jobTypeId;
        let dispatcherId;
        let unitId;
        let driverId;
        beforeAll(async () => {
            if (!ctx)
                return;
            const companyRes = await (0, supertest_1.default)(app_1.default).post('/api/companies').set(auth()).send({ name: 'Jobs Test Co' });
            companyId = companyRes.body.id;
            const jtRes = await (0, supertest_1.default)(app_1.default).post('/api/job-types').set(auth()).send({ companyId, title: 'Test Haul', rateOfJob: 500 });
            jobTypeId = jtRes.body.id;
            const dispRes = await (0, supertest_1.default)(app_1.default).post('/api/dispatchers').set(auth()).send({ name: 'Jobs Test Disp', commissionPercent: 10 });
            dispatcherId = dispRes.body.id;
            const unitRes = await (0, supertest_1.default)(app_1.default).post('/api/units').set(auth()).send({ name: 'Jobs Test Unit' });
            unitId = unitRes.body.id;
            const driverRes = await (0, supertest_1.default)(app_1.default).post('/api/drivers').set(auth()).send({ name: 'Jobs Test Driver', hourlyRate: 25 });
            driverId = driverRes.body.id;
        });
        // --- CREATE ---
        it('POST creates DISPATCHED job by default', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set(auth())
                .send({ jobDate: '2026-03-01', jobTypeId, dispatcherId, amount: 500 });
            expect(res.status).toBe(201);
            expect(res.body.sourceType).toBe('DISPATCHED');
            expect(res.body.dispatcherId).toBe(dispatcherId);
            expect(res.body.carrierId).toBeNull();
            expect(res.body.carrierAmount).toBeNull();
            expect(res.body.organizationId).toBe(ctx.orgId);
        });
        it('POST creates DIRECT job without dispatcher', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set(auth())
                .send({ jobDate: '2026-03-02', jobTypeId, sourceType: 'DIRECT', amount: 800 });
            expect(res.status).toBe(201);
            expect(res.body.sourceType).toBe('DIRECT');
            expect(res.body.dispatcherId).toBeNull();
        });
        it('POST creates DIRECT job with carrierAmount (subcontracted out)', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set(auth())
                .send({ jobDate: '2026-03-03', jobTypeId, sourceType: 'DIRECT', amount: 1000, carrierAmount: 750 });
            expect(res.status).toBe(201);
            expect(res.body.amount).toBe(1000);
            expect(res.body.carrierAmount).toBe(750);
        });
        it('POST creates job with all associations (driver, unit, dispatcher)', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set(auth())
                .send({
                jobDate: '2026-03-04',
                jobTypeId,
                driverId,
                dispatcherId,
                unitId,
                weight: '40000',
                loads: 3,
                startTime: '08:00',
                endTime: '16:00',
                amount: 600,
                ticketIds: 'T-001,T-002',
            });
            expect(res.status).toBe(201);
            expect(res.body.driverId).toBe(driverId);
            expect(res.body.unitId).toBe(unitId);
            expect(res.body.dispatcherId).toBe(dispatcherId);
            expect(res.body.weight).toBe('40000');
            expect(res.body.loads).toBe(3);
            expect(res.body.startTime).toBe('08:00');
            expect(res.body.endTime).toBe('16:00');
            expect(res.body.ticketIds).toBe('T-001,T-002');
        });
        it('POST without jobDate returns 400', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set(auth())
                .send({ jobTypeId });
            expect(res.status).toBe(400);
        });
        it('POST without jobTypeId returns 400', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set(auth())
                .send({ jobDate: '2026-03-05' });
            expect(res.status).toBe(400);
        });
        it('POST without auth returns 401', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .send({ jobDate: '2026-03-05', jobTypeId: 'fake' });
            expect(res.status).toBe(401);
        });
        // --- READ ---
        it('GET /api/jobs returns paginated list with new fields', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/jobs')
                .set(auth());
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('total');
            expect(res.body).toHaveProperty('page');
            expect(res.body).toHaveProperty('limit');
            expect(res.body).toHaveProperty('totalPages');
            if (res.body.data.length > 0) {
                const j = res.body.data[0];
                expect(j).toHaveProperty('sourceType');
                expect(j).toHaveProperty('carrierId');
                expect(j).toHaveProperty('carrierAmount');
            }
        });
        it('GET /api/jobs with pagination', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/jobs?page=1&limit=3')
                .set(auth());
            expect(res.status).toBe(200);
            expect(res.body.limit).toBe(3);
            expect(res.body.data.length).toBeLessThanOrEqual(3);
        });
        it('GET /api/jobs/:id returns job with all new fields', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set(auth())
                .send({ jobDate: '2026-03-06', jobTypeId, sourceType: 'DIRECT', amount: 900, carrierAmount: 600 });
            expect(createRes.status).toBe(201);
            const getRes = await (0, supertest_1.default)(app_1.default)
                .get(`/api/jobs/${createRes.body.id}`)
                .set(auth());
            expect(getRes.status).toBe(200);
            expect(getRes.body.sourceType).toBe('DIRECT');
            expect(getRes.body.amount).toBe(900);
            expect(getRes.body.carrierAmount).toBe(600);
        });
        it('GET /api/jobs/:id returns 404 for unknown id', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/jobs/${UNKNOWN_UUID}`)
                .set(auth());
            expect(res.status).toBe(404);
        });
        it('GET /api/jobs without token returns 401', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/jobs');
            expect(res.status).toBe(401);
        });
        // --- FILTERING ---
        it('filters jobs by sourceType DIRECT', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/jobs?filter_sourceType=DIRECT')
                .set(auth());
            expect(res.status).toBe(200);
            for (const j of res.body.data) {
                expect(j.sourceType).toBe('DIRECT');
            }
        });
        it('filters jobs by sourceType DISPATCHED', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/jobs?filter_sourceType=DISPATCHED')
                .set(auth());
            expect(res.status).toBe(200);
            for (const j of res.body.data) {
                expect(j.sourceType).toBe('DISPATCHED');
            }
        });
        // --- UPDATE ---
        it('PATCH updates sourceType from DISPATCHED to DIRECT', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set(auth())
                .send({ jobDate: '2026-03-07', jobTypeId, dispatcherId });
            expect(createRes.status).toBe(201);
            const patchRes = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/jobs/${createRes.body.id}`)
                .set(auth())
                .send({ sourceType: 'DIRECT', dispatcherId: null });
            expect(patchRes.status).toBe(200);
            expect(patchRes.body.sourceType).toBe('DIRECT');
            expect(patchRes.body.dispatcherId).toBeNull();
        });
        it('PATCH updates carrierAmount', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set(auth())
                .send({ jobDate: '2026-03-08', jobTypeId, sourceType: 'DIRECT', amount: 1000 });
            expect(createRes.status).toBe(201);
            const patchRes = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/jobs/${createRes.body.id}`)
                .set(auth())
                .send({ carrierAmount: 700 });
            expect(patchRes.status).toBe(200);
            expect(patchRes.body.carrierAmount).toBe(700);
            expect(patchRes.body.amount).toBe(1000); // preserved
        });
        it('PATCH updates amount only, preserves other fields', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set(auth())
                .send({ jobDate: '2026-03-09', jobTypeId, driverId, dispatcherId, amount: 500 });
            expect(createRes.status).toBe(201);
            const patchRes = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/jobs/${createRes.body.id}`)
                .set(auth())
                .send({ amount: 550 });
            expect(patchRes.status).toBe(200);
            expect(patchRes.body.amount).toBe(550);
            expect(patchRes.body.driverId).toBe(driverId);
            expect(patchRes.body.dispatcherId).toBe(dispatcherId);
            expect(patchRes.body.sourceType).toBe('DISPATCHED');
        });
        it('PATCH updates jobDate', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set(auth())
                .send({ jobDate: '2026-03-10', jobTypeId });
            expect(createRes.status).toBe(201);
            const patchRes = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/jobs/${createRes.body.id}`)
                .set(auth())
                .send({ jobDate: '2026-03-20' });
            expect(patchRes.status).toBe(200);
            expect(String(patchRes.body.jobDate)).toMatch(/2026-03-20/);
        });
        it('PATCH on unknown id returns 404', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/jobs/${UNKNOWN_UUID}`)
                .set(auth())
                .send({ amount: 100 });
            expect(res.status).toBe(404);
        });
        // --- DELETE ---
        it('DELETE removes job and returns 204', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set(auth())
                .send({ jobDate: '2026-03-11', jobTypeId });
            expect(createRes.status).toBe(201);
            const delRes = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/jobs/${createRes.body.id}`)
                .set(auth());
            expect(delRes.status).toBe(204);
            const getRes = await (0, supertest_1.default)(app_1.default)
                .get(`/api/jobs/${createRes.body.id}`)
                .set(auth());
            expect(getRes.status).toBe(404);
        });
        it('DELETE on unknown id returns 404', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/jobs/${UNKNOWN_UUID}`)
                .set(auth());
            expect(res.status).toBe(404);
        });
        it('DELETE job twice returns 404 on second attempt', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/jobs')
                .set(auth())
                .send({ jobDate: '2026-03-12', jobTypeId });
            expect(createRes.status).toBe(201);
            await (0, supertest_1.default)(app_1.default).delete(`/api/jobs/${createRes.body.id}`).set(auth());
            const res = await (0, supertest_1.default)(app_1.default).delete(`/api/jobs/${createRes.body.id}`).set(auth());
            expect(res.status).toBe(404);
        });
    });
    // ════════════════════════════════════════════════
    //  4. INVOICES – DIRECT COMPANY INVOICING
    // ════════════════════════════════════════════════
    describe('Invoices – Direct Company Invoicing', () => {
        let companyId;
        let company2Id;
        let dispatcherId;
        beforeAll(async () => {
            if (!ctx)
                return;
            const companyRes = await (0, supertest_1.default)(app_1.default).post('/api/companies').set(auth()).send({ name: 'Invoice Co' });
            companyId = companyRes.body.id;
            const company2Res = await (0, supertest_1.default)(app_1.default).post('/api/companies').set(auth()).send({ name: 'Invoice Co 2' });
            company2Id = company2Res.body.id;
            const dispRes = await (0, supertest_1.default)(app_1.default).post('/api/dispatchers').set(auth()).send({ name: 'Invoice Disp' });
            dispatcherId = dispRes.body.id;
        });
        // --- CREATE ---
        it('POST creates dispatcher invoice (traditional)', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set(auth())
                .send({ invoiceNumber: 'INV-C-001', invoiceDate: '2026-03-01', dispatcherId });
            expect(res.status).toBe(201);
            expect(res.body.dispatcherId).toBe(dispatcherId);
            expect(res.body.companyId).toBeNull();
            expect(res.body.status).toBe('CREATED');
            expect(res.body.organizationId).toBe(ctx.orgId);
        });
        it('POST creates company invoice (direct)', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set(auth())
                .send({ invoiceNumber: 'INV-C-002', invoiceDate: '2026-03-02', companyId });
            expect(res.status).toBe(201);
            expect(res.body.companyId).toBe(companyId);
            expect(res.body.dispatcherId).toBeNull();
        });
        it('POST creates invoice with both dispatcherId and companyId', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set(auth())
                .send({ invoiceNumber: 'INV-C-003', invoiceDate: '2026-03-03', dispatcherId, companyId });
            expect(res.status).toBe(201);
            expect(res.body.dispatcherId).toBe(dispatcherId);
            expect(res.body.companyId).toBe(companyId);
        });
        it('POST creates invoice with custom status RAISED', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set(auth())
                .send({ invoiceNumber: 'INV-C-004', invoiceDate: '2026-03-04', companyId, status: 'RAISED' });
            expect(res.status).toBe(201);
            expect(res.body.status).toBe('RAISED');
        });
        it('POST creates invoice with billedTo and billedEmail', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set(auth())
                .send({
                invoiceNumber: 'INV-C-005',
                invoiceDate: '2026-03-05',
                companyId,
                billedTo: 'Acme Corp',
                billedEmail: 'billing@acme.com',
            });
            expect(res.status).toBe(201);
            expect(res.body.billedTo).toBe('Acme Corp');
            expect(res.body.billedEmail).toBe('billing@acme.com');
        });
        it('POST without invoiceNumber returns 400', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set(auth())
                .send({ invoiceDate: '2026-03-06', companyId });
            expect(res.status).toBe(400);
        });
        it('POST without invoiceDate returns 400', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set(auth())
                .send({ invoiceNumber: 'INV-C-FAIL', companyId });
            expect(res.status).toBe(400);
        });
        it('POST without dispatcherId or companyId returns 400', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set(auth())
                .send({ invoiceNumber: 'INV-C-FAIL2', invoiceDate: '2026-03-06' });
            expect(res.status).toBe(400);
        });
        it('POST without auth returns 401', async () => {
            const res = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .send({ invoiceNumber: 'INV-NO-AUTH', invoiceDate: '2026-03-06', companyId: 'fake' });
            expect(res.status).toBe(401);
        });
        // --- READ ---
        it('GET /api/invoices returns paginated list with companyId', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get('/api/invoices')
                .set(auth());
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('total');
            if (res.body.data.length > 0) {
                expect(res.body.data[0]).toHaveProperty('companyId');
                expect(res.body.data[0]).toHaveProperty('dispatcherId');
            }
        });
        it('GET /api/invoices/:id returns company invoice', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set(auth())
                .send({ invoiceNumber: 'INV-C-GET', invoiceDate: '2026-03-07', companyId });
            expect(createRes.status).toBe(201);
            const getRes = await (0, supertest_1.default)(app_1.default)
                .get(`/api/invoices/${createRes.body.id}`)
                .set(auth());
            expect(getRes.status).toBe(200);
            expect(getRes.body.companyId).toBe(companyId);
            expect(getRes.body.dispatcherId).toBeNull();
        });
        it('GET /api/invoices/:id returns 404 for unknown id', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/invoices/${UNKNOWN_UUID}`)
                .set(auth());
            expect(res.status).toBe(404);
        });
        it('GET /api/invoices without token returns 401', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/invoices');
            expect(res.status).toBe(401);
        });
        // --- UPDATE ---
        it('PATCH updates companyId', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set(auth())
                .send({ invoiceNumber: 'INV-C-PATCH1', invoiceDate: '2026-03-08', companyId });
            expect(createRes.status).toBe(201);
            const patchRes = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/invoices/${createRes.body.id}`)
                .set(auth())
                .send({ companyId: company2Id });
            expect(patchRes.status).toBe(200);
            expect(patchRes.body.companyId).toBe(company2Id);
        });
        it('PATCH updates status from CREATED to RAISED', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set(auth())
                .send({ invoiceNumber: 'INV-C-PATCH2', invoiceDate: '2026-03-09', companyId });
            expect(createRes.status).toBe(201);
            const patchRes = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/invoices/${createRes.body.id}`)
                .set(auth())
                .send({ status: 'RAISED' });
            expect(patchRes.status).toBe(200);
            expect(patchRes.body.status).toBe('RAISED');
        });
        it('PATCH updates status from RAISED to RECEIVED', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set(auth())
                .send({ invoiceNumber: 'INV-C-PATCH3', invoiceDate: '2026-03-10', companyId, status: 'RAISED' });
            expect(createRes.status).toBe(201);
            const patchRes = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/invoices/${createRes.body.id}`)
                .set(auth())
                .send({ status: 'RECEIVED' });
            expect(patchRes.status).toBe(200);
            expect(patchRes.body.status).toBe('RECEIVED');
        });
        it('PATCH updates billedTo and billedEmail', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set(auth())
                .send({ invoiceNumber: 'INV-C-PATCH4', invoiceDate: '2026-03-11', companyId });
            expect(createRes.status).toBe(201);
            const patchRes = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/invoices/${createRes.body.id}`)
                .set(auth())
                .send({ billedTo: 'New Billed', billedEmail: 'new@billed.com' });
            expect(patchRes.status).toBe(200);
            expect(patchRes.body.billedTo).toBe('New Billed');
            expect(patchRes.body.billedEmail).toBe('new@billed.com');
        });
        it('PATCH preserves untouched fields', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set(auth())
                .send({ invoiceNumber: 'INV-C-PATCH5', invoiceDate: '2026-03-12', companyId, billedTo: 'Keep Me' });
            expect(createRes.status).toBe(201);
            const patchRes = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/invoices/${createRes.body.id}`)
                .set(auth())
                .send({ status: 'RAISED' });
            expect(patchRes.status).toBe(200);
            expect(patchRes.body.billedTo).toBe('Keep Me');
            expect(patchRes.body.companyId).toBe(companyId);
        });
        it('PATCH on unknown id returns 404', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/invoices/${UNKNOWN_UUID}`)
                .set(auth())
                .send({ status: 'RAISED' });
            expect(res.status).toBe(404);
        });
        // --- DELETE ---
        it('DELETE removes invoice and returns 204', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set(auth())
                .send({ invoiceNumber: 'INV-C-DEL', invoiceDate: '2026-03-13', companyId });
            expect(createRes.status).toBe(201);
            const delRes = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/invoices/${createRes.body.id}`)
                .set(auth());
            expect(delRes.status).toBe(204);
            const getRes = await (0, supertest_1.default)(app_1.default)
                .get(`/api/invoices/${createRes.body.id}`)
                .set(auth());
            expect(getRes.status).toBe(404);
        });
        it('DELETE on unknown id returns 404', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/invoices/${UNKNOWN_UUID}`)
                .set(auth());
            expect(res.status).toBe(404);
        });
        it('DELETE invoice twice returns 404 on second attempt', async () => {
            if (!ctx)
                return;
            const createRes = await (0, supertest_1.default)(app_1.default)
                .post('/api/invoices')
                .set(auth())
                .send({ invoiceNumber: 'INV-C-DEL2', invoiceDate: '2026-03-14', companyId });
            expect(createRes.status).toBe(201);
            await (0, supertest_1.default)(app_1.default).delete(`/api/invoices/${createRes.body.id}`).set(auth());
            const res = await (0, supertest_1.default)(app_1.default).delete(`/api/invoices/${createRes.body.id}`).set(auth());
            expect(res.status).toBe(404);
        });
    });
    // ════════════════════════════════════════════════
    //  5. JOB-INVOICE VALIDATION
    // ════════════════════════════════════════════════
    describe('JobInvoice – Validation', () => {
        let companyId;
        let jobTypeId;
        let dispatcherAId;
        let dispatcherBId;
        beforeAll(async () => {
            if (!ctx)
                return;
            const companyRes = await (0, supertest_1.default)(app_1.default).post('/api/companies').set(auth()).send({ name: 'JI Validation Co' });
            companyId = companyRes.body.id;
            const jtRes = await (0, supertest_1.default)(app_1.default).post('/api/job-types').set(auth()).send({ companyId, title: 'JI Haul' });
            jobTypeId = jtRes.body.id;
            const dispARes = await (0, supertest_1.default)(app_1.default).post('/api/dispatchers').set(auth()).send({ name: 'Disp A' });
            dispatcherAId = dispARes.body.id;
            const dispBRes = await (0, supertest_1.default)(app_1.default).post('/api/dispatchers').set(auth()).send({ name: 'Disp B' });
            dispatcherBId = dispBRes.body.id;
        });
        // Helper to create a job + invoice + add
        const createJob = async (date, opts = {}) => {
            const res = await (0, supertest_1.default)(app_1.default).post('/api/jobs').set(auth()).send({ jobDate: date, jobTypeId, ...opts });
            expect(res.status).toBe(201);
            return res.body;
        };
        const createInvoice = async (num, date, opts = {}) => {
            const res = await (0, supertest_1.default)(app_1.default).post('/api/invoices').set(auth()).send({ invoiceNumber: num, invoiceDate: date, ...opts });
            expect(res.status).toBe(201);
            return res.body;
        };
        // --- ADD JOB TO INVOICE ---
        it('adds job to dispatcher invoice when dispatchers match', async () => {
            if (!ctx)
                return;
            const job = await createJob('2026-04-01', { dispatcherId: dispatcherAId });
            const inv = await createInvoice('INV-V-001', '2026-04-01', { dispatcherId: dispatcherAId });
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/invoices/${inv.id}/jobs`)
                .set(auth())
                .send({ jobId: job.id, amount: 500 });
            expect(res.status).toBe(201);
            expect(res.body.jobId).toBe(job.id);
            expect(res.body.invoiceId).toBe(inv.id);
            expect(res.body.amount).toBe(500);
        });
        it('rejects job when dispatcher does NOT match invoice', async () => {
            if (!ctx)
                return;
            const job = await createJob('2026-04-02', { dispatcherId: dispatcherAId });
            const inv = await createInvoice('INV-V-002', '2026-04-02', { dispatcherId: dispatcherBId });
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/invoices/${inv.id}/jobs`)
                .set(auth())
                .send({ jobId: job.id, amount: 500 });
            expect(res.status).toBeGreaterThanOrEqual(400);
            expect(res.body.error.message).toMatch(/dispatcher/i);
        });
        it('rejects job already on another invoice', async () => {
            if (!ctx)
                return;
            const job = await createJob('2026-04-03', { dispatcherId: dispatcherAId });
            const inv1 = await createInvoice('INV-V-003', '2026-04-03', { dispatcherId: dispatcherAId });
            const inv2 = await createInvoice('INV-V-004', '2026-04-03', { dispatcherId: dispatcherAId });
            await (0, supertest_1.default)(app_1.default).post(`/api/invoices/${inv1.id}/jobs`).set(auth()).send({ jobId: job.id, amount: 500 });
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/invoices/${inv2.id}/jobs`)
                .set(auth())
                .send({ jobId: job.id, amount: 500 });
            expect(res.status).toBeGreaterThanOrEqual(400);
            expect(res.body.error.message).toMatch(/another invoice/i);
        });
        it('rejects duplicate job on same invoice', async () => {
            if (!ctx)
                return;
            const job = await createJob('2026-04-04', { dispatcherId: dispatcherAId });
            const inv = await createInvoice('INV-V-005', '2026-04-04', { dispatcherId: dispatcherAId });
            await (0, supertest_1.default)(app_1.default).post(`/api/invoices/${inv.id}/jobs`).set(auth()).send({ jobId: job.id, amount: 500 });
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/invoices/${inv.id}/jobs`)
                .set(auth())
                .send({ jobId: job.id, amount: 600 });
            expect(res.status).toBeGreaterThanOrEqual(400);
            expect(res.body.error.message).toMatch(/already on this invoice/i);
        });
        it('allows DIRECT job on company invoice', async () => {
            if (!ctx)
                return;
            const job = await createJob('2026-04-05', { sourceType: 'DIRECT', amount: 700 });
            const inv = await createInvoice('INV-V-006', '2026-04-05', { companyId });
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/invoices/${inv.id}/jobs`)
                .set(auth())
                .send({ jobId: job.id, amount: 700 });
            expect(res.status).toBe(201);
        });
        it('rejects DISPATCHED job on company invoice', async () => {
            if (!ctx)
                return;
            const job = await createJob('2026-04-06', { sourceType: 'DISPATCHED', dispatcherId: dispatcherAId });
            const inv = await createInvoice('INV-V-007', '2026-04-06', { companyId });
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/invoices/${inv.id}/jobs`)
                .set(auth())
                .send({ jobId: job.id, amount: 500 });
            expect(res.status).toBeGreaterThanOrEqual(400);
            expect(res.body.error.message).toMatch(/direct/i);
        });
        it('rejects adding job to non-existent invoice', async () => {
            if (!ctx)
                return;
            const job = await createJob('2026-04-07', { dispatcherId: dispatcherAId });
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/invoices/${UNKNOWN_UUID}/jobs`)
                .set(auth())
                .send({ jobId: job.id, amount: 500 });
            expect(res.status).toBe(404);
        });
        it('rejects adding non-existent job to invoice', async () => {
            if (!ctx)
                return;
            const inv = await createInvoice('INV-V-008', '2026-04-07', { dispatcherId: dispatcherAId });
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/invoices/${inv.id}/jobs`)
                .set(auth())
                .send({ jobId: UNKNOWN_UUID, amount: 500 });
            expect(res.status).toBeGreaterThanOrEqual(400);
        });
        it('rejects add without jobId', async () => {
            if (!ctx)
                return;
            const inv = await createInvoice('INV-V-009', '2026-04-08', { dispatcherId: dispatcherAId });
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/invoices/${inv.id}/jobs`)
                .set(auth())
                .send({ amount: 500 });
            expect(res.status).toBe(400);
        });
        it('rejects add without amount', async () => {
            if (!ctx)
                return;
            const job = await createJob('2026-04-09', { dispatcherId: dispatcherAId });
            const inv = await createInvoice('INV-V-010', '2026-04-09', { dispatcherId: dispatcherAId });
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/invoices/${inv.id}/jobs`)
                .set(auth())
                .send({ jobId: job.id });
            expect(res.status).toBe(400);
        });
        // --- UPDATE AMOUNT ---
        it('PATCH updates job amount on invoice', async () => {
            if (!ctx)
                return;
            const job = await createJob('2026-04-10', { dispatcherId: dispatcherAId });
            const inv = await createInvoice('INV-V-011', '2026-04-10', { dispatcherId: dispatcherAId });
            await (0, supertest_1.default)(app_1.default).post(`/api/invoices/${inv.id}/jobs`).set(auth()).send({ jobId: job.id, amount: 500 });
            const res = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/invoices/${inv.id}/jobs/${job.id}`)
                .set(auth())
                .send({ amount: 750 });
            expect(res.status).toBe(200);
            expect(res.body.amount).toBe(750);
        });
        it('PATCH returns 404 for job not on invoice', async () => {
            if (!ctx)
                return;
            const inv = await createInvoice('INV-V-012', '2026-04-11', { dispatcherId: dispatcherAId });
            const res = await (0, supertest_1.default)(app_1.default)
                .patch(`/api/invoices/${inv.id}/jobs/${UNKNOWN_UUID}`)
                .set(auth())
                .send({ amount: 100 });
            expect(res.status).toBe(404);
        });
        // --- REMOVE JOB FROM INVOICE ---
        it('DELETE removes job from invoice', async () => {
            if (!ctx)
                return;
            const job = await createJob('2026-04-12', { dispatcherId: dispatcherAId });
            const inv = await createInvoice('INV-V-013', '2026-04-12', { dispatcherId: dispatcherAId });
            await (0, supertest_1.default)(app_1.default).post(`/api/invoices/${inv.id}/jobs`).set(auth()).send({ jobId: job.id, amount: 500 });
            const delRes = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/invoices/${inv.id}/jobs/${job.id}`)
                .set(auth());
            expect(delRes.status).toBe(204);
            // Verify it's gone
            const listRes = await (0, supertest_1.default)(app_1.default)
                .get(`/api/invoices/${inv.id}/jobs`)
                .set(auth());
            expect(listRes.body).toHaveLength(0);
        });
        it('DELETE returns 404 for job not on invoice', async () => {
            if (!ctx)
                return;
            const inv = await createInvoice('INV-V-014', '2026-04-13', { dispatcherId: dispatcherAId });
            const res = await (0, supertest_1.default)(app_1.default)
                .delete(`/api/invoices/${inv.id}/jobs/${UNKNOWN_UUID}`)
                .set(auth());
            expect(res.status).toBe(404);
        });
        // --- RE-ADD AFTER REMOVAL ---
        it('job can be added to different invoice after removal', async () => {
            if (!ctx)
                return;
            const job = await createJob('2026-04-14', { dispatcherId: dispatcherAId });
            const inv1 = await createInvoice('INV-V-015', '2026-04-14', { dispatcherId: dispatcherAId });
            // Add then remove
            await (0, supertest_1.default)(app_1.default).post(`/api/invoices/${inv1.id}/jobs`).set(auth()).send({ jobId: job.id, amount: 500 });
            await (0, supertest_1.default)(app_1.default).delete(`/api/invoices/${inv1.id}/jobs/${job.id}`).set(auth());
            // Add to different invoice
            const inv2 = await createInvoice('INV-V-016', '2026-04-14', { dispatcherId: dispatcherAId });
            const res = await (0, supertest_1.default)(app_1.default)
                .post(`/api/invoices/${inv2.id}/jobs`)
                .set(auth())
                .send({ jobId: job.id, amount: 550 });
            expect(res.status).toBe(201);
            expect(res.body.amount).toBe(550);
        });
        // --- LIST JOBS ON INVOICE ---
        it('GET lists all jobs on an invoice', async () => {
            if (!ctx)
                return;
            const job1 = await createJob('2026-04-15', { dispatcherId: dispatcherAId });
            const job2 = await createJob('2026-04-16', { dispatcherId: dispatcherAId });
            const inv = await createInvoice('INV-V-017', '2026-04-15', { dispatcherId: dispatcherAId });
            await (0, supertest_1.default)(app_1.default).post(`/api/invoices/${inv.id}/jobs`).set(auth()).send({ jobId: job1.id, amount: 300 });
            await (0, supertest_1.default)(app_1.default).post(`/api/invoices/${inv.id}/jobs`).set(auth()).send({ jobId: job2.id, amount: 400 });
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/invoices/${inv.id}/jobs`)
                .set(auth());
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
            const amounts = res.body.map((l) => l.amount).sort();
            expect(amounts).toEqual([300, 400]);
        });
        it('GET returns empty list for invoice with no jobs', async () => {
            if (!ctx)
                return;
            const inv = await createInvoice('INV-V-018', '2026-04-17', { dispatcherId: dispatcherAId });
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/invoices/${inv.id}/jobs`)
                .set(auth());
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(0);
        });
        it('GET returns 404 for non-existent invoice', async () => {
            if (!ctx)
                return;
            const res = await (0, supertest_1.default)(app_1.default)
                .get(`/api/invoices/${UNKNOWN_UUID}/jobs`)
                .set(auth());
            expect(res.status).toBe(404);
        });
    });
});
