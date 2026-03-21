"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Standalone test to verify database connectivity.
 * Run with: npm test -- db-connection
 * If this passes, DATABASE_URL and SQL Server are reachable.
 */
const connection_1 = require("../db/connection");
describe('DB connection', () => {
    afterAll(async () => {
        await (0, connection_1.closePool)();
    }, 10000);
    it('connects and runs a simple query', async () => {
        const pool = await (0, connection_1.getPool)();
        expect(pool).toBeDefined();
        const rows = await (0, connection_1.query)('SELECT 1 AS one');
        expect(rows).toHaveLength(1);
        expect(rows[0].one).toBe(1);
    }, 90000);
});
