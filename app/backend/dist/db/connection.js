"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = getPool;
exports.closePool = closePool;
exports.query = query;
exports.execute = execute;
const mssql_1 = __importDefault(require("mssql"));
const config_1 = require("../config");
let pool = null;
async function getPool() {
    if (!pool) {
        pool = await mssql_1.default.connect(config_1.config.databaseUrl);
    }
    return pool;
}
async function closePool() {
    if (pool) {
        await pool.close();
        pool = null;
    }
}
/** Run a query; use for SELECT and single statements. */
async function query(queryText, params) {
    const p = await getPool();
    const request = p.request();
    if (params) {
        for (const [key, value] of Object.entries(params)) {
            request.input(key, value);
        }
    }
    const result = await request.query(queryText);
    return result.recordset;
}
/** Execute non-query (e.g. schema script with multiple batches). */
async function execute(sqlText) {
    const p = await getPool();
    await p.request().query(sqlText);
}
