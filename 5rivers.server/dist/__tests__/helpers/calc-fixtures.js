"use strict";
/**
 * calc-fixtures.ts — single source of truth for amount-calculation behavior.
 *
 * Consumed by:
 *   • unit/job-amount-calc.test.ts   — feeds computeJobAmountFromInputs()
 *   • views/jobs-effective.test.ts   — seeds rows + asserts SQL view output
 *
 * If a fixture is updated, BOTH harnesses re-validate the formula. If the
 * TS code and the SQL view drift apart, the same fixture fails in both
 * places and the failure points to the divergence.
 *
 * `skipInSql: true` marks fixtures where the SQL view legitimately cannot
 * replicate the TS behavior — currently only tonnage (weight is a
 * polymorphic string that's painful to parse in T-SQL). Those fixtures
 * are still validated against the TypeScript pure formula.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQL_FIXTURES = exports.CALC_FIXTURES = void 0;
// Stable reference dates so every fixture is deterministic.
// `at('HH:MM')` → '2026-04-20T HH:MM:00Z'.
// `at('HH:MM:SS')` → '2026-04-20T HH:MM:SS Z' (seconds-precision opt-in).
const D = '2026-04-20';
const at = (clock) => {
    const hasSeconds = clock.split(':').length === 3;
    return `${D}T${clock}${hasSeconds ? '' : ':00'}Z`;
};
const NEXT_DAY = '2026-04-21';
const atNext = (clock) => {
    const hasSeconds = clock.split(':').length === 3;
    return `${NEXT_DAY}T${clock}${hasSeconds ? '' : ':00'}Z`;
};
// ─── A. fixed — flat rate per job ───────────────────────────────────────────
const FIXED_CASES = [
    { name: 'fixed: basic flat rate', input: { rateOfJob: 500, dispatchType: 'fixed' }, expected: 500 },
    { name: 'fixed: decimal rate', input: { rateOfJob: 499.99, dispatchType: 'fixed' }, expected: 499.99 },
    { name: 'fixed: zero rate → null', input: { rateOfJob: 0, dispatchType: 'fixed' }, expected: null },
    { name: 'fixed: negative rate → null', input: { rateOfJob: -100, dispatchType: 'fixed' }, expected: null },
    { name: 'fixed: NULL rate → null', input: { rateOfJob: null, dispatchType: 'fixed' }, expected: null },
    {
        name: 'fixed: ignores extra inputs',
        input: { rateOfJob: 500, dispatchType: 'fixed', loads: 99, weight: '10', startTime: at('12:00'), endTime: at('13:00') },
        expected: 500,
    },
    { name: 'fixed: very large rate', input: { rateOfJob: 1_000_000, dispatchType: 'fixed' }, expected: 1_000_000 },
    { name: 'fixed: tiny fractional rate', input: { rateOfJob: 0.01, dispatchType: 'fixed' }, expected: 0.01 },
];
// ─── B. load / loads — rate × load count ────────────────────────────────────
const LOAD_CASES = [
    { name: 'load: 3 × $200', input: { rateOfJob: 200, dispatchType: 'load', loads: 3 }, expected: 600 },
    { name: 'loads (plural): 2 × $200', input: { rateOfJob: 200, dispatchType: 'loads', loads: 2 }, expected: 400 },
    { name: 'load: NULL loads defaults to 1', input: { rateOfJob: 200, dispatchType: 'load', loads: null }, expected: 200 },
    { name: 'load: explicit zero loads → 0', input: { rateOfJob: 200, dispatchType: 'load', loads: 0 }, expected: 0 },
    { name: 'load: single load', input: { rateOfJob: 200, dispatchType: 'load', loads: 1 }, expected: 200 },
    { name: 'load: 100 loads', input: { rateOfJob: 50, dispatchType: 'load', loads: 100 }, expected: 5000 },
    { name: 'load: decimal-shaped rate', input: { rateOfJob: 175.50, dispatchType: 'load', loads: 4 }, expected: 702.00 },
    { name: 'load: rate × loads with rounding', input: { rateOfJob: 33.33, dispatchType: 'load', loads: 3 }, expected: 99.99 },
];
// ─── C. hourly — rate × hours ───────────────────────────────────────────────
const HOURLY_CASES = [
    { name: 'hourly: whole hours (5h × $100)', input: { rateOfJob: 100, dispatchType: 'hourly', startTime: at('12:00'), endTime: at('17:00') }, expected: 500 },
    { name: 'hourly: 9.5h × $110', input: { rateOfJob: 110, dispatchType: 'hourly', startTime: at('12:00'), endTime: at('21:30') }, expected: 1045 },
    { name: 'hourly: 15-minute job', input: { rateOfJob: 80, dispatchType: 'hourly', startTime: at('08:00'), endTime: at('08:15') }, expected: 20 },
    { name: 'hourly: 1-second job', input: { rateOfJob: 3600, dispatchType: 'hourly', startTime: at('08:00:00'), endTime: at('08:00:01') }, expected: 1.00 },
    { name: 'hourly: 16h shift', input: { rateOfJob: 50, dispatchType: 'hourly', startTime: at('06:00'), endTime: at('22:00') }, expected: 800 },
    { name: 'hourly: missing startTime → null', input: { rateOfJob: 100, dispatchType: 'hourly', startTime: null, endTime: at('17:00') }, expected: null },
    { name: 'hourly: missing endTime → null', input: { rateOfJob: 100, dispatchType: 'hourly', startTime: at('12:00'), endTime: null }, expected: null },
    { name: 'hourly: both missing → null', input: { rateOfJob: 100, dispatchType: 'hourly', startTime: null, endTime: null }, expected: null },
    { name: 'hourly: end ≤ start → null', input: { rateOfJob: 100, dispatchType: 'hourly', startTime: at('22:00'), endTime: at('06:00') }, expected: null },
    { name: 'hourly: end == start → null', input: { rateOfJob: 100, dispatchType: 'hourly', startTime: at('12:00'), endTime: at('12:00') }, expected: null },
    { name: 'hourly: invalid date → null', input: { rateOfJob: 100, dispatchType: 'hourly', startTime: 'not-a-date', endTime: at('17:00') }, expected: null },
    { name: 'hourly: cross-midnight (4h)', input: { rateOfJob: 100, dispatchType: 'hourly', startTime: at('22:00'), endTime: atNext('02:00') }, expected: 400 },
    { name: 'hourly: float-safe (10h × $0.10)', input: { rateOfJob: 0.10, dispatchType: 'hourly', startTime: at('00:00'), endTime: at('10:00') }, expected: 1.00 },
    // 73.33 × 3.5 = 256.655 exactly, but JS float-mul yields 256.65499999…
    // → Math.round * 100 floors to 256.65. This documents the platform's
    // half-up-on-exact-0.5 behaviour as the contract — keep the SQL view
    // and TS code aligned to whatever JS actually produces.
    { name: 'hourly: rounding (3.5h × $73.33)', input: { rateOfJob: 73.33, dispatchType: 'hourly', startTime: at('08:00'), endTime: at('11:30') }, expected: 256.65 },
];
// ─── D. tonnage — rate × Σ(weights) ─────────────────────────────────────────
// All tonnage cases skipped in SQL view tests (weight parsing not feasible in T-SQL).
const TONNAGE_CASES = [
    { name: 'tonnage: JSON array [22.5,22.5]', input: { rateOfJob: 50, dispatchType: 'tonnage', weight: '[22.5, 22.5]' }, expected: 2250, skipInSql: true },
    { name: 'tonnage: JSON single [45]', input: { rateOfJob: 50, dispatchType: 'tonnage', weight: '[45]' }, expected: 2250, skipInSql: true },
    { name: 'tonnage: space-delimited', input: { rateOfJob: 50, dispatchType: 'tonnage', weight: '22.5 22.5' }, expected: 2250, skipInSql: true },
    { name: 'tonnage: comma-delimited', input: { rateOfJob: 50, dispatchType: 'tonnage', weight: '22.5,22.5' }, expected: 2250, skipInSql: true },
    { name: 'tonnage: comma + space', input: { rateOfJob: 50, dispatchType: 'tonnage', weight: '22.5, 22.5' }, expected: 2250, skipInSql: true },
    { name: 'tonnage: single number string', input: { rateOfJob: 50, dispatchType: 'tonnage', weight: '45' }, expected: 2250, skipInSql: true },
    { name: 'tonnage: decimal weight', input: { rateOfJob: 50, dispatchType: 'tonnage', weight: '45.75' }, expected: 2287.50, skipInSql: true },
    { name: 'tonnage: many loads', input: { rateOfJob: 50, dispatchType: 'tonnage', weight: '[10,10,10,10,10]' }, expected: 2500, skipInSql: true },
    { name: 'tonnage: zero weight → null', input: { rateOfJob: 50, dispatchType: 'tonnage', weight: '0' }, expected: null, skipInSql: true },
    { name: 'tonnage: negative weight filtered', input: { rateOfJob: 50, dispatchType: 'tonnage', weight: '[22.5, -5]' }, expected: 1125, skipInSql: true },
    { name: 'tonnage: valid + invalid mixed', input: { rateOfJob: 50, dispatchType: 'tonnage', weight: '22.5 foo 7.5' }, expected: 1500, skipInSql: true },
    { name: 'tonnage: empty array → null', input: { rateOfJob: 50, dispatchType: 'tonnage', weight: '[]' }, expected: null, skipInSql: true },
    { name: 'tonnage: empty string → null', input: { rateOfJob: 50, dispatchType: 'tonnage', weight: '' }, expected: null, skipInSql: true },
    { name: 'tonnage: NULL weight → null', input: { rateOfJob: 50, dispatchType: 'tonnage', weight: null }, expected: null, skipInSql: true },
    { name: 'tonnage: malformed JSON → null', input: { rateOfJob: 50, dispatchType: 'tonnage', weight: '[bad' }, expected: null, skipInSql: true },
    { name: 'tonnage: whitespace only → null', input: { rateOfJob: 50, dispatchType: 'tonnage', weight: '   ' }, expected: null, skipInSql: true },
    { name: 'tonnage: trailing comma', input: { rateOfJob: 50, dispatchType: 'tonnage', weight: '22.5,22.5,' }, expected: 2250, skipInSql: true },
    { name: 'tonnage: float-precision (3×10)', input: { rateOfJob: 0.10, dispatchType: 'tonnage', weight: '10 10 10' }, expected: 3.00, skipInSql: true },
];
// ─── E. Cross-cutting cases ─────────────────────────────────────────────────
const CROSSCUT_CASES = [
    { name: 'NULL dispatchType → flat rate', input: { rateOfJob: 100, dispatchType: null }, expected: 100 },
    { name: 'empty dispatchType → flat rate', input: { rateOfJob: 100, dispatchType: '' }, expected: 100 },
    { name: 'whitespace dispatchType → flat rate', input: { rateOfJob: 100, dispatchType: '  hourly  ', startTime: at('12:00'), endTime: at('13:00') }, expected: 100 },
    { name: 'mixed case Hourly', input: { rateOfJob: 110, dispatchType: 'Hourly', startTime: at('12:00'), endTime: at('21:30') }, expected: 1045 },
    { name: 'all caps LOAD', input: { rateOfJob: 200, dispatchType: 'LOAD', loads: 3 }, expected: 600 },
    { name: 'all caps TONNAGE', input: { rateOfJob: 50, dispatchType: 'TONNAGE', weight: '45' }, expected: 2250, skipInSql: true },
    { name: "unknown 'percentage' → flat rate", input: { rateOfJob: 100, dispatchType: 'percentage' }, expected: 100 },
    { name: "unknown 'milestone' → flat rate", input: { rateOfJob: 500, dispatchType: 'milestone' }, expected: 500 },
];
exports.CALC_FIXTURES = [
    ...FIXED_CASES,
    ...LOAD_CASES,
    ...HOURLY_CASES,
    ...TONNAGE_CASES,
    ...CROSSCUT_CASES,
];
/** Subset that can be validated against the SQL view (excludes tonnage). */
exports.SQL_FIXTURES = exports.CALC_FIXTURES.filter((f) => !f.skipInSql);
