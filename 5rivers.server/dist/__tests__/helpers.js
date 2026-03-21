"use strict";
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
exports.TEST_PASSWORD = exports.TEST_USER_EMAIL = exports.TEST_ORG_SLUG = void 0;
exports.createTestOrgAndUser = createTestOrgAndUser;
exports.deleteTestData = deleteTestData;
const uuid_1 = require("uuid");
const connection_1 = require("../db/connection");
const auth_service_1 = require("../services/auth.service");
const auth_service_2 = require("../services/auth.service");
exports.TEST_ORG_SLUG = 'test-5rivers-server-cleanup';
exports.TEST_USER_EMAIL = 'test-5rivers-server@example.com';
exports.TEST_PASSWORD = 'TestPassword123!';
/**
 * Create a dedicated test organization, user, and membership.
 * Use the returned context for authenticated requests.
 */
async function createTestOrgAndUser() {
    const orgId = (0, uuid_1.v4)();
    const userId = (0, uuid_1.v4)();
    const passwordHash = await (0, auth_service_1.hashPassword)(exports.TEST_PASSWORD);
    const now = new Date();
    await (0, connection_1.query)(`INSERT INTO Users (id, email, passwordHash, name, createdAt, updatedAt)
     VALUES (@userId, @email, @passwordHash, @name, @now, @now)`, {
        params: {
            userId,
            email: exports.TEST_USER_EMAIL,
            passwordHash,
            name: 'Test User',
            now,
        },
    });
    await (0, connection_1.query)(`INSERT INTO Organizations (id, name, slug, settings, createdAt, updatedAt)
     VALUES (@orgId, @name, @slug, NULL, @now, @now)`, {
        params: {
            orgId,
            name: 'Test Organization',
            slug: exports.TEST_ORG_SLUG,
            now,
        },
    });
    await (0, connection_1.query)(`INSERT INTO OrganizationMember (userId, organizationId, role, createdAt)
     VALUES (@userId, @orgId, @role, @now)`, {
        params: {
            userId,
            orgId,
            role: 'OWNER',
            now,
        },
    });
    const { token } = await (0, auth_service_2.login)({
        email: exports.TEST_USER_EMAIL,
        password: exports.TEST_PASSWORD,
        organizationSlug: exports.TEST_ORG_SLUG,
    });
    return {
        orgId,
        userId,
        token,
        email: exports.TEST_USER_EMAIL,
        password: exports.TEST_PASSWORD,
        organizationSlug: exports.TEST_ORG_SLUG,
    };
}
/**
 * Remove all test data created during tests. Call in afterAll.
 * Order: child tables first, then OrganizationMember, Organizations, Users.
 */
async function deleteTestData(orgId, userId) {
    const { getPool } = await Promise.resolve().then(() => __importStar(require('../db/connection')));
    const pool = await getPool();
    const steps = [
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
        }
        catch (e) {
            console.warn('Cleanup step failed (may be expected if table empty):', sql.slice(0, 60), e);
        }
    }
}
