"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const connection_1 = require("../db/connection");
const router = (0, express_1.Router)();
router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
router.get('/health/db', async (_req, res) => {
    try {
        const pool = await (0, connection_1.getPool)();
        await pool.request().query('SELECT 1 AS ok');
        res.json({ status: 'ok', database: 'connected' });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        res.status(503).json({ status: 'error', database: message });
    }
});
exports.default = router;
