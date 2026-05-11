/**
 * Unit tests for the timezone utilities in `src/utils/timezone.ts`.
 *
 * The 5Rivers app stores all timestamps in UTC but interprets bare
 * user-facing strings ("7:00 AM", "14:30") as Eastern. Getting this
 * wrong has caused real bugs (job dates drifting by one day during DST).
 * These tests lock in the contract.
 */

import {
  parseTimeInputToUTC,
  nowUTC,
  nowEastern,
  formatTimeEastern,
} from '../../utils/timezone';

describe('parseTimeInputToUTC', () => {
  // Helper: assert two Dates have the same UTC instant (within 1 ms).
  const sameInstant = (a: Date | null, expected: string): void => {
    expect(a).not.toBeNull();
    expect(a!.toISOString()).toBe(new Date(expected).toISOString());
  };

  it('returns null for empty / whitespace / null / undefined', () => {
    expect(parseTimeInputToUTC('2026-04-20', null)).toBeNull();
    expect(parseTimeInputToUTC('2026-04-20', undefined)).toBeNull();
    expect(parseTimeInputToUTC('2026-04-20', '')).toBeNull();
    expect(parseTimeInputToUTC('2026-04-20', '   ')).toBeNull();
  });

  it('passes through a full UTC ISO string with Z', () => {
    sameInstant(
      parseTimeInputToUTC('2026-04-20', '2026-04-20T16:00:00.000Z'),
      '2026-04-20T16:00:00.000Z',
    );
  });

  it('passes through an ISO string with explicit offset', () => {
    sameInstant(
      parseTimeInputToUTC('2026-04-20', '2026-04-20T12:00:00-04:00'),
      '2026-04-20T16:00:00.000Z',
    );
  });

  describe('Eastern-time inputs', () => {
    // April is EDT (UTC-4). 12:00 PM Eastern = 16:00 UTC.

    it('"12:00" (24h) → 16:00 UTC during EDT', () => {
      sameInstant(
        parseTimeInputToUTC('2026-04-20', '12:00'),
        '2026-04-20T16:00:00.000Z',
      );
    });

    it('"7:00 AM" → 11:00 UTC during EDT', () => {
      sameInstant(
        parseTimeInputToUTC('2026-04-20', '7:00 AM'),
        '2026-04-20T11:00:00.000Z',
      );
    });

    it('"12:00 AM" (midnight) → 04:00 UTC', () => {
      sameInstant(
        parseTimeInputToUTC('2026-04-20', '12:00 AM'),
        '2026-04-20T04:00:00.000Z',
      );
    });

    it('"12:00 PM" (noon) → 16:00 UTC', () => {
      sameInstant(
        parseTimeInputToUTC('2026-04-20', '12:00 PM'),
        '2026-04-20T16:00:00.000Z',
      );
    });

    it('"5:30 PM" → 21:30 UTC', () => {
      sameInstant(
        parseTimeInputToUTC('2026-04-20', '5:30 PM'),
        '2026-04-20T21:30:00.000Z',
      );
    });

    it('"22:30" (24h) → 02:30 next-day UTC', () => {
      sameInstant(
        parseTimeInputToUTC('2026-04-20', '22:30'),
        '2026-04-21T02:30:00.000Z',
      );
    });

    it('strips a trailing time component from a date-only jobDate', () => {
      // jobDate "2026-04-20T00:00:00.000Z" still treats the time arg as Eastern
      sameInstant(
        parseTimeInputToUTC('2026-04-20T00:00:00.000Z', '7:00 AM'),
        '2026-04-20T11:00:00.000Z',
      );
    });
  });

  describe('DST boundary handling', () => {
    // EST → EDT: Mar 8 2026, 2:00 AM ET jumps to 3:00 AM ET.
    // EDT → EST: Nov 1 2026, 2:00 AM ET falls back to 1:00 AM ET.

    it('first weekday of EST (Jan): noon Eastern = 17:00 UTC (UTC-5)', () => {
      sameInstant(
        parseTimeInputToUTC('2026-01-15', '12:00 PM'),
        '2026-01-15T17:00:00.000Z',
      );
    });

    it('summer (EDT, Jul): noon Eastern = 16:00 UTC (UTC-4)', () => {
      sameInstant(
        parseTimeInputToUTC('2026-07-15', '12:00 PM'),
        '2026-07-15T16:00:00.000Z',
      );
    });

    it('day after spring-forward (Mar 9 2026): noon Eastern = 16:00 UTC (EDT)', () => {
      sameInstant(
        parseTimeInputToUTC('2026-03-09', '12:00 PM'),
        '2026-03-09T16:00:00.000Z',
      );
    });

    it('day after fall-back (Nov 2 2026): noon Eastern = 17:00 UTC (EST)', () => {
      sameInstant(
        parseTimeInputToUTC('2026-11-02', '12:00 PM'),
        '2026-11-02T17:00:00.000Z',
      );
    });
  });
});

describe('nowUTC / nowEastern / formatTimeEastern', () => {
  it('nowUTC returns a Date close to system time', () => {
    const before = Date.now();
    const t = nowUTC();
    const after = Date.now();
    expect(t.getTime()).toBeGreaterThanOrEqual(before);
    expect(t.getTime()).toBeLessThanOrEqual(after);
  });

  it('nowEastern returns a Date', () => {
    const t = nowEastern();
    expect(t).toBeInstanceOf(Date);
    expect(isNaN(t.getTime())).toBe(false);
  });

  it('formatTimeEastern returns empty string for null input', () => {
    expect(formatTimeEastern(null)).toBe('');
  });

  it('formatTimeEastern formats a UTC date in Eastern HH:MM', () => {
    // 16:00 UTC on Apr 20 2026 = 12:00 PM EDT.
    const utc = new Date('2026-04-20T16:00:00Z');
    const formatted = formatTimeEastern(utc);
    expect(formatted).toMatch(/^\d{1,2}:\d{2}/);
  });
});
