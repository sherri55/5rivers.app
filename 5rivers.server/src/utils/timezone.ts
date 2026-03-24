/**
 * All times in 5rivers are in Eastern Time (America/Toronto).
 * EDT (Mar-Nov) / EST (Nov-Mar) — handled automatically by the IANA zone.
 */

/** Current datetime in Eastern Time */
export function nowEastern(): Date {
  const now = new Date();
  const eastern = new Date(now.toLocaleString('en-US', { timeZone: 'America/Toronto' }));
  return eastern;
}

/** Today's date as YYYY-MM-DD in Eastern Time */
export function todayEastern(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
}

/** SQL expression for current datetime in Eastern Time */
export const SQL_NOW_EASTERN = `CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Eastern Standard Time' AS DATETIME2)`;

/** SQL expression for today's date in Eastern Time */
export const SQL_TODAY_EASTERN = `CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Eastern Standard Time' AS DATE)`;
