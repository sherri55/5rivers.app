"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = getPool;
exports.closePool = closePool;
exports.query = query;
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
/** Run a query and return the recordset. */
async function query(queryText, options = {}) {
    const p = await getPool();
    const request = p.request();
    if (options.params) {
        for (const [key, value] of Object.entries(options.params)) {
            if (Buffer.isBuffer(value)) {
                request.input(key, mssql_1.default.VarBinary(mssql_1.default.MAX), value);
            }
            else {
                request.input(key, value);
            }
        }
    }
    const result = await request.query(queryText);
    return result.recordset;
}
