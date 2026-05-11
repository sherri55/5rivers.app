"use strict";
/**
 * Unit tests for `computeJobAmountFromInputs` — the pure TypeScript half of
 * the dynamic-calc model. Exhaustive: covers every realistic input
 * combination for fixed / load / hourly / tonnage / unknown dispatch types.
 *
 * Pairs with `views/jobs-effective.test.ts` which validates the SQL view
 * against the same fixtures. If the TS code and SQL drift apart, both
 * suites flag the divergence.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const job_service_1 = require("../../services/job.service");
const calc_fixtures_1 = require("../helpers/calc-fixtures");
describe('computeJobAmountFromInputs — table-driven calculation accuracy', () => {
    describe.each(calc_fixtures_1.CALC_FIXTURES)('$name', ({ input, expected }) => {
        it(`returns ${expected === null ? 'null' : `$${expected}`}`, () => {
            const result = (0, job_service_1.computeJobAmountFromInputs)(input);
            if (expected === null) {
                expect(result).toBeNull();
            }
            else {
                expect(result).not.toBeNull();
                // 4-decimal tolerance — every formula path already does
                // Math.round(x*100)/100, so values are nominally 2dp, but float-math
                // can leave a 0.0000001 tail before rounding. toBeCloseTo(_, 2)
                // accepts a difference < 0.005.
                expect(result).toBeCloseTo(expected, 2);
            }
        });
    });
});
// ─── Currency / precision invariants ────────────────────────────────────────
//
// These run across every fixture and assert global properties that the
// formula must always satisfy — not per-case but as universal guarantees.
describe('computeJobAmountFromInputs — invariants', () => {
    it('every non-null return is a finite number', () => {
        for (const { input } of calc_fixtures_1.CALC_FIXTURES) {
            const v = (0, job_service_1.computeJobAmountFromInputs)(input);
            if (v !== null)
                expect(Number.isFinite(v)).toBe(true);
        }
    });
    it('every non-null return is rounded to at most 2 decimal places', () => {
        for (const { name, input } of calc_fixtures_1.CALC_FIXTURES) {
            const v = (0, job_service_1.computeJobAmountFromInputs)(input);
            if (v !== null) {
                // Multiplying by 100 should produce an integer (modulo float drift).
                const scaled = v * 100;
                expect(Math.abs(scaled - Math.round(scaled))).toBeLessThan(0.001);
            }
            void name;
        }
    });
    it('never returns NaN or Infinity', () => {
        for (const { input } of calc_fixtures_1.CALC_FIXTURES) {
            const v = (0, job_service_1.computeJobAmountFromInputs)(input);
            if (v !== null) {
                expect(Number.isNaN(v)).toBe(false);
                expect(v).not.toBe(Infinity);
                expect(v).not.toBe(-Infinity);
            }
        }
    });
    it('never returns negative values for valid (non-corrupt) input', () => {
        // The fixture set covers negative-rate cases that expect null. For any
        // fixture whose declared `rateOfJob > 0`, the result must be >= 0.
        for (const { input, expected } of calc_fixtures_1.CALC_FIXTURES) {
            if (expected === null)
                continue;
            const v = (0, job_service_1.computeJobAmountFromInputs)(input);
            if (v !== null)
                expect(v).toBeGreaterThanOrEqual(0);
        }
    });
});
// ─── Branch-specific sanity checks ──────────────────────────────────────────
//
// A few additional cases that don't fit the table form well. These guard
// against subtle bugs that the table fixtures could mask.
describe('computeJobAmountFromInputs — branch sanity', () => {
    it('fixed: rate is independent of all other inputs', () => {
        const baseline = (0, job_service_1.computeJobAmountFromInputs)({ rateOfJob: 500, dispatchType: 'fixed' });
        expect(baseline).toBe(500);
        // Change every other field — result should not move.
        for (const extra of [
            { loads: 99 },
            { weight: '100' },
            { startTime: '2026-04-20T00:00:00Z', endTime: '2026-04-21T00:00:00Z' },
            { loads: 0, weight: '', startTime: null, endTime: null },
        ]) {
            expect((0, job_service_1.computeJobAmountFromInputs)({ rateOfJob: 500, dispatchType: 'fixed', ...extra })).toBe(500);
        }
    });
    it('load: scaling holds for many load counts', () => {
        for (let n = 1; n <= 50; n++) {
            const v = (0, job_service_1.computeJobAmountFromInputs)({ rateOfJob: 10, dispatchType: 'load', loads: n });
            expect(v).toBe(n * 10);
        }
    });
    it('hourly: scales linearly with hours', () => {
        // 1 → 24 hours at $50/hr
        for (let hours = 1; hours <= 24; hours++) {
            const startTime = '2026-04-20T00:00:00Z';
            const endTime = new Date(`2026-04-20T${String(hours).padStart(2, '0')}:00:00Z`).toISOString();
            const v = (0, job_service_1.computeJobAmountFromInputs)({ rateOfJob: 50, dispatchType: 'hourly', startTime, endTime });
            expect(v).toBeCloseTo(hours * 50, 2);
        }
    });
    it('hourly: 1ms below 1 hour rounds to whole-hour amount (cents precision)', () => {
        // 1h - 1ms ≈ 0.99999972 hours × $100 ≈ $99.9999722
        // Math.round(99.9999722 * 100) = 10000 → $100.00 (cents resolution)
        const result = (0, job_service_1.computeJobAmountFromInputs)({
            rateOfJob: 100,
            dispatchType: 'hourly',
            startTime: '2026-04-20T12:00:00.000Z',
            endTime: '2026-04-20T12:59:59.999Z',
        });
        expect(result).toBe(100);
    });
    it('hourly: ~36 seconds short of 1 hour does NOT round up', () => {
        // 0.99 hours × $100 = $99.00 — well below the rounding threshold.
        const result = (0, job_service_1.computeJobAmountFromInputs)({
            rateOfJob: 100,
            dispatchType: 'hourly',
            startTime: '2026-04-20T12:00:00.000Z',
            endTime: '2026-04-20T12:59:24.000Z',
        });
        // 59m24s = 3564s = 0.99h × $100 = $99.00
        expect(result).toBeCloseTo(99, 2);
    });
    it('tonnage: weight ordering does not affect the sum', () => {
        const a = (0, job_service_1.computeJobAmountFromInputs)({ rateOfJob: 10, dispatchType: 'tonnage', weight: '[5,10,15]' });
        const b = (0, job_service_1.computeJobAmountFromInputs)({ rateOfJob: 10, dispatchType: 'tonnage', weight: '[15,5,10]' });
        const c = (0, job_service_1.computeJobAmountFromInputs)({ rateOfJob: 10, dispatchType: 'tonnage', weight: '10 15 5' });
        expect(a).toBe(300);
        expect(b).toBe(300);
        expect(c).toBe(300);
    });
    it('unknown dispatchType always falls back to flat rate', () => {
        const cases = ['percentage', 'commission', 'milestone', 'mileage', 'flat', 'xyz', 'rate-pending'];
        for (const dt of cases) {
            expect((0, job_service_1.computeJobAmountFromInputs)({ rateOfJob: 250, dispatchType: dt })).toBe(250);
        }
    });
});
