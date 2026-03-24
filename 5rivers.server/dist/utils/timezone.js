"use strict";
/**
 * All times in 5rivers are in Eastern Time (America/Toronto).
 * EDT (Mar-Nov) / EST (Nov-Mar) — handled automatically by the IANA zone.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQL_TODAY_EASTERN = exports.SQL_NOW_EASTERN = void 0;
exports.nowEastern = nowEastern;
exports.todayEastern = todayEastern;
/** Current datetime in Eastern Time */
function nowEastern() {
    const now = new Date();
    const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/Toronto' }));
    return eastern;
}
/** Today's date as YYYY-MM-DD in Eastern Time */
function todayEastern() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
}
/** SQL expression for current datetime in Eastern Time */
exports.SQL_NOW_EASTERN = `CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Eastern Standard Time' AS DATETIME2)`;
/** SQL expression for today's date in Eastern Time */
exports.SQL_TODAY_EASTERN = `CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Eastern Standard Time' AS DATE)`;
