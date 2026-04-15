/**
 * Timezone utilities for 5Rivers.
 *
 * Storage convention: all DATETIME2 columns store UTC.
 * Display convention: Eastern Time (America/Toronto) — handles EST/EDT automatically.
 *
 * The business operates in Ontario, Canada (Eastern Time).
 * A future profile-level timezone setting can override the display zone.
 */

const DISPLAY_TZ = 'America/Toronto';

// ─── Current time ───────────────────────────────────────────────────────────

/** Current UTC datetime — use for createdAt/updatedAt. */
export function nowUTC(): Date {
  return new Date();
}

/**
 * @deprecated Use nowUTC() instead. Kept temporarily for backward compat.
 * Previously returned a Date whose internal value was Eastern-pretending-to-be-UTC.
 * Now returns actual UTC.
 */
export function nowEastern(): Date {
  return nowUTC();
}

/** Today's date as YYYY-MM-DD in Eastern Time. */
export function todayEastern(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: DISPLAY_TZ });
}

// ─── Input parsing (Eastern → UTC) ─────────────────────────────────────────

/**
 * Parse a time input string as Eastern time and return a UTC Date.
 *
 * Accepted formats:
 *   "07:15"                      → combine with jobDate, treat as Eastern
 *   "7:00 AM" / "5:30 PM"       → combine with jobDate, treat as Eastern
 *   "2025-12-05T07:00"          → ISO without Z, treat as Eastern
 *   "2025-12-05T12:00:00.000Z"  → already UTC, use directly
 *
 * @param jobDate  The job date as YYYY-MM-DD or ISO string (used for bare times)
 * @param timeStr  The time input from the user/API
 * @returns UTC Date, or null if input is empty/unparseable
 */
export function parseTimeInputToUTC(jobDate: string, timeStr: string | null | undefined): Date | null {
  if (!timeStr || !timeStr.trim()) return null;
  const t = timeStr.trim();

  // Already a full UTC ISO string: "2025-12-05T12:00:00.000Z"
  if (t.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(t)) {
    const d = new Date(t);
    return isNaN(d.getTime()) ? null : d;
  }

  // Extract the calendar date from jobDate (YYYY-MM-DD)
  const dateStr = jobDate.slice(0, 10); // handles both "2025-12-05" and "2025-12-05T00:00:00.000Z"

  // ISO without Z: "2025-12-05T07:00" → Eastern time
  if (t.includes('T')) {
    return easternToUTC(t);
  }

  // "7:00 AM" / "5:30 PM" format
  const ampmMatch = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = parseInt(ampmMatch[2], 10);
    const isPM = ampmMatch[3].toUpperCase() === 'PM';
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return easternToUTC(`${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }

  // Bare "HH:MM" or "H:MM"
  const bareMatch = t.match(/^(\d{1,2}):(\d{2})$/);
  if (bareMatch) {
    return easternToUTC(`${dateStr}T${t.padStart(5, '0')}`);
  }

  return null;
}

/**
 * Interpret a "YYYY-MM-DDTHH:MM" string as Eastern time and return UTC Date.
 */
function easternToUTC(easternIso: string): Date | null {
  // Create a Date from the string — JS interprets no-Z as local time.
  // But the server might not be in Eastern. Use Intl to find the real offset.
  const naive = new Date(easternIso);
  if (isNaN(naive.getTime())) return null;

  // Get the UTC offset for this datetime in Eastern
  // Method: format in UTC and Eastern, diff them
  const utcParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(naive);
  const estParts = new Intl.DateTimeFormat('en-US', {
    timeZone: DISPLAY_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(naive);

  const get = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parseInt(parts.find(p => p.type === type)?.value ?? '0', 10);

  const utcH = get(utcParts, 'hour');
  const estH = get(estParts, 'hour');
  const utcD = get(utcParts, 'day');
  const estD = get(estParts, 'day');

  // offset = UTC - Eastern (positive means Eastern is behind)
  let offsetHours = utcH - estH + (utcD - estD) * 24;
  // Normalize to expected range
  if (offsetHours < 0) offsetHours += 24;
  if (offsetHours > 12) offsetHours -= 24;

  // The naive Date was parsed as local machine time.
  // We want to interpret the input as Eastern time instead.
  // Adjust: add offset to convert Eastern → UTC
  const year = parseInt(easternIso.slice(0, 4), 10);
  const month = parseInt(easternIso.slice(5, 7), 10) - 1;
  const day = parseInt(easternIso.slice(8, 10), 10);
  const hour = parseInt(easternIso.slice(11, 13), 10);
  const min = parseInt(easternIso.slice(14, 16), 10);

  const utcDate = new Date(Date.UTC(year, month, day, hour + offsetHours, min, 0, 0));
  return isNaN(utcDate.getTime()) ? null : utcDate;
}

// ─── Output formatting (UTC → Eastern) ─────────────────────────────────────

/**
 * Convert a UTC Date to Eastern time components.
 * Returns { hour, minute } in 24-hour Eastern time.
 */
export function utcToEastern(utcDate: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DISPLAY_TZ,
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(utcDate);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);
  return { hour, minute };
}

/**
 * Format a UTC Date as "H:MM AM/PM" in Eastern time.
 */
export function formatTimeEastern(utcDate: Date | string | null): string {
  if (!utcDate) return '';
  const d = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', {
    timeZone: DISPLAY_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// ─── SQL helpers ────────────────────────────────────────────────────────────

/** SQL expression for current UTC datetime. */
export const SQL_NOW_UTC = `GETUTCDATE()`;

/** SQL expression for current datetime in Eastern Time. */
export const SQL_NOW_EASTERN = `CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Eastern Standard Time' AS DATETIME2)`;

/** SQL expression for today's date in Eastern Time. */
export const SQL_TODAY_EASTERN = `CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Eastern Standard Time' AS DATE)`;
