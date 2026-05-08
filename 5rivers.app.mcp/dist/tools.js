function json(data) {
    return JSON.stringify(data, null, 2);
}
// ── Human-readable formatting ────────────────────────────────
/**
 * Format a date value to a short readable form: "Dec 5, 2025"
 *
 * jobDate comes from a SQL DATE column → mssql driver returns it as
 * "2025-12-05T00:00:00.000Z" (midnight UTC).  The actual date is the
 * UTC date portion — we must NOT timezone-convert or it shifts back a day.
 */
function fmtDate(raw) {
    if (!raw || typeof raw !== 'string')
        return '—';
    const d = new Date(raw);
    if (isNaN(d.getTime()))
        return String(raw);
    // Use UTC parts — the date stored is the intended calendar date
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}
/**
 * Format a time value to readable form: "7:00 AM" in Eastern time.
 *
 * After migration 005, startTime/endTime are DATETIME2 storing UTC.
 * The API returns them as ISO strings: "2025-12-05T12:00:00.000Z"
 * We convert UTC → Eastern for display.
 *
 * Also handles legacy formats for backward compatibility:
 *   - "2025-12-05T07:00"  → ISO without Z (Eastern time)
 *   - "07:15"             → bare HH:MM (Eastern time)
 */
function fmtTime(raw) {
    if (!raw || typeof raw !== 'string')
        return '—';
    // Full UTC ISO string: "2025-12-05T12:00:00.000Z" → convert to Eastern
    if (raw.includes('T') && (raw.endsWith('Z') || /[+-]\d{2}:\d{2}/.test(raw))) {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
            return d.toLocaleTimeString('en-US', {
                timeZone: 'America/Toronto',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });
        }
    }
    // Legacy: extract HH:MM from "2025-12-05T07:00", "07:15", etc.
    const m = raw.match(/(\d{1,2}):(\d{2})/);
    if (!m)
        return String(raw);
    let h = parseInt(m[1], 10);
    const min = m[2];
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h > 12)
        h -= 12;
    if (h === 0)
        h = 12;
    return `${h}:${min} ${ampm}`;
}
/** Format a dollar amount: 525 → "$525.00", null → "⏳ pending" */
function fmtMoney(raw) {
    if (raw === null || raw === undefined)
        return '⏳ pending';
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw));
    if (isNaN(n))
        return String(raw);
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
/** Format boolean paid status — compact for table cells */
function fmtPaid(raw) {
    if (raw === true)
        return '✅';
    if (raw === false)
        return '❌';
    return '—';
}
/** Pad or truncate a string to fit a column width */
function pad(s, width) {
    return s.length > width ? s.slice(0, width - 1) + '…' : s.padEnd(width);
}
/** Format a single projected job as a detail card (used by get_job) */
function formatJobDetail(job) {
    const lines = [];
    lines.push(`📋 ${job.jobType ?? 'Unknown job type'}`);
    lines.push(`Date:       ${fmtDate(job.date)}`);
    lines.push(`Time:       ${fmtTime(job.startTime)} → ${fmtTime(job.endTime)}`);
    if (job.from || job.to)
        lines.push(`Route:      ${job.from ?? '—'} → ${job.to ?? '—'}`);
    lines.push(`Company:    ${job.company ?? '—'}`);
    lines.push(`Dispatcher: ${job.dispatcher ?? '—'}`);
    lines.push(`Driver:     ${job.driver ?? '—'}`);
    lines.push(`Unit:       ${job.unit ?? '—'}`);
    lines.push(`Amount:     ${fmtMoney(job.amount)}`);
    lines.push(`Job Paid:   ${job.jobPaid === true ? '✅ Yes' : job.jobPaid === false ? '❌ No' : '—'}`);
    lines.push(`Driver Paid:${job.driverPaid === true ? ' ✅ Yes' : job.driverPaid === false ? ' ❌ No' : ' —'}`);
    if (job.ticketNumber)
        lines.push(`Ticket:     ${job.ticketNumber}`);
    if (job.notes)
        lines.push(`Notes:      ${job.notes}`);
    lines.push(`ID:         ${job.id}`);
    return lines.join('\n');
}
/** Format a list of projected jobs as a markdown table */
function formatJobTable(jobs, meta) {
    const lines = [];
    // Header
    if (meta?.total !== undefined) {
        const paging = meta.totalPages && meta.totalPages > 1
            ? ` (page ${meta.page ?? 1} of ${meta.totalPages})`
            : '';
        lines.push(`Found ${meta.total} job(s)${paging}\n`);
    }
    // Table header
    lines.push('| # | Date | Job Type | Driver | Time | Amount | Paid | ID |');
    lines.push('|---|------|----------|--------|------|--------|------|----|');
    // Rows
    for (let i = 0; i < jobs.length; i++) {
        const j = jobs[i];
        const time = `${fmtTime(j.startTime)}–${fmtTime(j.endTime)}`;
        const shortId = typeof j.id === 'string' ? j.id.slice(0, 8) : '—';
        lines.push(`| ${i + 1} | ${fmtDate(j.date)} | ${j.jobType ?? '—'} | ${j.driver ?? '—'} | ${time} | ${fmtMoney(j.amount)} | ${fmtPaid(j.jobPaid)} | ${shortId}… |`);
    }
    return lines.join('\n');
}
/**
 * Parse a date string and return YYYY-MM-DD as a calendar date.
 *
 * IMPORTANT: a bare "YYYY-MM-DD" is a *calendar date* with no timezone — we
 * MUST NOT round-trip it through `new Date()`. Doing so parses it as UTC
 * midnight (per the ECMAScript spec), and reformatting that timestamp in
 * Eastern time lands on the previous day during DST (e.g. "2026-05-07"
 * becomes "2026-05-06"). The server stores `jobDate` in a SQL DATE column
 * which has no timezone, so the calendar day must round-trip exactly.
 *
 * For non-bare inputs (natural-language dates like "May 7, 2026", or ISO
 * strings with a time/timezone like "2026-05-07T14:30:00-04:00") we parse
 * and reformat in Eastern, which is the app's canonical zone.
 */
function parseDateArg(dateStr) {
    const trimmed = dateStr.trim();
    // Bare YYYY-MM-DD: pass through unchanged.
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed))
        return trimmed;
    const d = new Date(trimmed);
    if (isNaN(d.getTime()))
        return trimmed;
    // en-CA gives YYYY-MM-DD, in Eastern timezone.
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Toronto' });
}
// ─── Fuzzy name matching ─────────────────────────────────────────────────────
/**
 * Common business-name suffixes to strip before comparing.
 * Order matters: longer phrases first so they're removed before shorter subsets.
 */
const BUSINESS_SUFFIXES = [
    'trucking and haulage', 'trucking & haulage',
    'transportation services', 'transport services',
    'haulage services', 'haulage',
    'trucking', 'transport', 'transportation',
    'logistics', 'services', 'solutions',
    'enterprises', 'enterprise',
    'industries', 'industry',
    'incorporated', 'inc\\.', 'inc',
    'limited', 'ltd\\.', 'ltd',
    'corporation', 'corp\\.', 'corp',
    'company', 'co\\.', 'co',
    'group', 'and', '&',
];
const SUFFIX_RE = new RegExp(`\\b(${BUSINESS_SUFFIXES.join('|')})\\b`, 'gi');
/** Normalise a name for fuzzy comparison: lowercase, no punctuation, no business suffixes.
 *  Also strips the possessive "'s" so that "Lucy's" and "Lucy" produce the same form. */
function normaliseName(name) {
    return name
        .toLowerCase()
        .replace(/[''`]\s*s\b/gi, '') // strip possessive 's: "lucy's" → "lucy"
        .replace(/[''`]/g, '') // smart quotes / apostrophes (any survivors)
        .replace(/[^a-z0-9\s]/g, ' ') // punctuation → space
        .replace(SUFFIX_RE, ' ') // strip business suffixes
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * Score how well `search` matches `candidate` (higher = better).
 *  3 — exact normalised match
 *  2 — one contains the other (substring)
 *  1+frac — word-overlap fraction
 *  0 — no overlap
 */
function fuzzyScore(search, candidate) {
    const ns = normaliseName(search);
    const nc = normaliseName(candidate);
    if (!ns || !nc)
        return 0;
    if (ns === nc)
        return 3;
    if (nc.includes(ns) || ns.includes(nc))
        return 2;
    const sw = new Set(ns.split(' ').filter(Boolean));
    const cw = nc.split(' ').filter(Boolean);
    if (!sw.size || !cw.length)
        return 0;
    const overlap = cw.filter((w) => sw.has(w)).length;
    return overlap / Math.max(sw.size, cw.length);
}
/**
 * Resolve a fuzzy search to one of three actions the model can act on immediately:
 *
 *  USE    — one clear winner; the model should use record.id directly
 *  CHOOSE — multiple plausible matches; model should use the first unless context says otherwise
 *  NONE   — nothing matched; model should present allRecords to the user
 *
 * Thresholds:
 *  score ≥ 2  (exact/substring after suffix-strip) → USE if clearly ahead of 2nd place
 *  score 1–2  (word overlap)                       → USE if only one result, otherwise CHOOSE
 *  score  0                                         → NONE
 */
function fuzzyResolve(records, search) {
    const scored = records
        .map((r) => ({ r, score: fuzzyScore(search, r.name) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score);
    if (scored.length === 0)
        return { action: 'NONE', allRecords: records };
    const [first, second] = scored;
    const secondScore = second?.score ?? 0;
    // Clear winner: strong score AND meaningfully ahead of the next candidate
    const clearWinner = first.score >= 2 ||
        (first.score >= 1 && (!second || first.score - secondScore >= 0.4)) ||
        scored.length === 1;
    if (clearWinner) {
        const note = first.score === 3 ? 'exact match' :
            first.score >= 2 ? `matched after stripping business suffix from "${search}"` :
                `best word-overlap match for "${search}"`;
        return { action: 'USE', record: first.r, note };
    }
    return {
        action: 'CHOOSE',
        candidates: scored.slice(0, 4).map(({ r, score }) => ({ ...r, _score: score })),
    };
}
/**
 * Format a FuzzyAction as a plain-text block the tool-calling model can parse:
 *
 *   USE_ID: <uuid>
 *   NAME: <display name>
 *   MATCH_NOTE: <why this was chosen>
 *   INSTRUCTION: Use this id directly — no confirmation needed.
 *
 * Or for CHOOSE / NONE, clear labelled lists with INSTRUCTION lines.
 */
function formatFuzzyResult(result, entityLabel, search) {
    if (result.action === 'USE') {
        return [
            `USE_ID: ${result.record.id}`,
            `NAME: ${result.record.name}`,
            `MATCH_NOTE: ${result.note}`,
            `INSTRUCTION: Use this id directly — do not ask the user to confirm the match.`,
        ].join('\n');
    }
    if (result.action === 'CHOOSE') {
        const list = result.candidates
            .map((c, i) => `  ${i + 1}. ${c.name}  (id: ${c.id})`)
            .join('\n');
        return [
            `MULTIPLE_MATCHES for "${search}":`,
            list,
            `INSTRUCTION: Use the first match. If context clearly points to a different one, use that instead.`,
        ].join('\n');
    }
    // NONE
    const all = result.allRecords.map((r) => `  - ${r.name}  (id: ${r.id})`).join('\n');
    return [
        `NO_MATCH: No ${entityLabel} matched "${search}".`,
        `All ${entityLabel}s:`,
        all,
        `INSTRUCTION: Show the user this list and ask them to identify the correct ${entityLabel}.`,
    ].join('\n');
}
// ─── Job field projection ────────────────────────────────────────────────────
/**
 * Strip raw API job objects down to only the fields relevant for display/reasoning.
 *
 * Critically:
 *  - `jobDate` is renamed to `date` — the day the work was performed.
 *  - `createdAt` and `updatedAt` are excluded — they are record-keeping metadata
 *    and must never be presented to the model as the "date" of a job.
 *  - Raw foreign-key UUIDs (companyId, dispatcherId, etc.) are excluded to reduce noise;
 *    the human-readable *Name fields are kept instead.
 */
function projectJob(job) {
    return {
        id: job.id,
        date: job.jobDate, // work date — NOT createdAt/updatedAt
        company: job.companyName,
        dispatcher: job.dispatcherName,
        driver: job.driverName,
        unit: job.unitName,
        jobType: job.jobTypeTitle ?? job.jobTypeName,
        startTime: job.startTime,
        endTime: job.endTime,
        from: job.startLocation,
        to: job.endLocation,
        amount: job.amount,
        jobPaid: job.jobPaid,
        driverPaid: job.driverPaid,
        ticketNumber: job.ticketIds,
        notes: job.notes,
    };
}
// ── Read Tools ──────────────────────────────────────────────
const list_jobs = {
    name: 'list_jobs',
    description: 'List jobs with optional filters. Use for "show me jobs for today", "jobs from March 1 to 15", "jobs for Wroom dispatcher", "Bre-Ex jobs in October". ' +
        'Each job has: date (the day work was performed — NOT a creation timestamp), company, dispatcher, driver, unit, jobType, startTime, endTime, amount, jobPaid, driverPaid. ' +
        'Use the search parameter to find jobs by company name, dispatcher name, driver name, job type, location, or ticket ID — e.g. search="Wroom" or search="Bre-Ex".',
    inputSchema: {
        type: 'object',
        properties: {
            date: { type: 'string', description: 'Single date — returns jobs on that day. Accepts "2025-02-12", "12th feb 2025", "Oct 3 2025", etc.' },
            dateFrom: { type: 'string', description: 'Start of date range. e.g. "2025-11-01"' },
            dateTo: { type: 'string', description: 'End of date range. e.g. "2025-11-30"' },
            search: {
                type: 'string',
                description: 'Full-text search across company name, dispatcher name, driver name, job type title, start/end location, and ticket IDs. Use this when the user mentions a company or dispatcher by name, e.g. search="Wroom" or search="Bre-Ex".',
            },
            driverId: { type: 'string', description: 'Filter by driver UUID (use list_drivers to look up IDs by name).' },
            dispatcherId: { type: 'string', description: 'Filter by dispatcher UUID (use list_dispatchers to look up IDs by name).' },
            jobTypeId: { type: 'string', description: 'Filter by job type UUID.' },
            jobPaid: { type: 'boolean', description: 'Filter by payment received status. true = paid, false = unpaid.' },
            driverPaid: { type: 'boolean', description: 'Filter by driver paid status.' },
            limit: { type: 'number', description: 'Max results per page (default 50, max 100).', default: 50 },
            page: { type: 'number', description: 'Page number for pagination (default 1).', default: 1 },
        },
    },
    handler: async (client, args) => {
        const filters = {};
        if (args.date) {
            const d = parseDateArg(String(args.date));
            filters.jobDate = d;
        }
        else {
            if (args.dateFrom)
                filters.dateFrom = parseDateArg(String(args.dateFrom));
            if (args.dateTo)
                filters.dateTo = parseDateArg(String(args.dateTo));
        }
        if (args.driverId)
            filters.driverId = String(args.driverId);
        if (args.dispatcherId)
            filters.dispatcherId = String(args.dispatcherId);
        if (args.jobTypeId)
            filters.jobTypeId = String(args.jobTypeId);
        if (args.jobPaid !== undefined)
            filters.jobPaid = String(args.jobPaid);
        if (args.driverPaid !== undefined)
            filters.driverPaid = String(args.driverPaid);
        const result = await client.jobs.list({
            page: Number(args.page) || 1,
            limit: Math.min(Number(args.limit) || 50, 100),
            filters,
            search: args.search ? String(args.search) : undefined,
        });
        if (result.data.length === 0)
            return 'No jobs found for the given filters.';
        const projected = result.data.map(projectJob);
        return formatJobTable(projected, {
            total: result.total,
            page: result.page,
            totalPages: result.totalPages,
        });
    },
};
const get_job = {
    name: 'get_job',
    description: 'Get a single job by ID. Use when the user asks for details of a specific job.',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Job ID.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        const job = await client.jobs.get(String(args.id));
        return job ? formatJobDetail(projectJob(job)) : 'Job not found.';
    },
};
const search_jobs = {
    name: 'search_jobs',
    description: 'Search jobs by text (ticket ID, company name, etc.). Use for "search jobs for ticket 4521".',
    inputSchema: {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'Search query.' },
            limit: { type: 'number', default: 20 },
        },
        required: ['query'],
    },
    handler: async (client, args) => {
        const result = await client.jobs.list({
            search: String(args.query),
            limit: Math.min(Number(args.limit) || 20, 100),
        });
        if (result.data.length === 0)
            return 'No jobs matched the search.';
        const projected = result.data.map(projectJob);
        return formatJobTable(projected, { total: result.total });
    },
};
const get_dashboard_stats = {
    name: 'get_dashboard_stats',
    description: 'Get dashboard summary: total jobs, revenue, expenses, profit, invoices. Use for "dashboard", "summary", "overview", "how many jobs this month", "what\'s our revenue".',
    inputSchema: {
        type: 'object',
        properties: {},
    },
    handler: async (client) => {
        const stats = await client.analytics.dashboard();
        return json(stats);
    },
};
const list_invoices = {
    name: 'list_invoices',
    description: 'List invoices with optional filters. Use for "show invoices", "unpaid invoices", "invoices for February".',
    inputSchema: {
        type: 'object',
        properties: {
            status: { type: 'string', description: 'Filter by status (e.g. PENDING, PAID, SENT).' },
            search: { type: 'string', description: 'Search term.' },
            limit: { type: 'number', default: 20 },
            page: { type: 'number', default: 1 },
        },
    },
    handler: async (client, args) => {
        const filters = {};
        if (args.status)
            filters.status = String(args.status);
        const result = await client.invoices.list({
            page: Number(args.page) || 1,
            limit: Math.min(Number(args.limit) || 20, 100),
            filters,
            search: args.search ? String(args.search) : undefined,
        });
        if (result.data.length === 0)
            return 'No invoices found.';
        return json({ total: result.total, page: result.page, invoices: result.data });
    },
};
const list_drivers = {
    name: 'list_drivers',
    description: 'List all drivers. Supports fuzzy name search — "MH" finds "Mohammed Hassan", partial names and initials work.',
    inputSchema: {
        type: 'object',
        properties: {
            search: { type: 'string', description: 'Fuzzy search by name or initials — e.g. "MH" finds "Mohammed Hassan".' },
            limit: { type: 'number', default: 50 },
        },
    },
    handler: async (client, args) => {
        const result = await client.drivers.list({ limit: 200 });
        if (result.data.length === 0)
            return 'No drivers found.';
        const search = String(args.search ?? '').trim() || undefined;
        if (!search)
            return json({ total: result.data.length, drivers: result.data });
        const resolution = fuzzyResolve(result.data, search);
        return formatFuzzyResult(resolution, 'driver', search);
    },
};
const list_companies = {
    name: 'list_companies',
    description: 'List all companies. Use for "show companies", "list companies". Supports fuzzy name search — loose matches like "birnam" will find "Birnam Aggregates Inc."',
    inputSchema: {
        type: 'object',
        properties: {
            search: { type: 'string', description: 'Fuzzy search by name. Strips business suffixes and matches on word overlap — e.g. "birnam" matches "Birnam Aggregates Inc."' },
            limit: { type: 'number', default: 50 },
        },
    },
    handler: async (client, args) => {
        const result = await client.companies.list({ limit: 200 });
        if (result.data.length === 0)
            return 'No companies found.';
        const search = String(args.search ?? '').trim() || undefined;
        if (!search)
            return json({ total: result.data.length, companies: result.data });
        const resolution = fuzzyResolve(result.data, search);
        return formatFuzzyResult(resolution, 'company', search);
    },
};
const list_dispatchers = {
    name: 'list_dispatchers',
    description: 'List all dispatchers. Use for "list dispatchers", "show dispatchers". Supports fuzzy name search — loose matches like "wroom" will find "Wroom Inc.", "farmers pride" finds "Farmer\'s Pride Haulage".',
    inputSchema: {
        type: 'object',
        properties: {
            search: { type: 'string', description: 'Fuzzy search by name. Strips business suffixes and matches on word overlap — e.g. "wroom" matches "Wroom Inc.", "farmers pride" matches "Farmer\'s Pride Haulage".' },
            limit: { type: 'number', default: 50 },
        },
    },
    handler: async (client, args) => {
        const result = await client.dispatchers.list({ limit: 200 });
        if (result.data.length === 0)
            return 'No dispatchers found.';
        const search = String(args.search ?? '').trim() || undefined;
        if (!search)
            return json({ total: result.data.length, dispatchers: result.data });
        const resolution = fuzzyResolve(result.data, search);
        return formatFuzzyResult(resolution, 'dispatcher', search);
    },
};
const list_units = {
    name: 'list_units',
    description: 'List all units (trucks/vehicles). Supports fuzzy name/number search — "truck 5" or "unit 12" will find the closest match.',
    inputSchema: {
        type: 'object',
        properties: {
            search: { type: 'string', description: 'Fuzzy search by unit name or number — e.g. "12" finds "Unit 12" or "Truck #12".' },
            limit: { type: 'number', default: 50 },
        },
    },
    handler: async (client, args) => {
        const result = await client.units.list({ limit: 200 });
        if (result.data.length === 0)
            return 'No units found.';
        const search = String(args.search ?? '').trim() || undefined;
        if (!search)
            return json({ total: result.data.length, units: result.data });
        const resolution = fuzzyResolve(result.data, search);
        return formatFuzzyResult(resolution, 'unit', search);
    },
};
const list_carriers = {
    name: 'list_carriers',
    description: 'List all carriers. Use for "list carriers", "show carriers".',
    inputSchema: {
        type: 'object',
        properties: {
            search: { type: 'string', description: 'Search by name.' },
            limit: { type: 'number', default: 50 },
        },
    },
    handler: async (client, args) => {
        const result = await client.carriers.list({
            limit: Math.min(Number(args.limit) || 50, 100),
            search: args.search ? String(args.search) : undefined,
        });
        if (result.data.length === 0)
            return 'No carriers found.';
        return json({ total: result.total, carriers: result.data });
    },
};
const list_job_types = {
    name: 'list_job_types',
    description: 'List job types, optionally filtered by company. Use for "show job types", "what job types does company X have".',
    inputSchema: {
        type: 'object',
        properties: {
            companyId: { type: 'string', description: 'Filter by company ID.' },
            search: { type: 'string', description: 'Search by title.' },
            limit: { type: 'number', default: 50 },
        },
    },
    handler: async (client, args) => {
        const filters = {};
        if (args.companyId)
            filters.companyId = String(args.companyId);
        const result = await client.jobTypes.list({
            limit: Math.min(Number(args.limit) || 50, 100),
            filters,
            search: args.search ? String(args.search) : undefined,
        });
        if (result.data.length === 0)
            return 'No job types found.';
        // Annotate job types with null rateOfJob
        const annotated = result.data.map((jt) => {
            if (jt.rateOfJob === null || jt.rateOfJob === undefined) {
                return { ...jt, rateOfJob: null, _ratePending: true };
            }
            return jt;
        });
        return json({ total: result.total, jobTypes: annotated });
    },
};
const list_expenses = {
    name: 'list_expenses',
    description: 'List expenses with optional filters. Use for "show expenses", "expenses this month", "fuel expenses".',
    inputSchema: {
        type: 'object',
        properties: {
            categoryId: { type: 'string', description: 'Filter by expense category ID.' },
            search: { type: 'string', description: 'Search description/vendor.' },
            startDate: { type: 'string', description: 'Start date filter.' },
            endDate: { type: 'string', description: 'End date filter.' },
            limit: { type: 'number', default: 20 },
            page: { type: 'number', default: 1 },
        },
    },
    handler: async (client, args) => {
        const filters = {};
        if (args.categoryId)
            filters.categoryId = String(args.categoryId);
        if (args.startDate)
            filters.startDate = parseDateArg(String(args.startDate));
        if (args.endDate)
            filters.endDate = parseDateArg(String(args.endDate));
        const result = await client.expenses.list({
            page: Number(args.page) || 1,
            limit: Math.min(Number(args.limit) || 20, 100),
            filters,
            search: args.search ? String(args.search) : undefined,
        });
        if (result.data.length === 0)
            return 'No expenses found.';
        return json({ total: result.total, page: result.page, expenses: result.data });
    },
};
const list_expense_categories = {
    name: 'list_expense_categories',
    description: 'List expense categories. Use for "show expense categories", "what categories do we have".',
    inputSchema: {
        type: 'object',
        properties: {
            search: { type: 'string', description: 'Search by name.' },
        },
    },
    handler: async (client, args) => {
        const result = await client.expenseCategories.list({
            limit: 100,
            search: args.search ? String(args.search) : undefined,
        });
        if (result.data.length === 0)
            return 'No expense categories found.';
        return json({ total: result.total, categories: result.data });
    },
};
const get_monthly_profit = {
    name: 'get_monthly_profit',
    description: 'Get monthly profit breakdown (revenue, expenses, profit per month). Use for "monthly profit", "revenue vs expenses", "profit margin".',
    inputSchema: {
        type: 'object',
        properties: {
            months: { type: 'number', description: 'Number of months to look back (default 12).', default: 12 },
        },
    },
    handler: async (client, args) => {
        const data = await client.analytics.monthlyProfit(Number(args.months) || 12);
        return json(data);
    },
};
const get_expenses_by_category = {
    name: 'get_expenses_by_category',
    description: 'Get expense breakdown by category. Use for "expenses by category", "how much on fuel", "top expenses".',
    inputSchema: {
        type: 'object',
        properties: {
            startDate: { type: 'string', description: 'Start date.' },
            endDate: { type: 'string', description: 'End date.' },
        },
    },
    handler: async (client, args) => {
        const data = await client.analytics.expensesByCategory(args.startDate ? parseDateArg(String(args.startDate)) : undefined, args.endDate ? parseDateArg(String(args.endDate)) : undefined);
        return json(data);
    },
};
// ── Write Tools ─────────────────────────────────────────────
const create_job = {
    name: 'create_job',
    description: 'Create a new job. Requires jobDate and jobTypeId at minimum. Use after confirming details with the user.',
    inputSchema: {
        type: 'object',
        properties: {
            jobDate: { type: 'string', description: 'Job date (YYYY-MM-DD).' },
            jobTypeId: { type: 'string', description: 'Job type ID.' },
            driverId: { type: 'string', description: 'Driver ID.' },
            dispatcherId: { type: 'string', description: 'Dispatcher ID.' },
            unitId: { type: 'string', description: 'Unit/truck ID.' },
            carrierId: { type: 'string', description: 'Carrier ID.' },
            sourceType: { type: 'string', enum: ['DISPATCHED', 'DIRECT'], description: 'Source type.' },
            startTime: { type: 'string', description: 'Start time (HH:MM or HH:MM AM/PM).' },
            endTime: { type: 'string', description: 'End time (HH:MM or HH:MM AM/PM).' },
            weight: { type: 'string', description: 'Weight.' },
            loads: { type: 'number', description: 'Number of loads.' },
            amount: { type: 'number', description: 'Job amount in dollars.' },
            ticketIds: { type: 'string', description: 'Ticket number(s) — single number like "4521" or comma-separated "4521,4522".' },
        },
        required: ['jobDate', 'jobTypeId'],
    },
    handler: async (client, args) => {
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null && v !== '') {
                if (k === 'jobDate')
                    data[k] = parseDateArg(String(v));
                // Accept 'ticketNumber' as an alias for 'ticketIds' (from OCR pipeline)
                else if (k === 'ticketNumber')
                    data['ticketIds'] = v;
                else
                    data[k] = v;
            }
        }
        const job = await client.jobs.create(data);
        return `Job created successfully:\n${json(job)}`;
    },
};
const update_job = {
    name: 'update_job',
    description: 'Update an existing job. Use for "change end time", "update job amount", etc.',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Job ID to update.' },
            jobDate: { type: 'string', description: 'New job date.' },
            jobTypeId: { type: 'string', description: 'New job type ID.' },
            driverId: { type: 'string', description: 'New driver ID.' },
            dispatcherId: { type: 'string', description: 'New dispatcher ID.' },
            unitId: { type: 'string', description: 'New unit ID.' },
            startTime: { type: 'string', description: 'New start time.' },
            endTime: { type: 'string', description: 'New end time.' },
            amount: { type: 'number', description: 'New amount.' },
            weight: { type: 'string', description: 'New weight.' },
            loads: { type: 'number', description: 'New loads count.' },
            jobPaid: { type: 'boolean', description: 'Mark job as paid/received from client.' },
            driverPaid: { type: 'boolean', description: 'Mark driver as paid for this job.' },
            notes: { type: 'string', description: 'Job notes.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        const id = String(args.id);
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (k !== 'id' && v !== undefined && v !== null && v !== '') {
                if (k === 'jobDate')
                    data[k] = parseDateArg(String(v));
                else
                    data[k] = v;
            }
        }
        const job = await client.jobs.update(id, data);
        return `Job updated successfully:\n${json(job)}`;
    },
};
const create_job_type = {
    name: 'create_job_type',
    description: 'Create a new job type for a company. A job type encodes a recurring haul: route (start → end), how it bills (hourly / per-load / per-ton / fixed), and the rate. The agent should ask the user for any of these that are missing before calling this tool.',
    inputSchema: {
        type: 'object',
        properties: {
            companyId: { type: 'string', description: 'Company ID this job type belongs to.' },
            title: { type: 'string', description: 'Job type title. Convention: "Company - Start → End - Rate" (e.g. "Van-Bree - Richmond ⇄ Talbot - $85/hr").' },
            startLocation: { type: 'string', description: 'Default haul-from / origin for jobs of this type (e.g. "2300 Richmond Street").' },
            endLocation: { type: 'string', description: 'Default haul-to / destination for jobs of this type (e.g. "Talbot Village").' },
            dispatchType: {
                type: 'string',
                enum: ['hourly', 'load', 'tonnage', 'fixed'],
                description: 'How this job type bills. "hourly" = $/hour (ticket has Total Hours); "load" = $/load (ticket has Loads count); "tonnage" = $/ton (ticket has Weight/Tons); "fixed" = flat amount per job.',
            },
            rateOfJob: { type: 'number', description: 'Rate per unit implied by dispatchType (e.g. 85 for $85/hr when hourly). Omit or set to null only if the user explicitly says the rate is not yet known (rate pending).' },
        },
        required: ['companyId', 'title', 'startLocation', 'endLocation', 'dispatchType', 'rateOfJob'],
    },
    handler: async (client, args) => {
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const jt = await client.jobTypes.create(data);
        return `Job type created successfully:\n${json(jt)}`;
    },
};
const update_job_type = {
    name: 'update_job_type',
    description: 'Update an existing job type. When setting a rate on a previously rate-pending job type, this will also backfill amounts for existing jobs.',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Job type ID to update.' },
            title: { type: 'string', description: 'New title for the job type.' },
            rateOfJob: { type: 'number', description: 'Rate for the job type. Set to null to mark as rate pending.' },
            dispatchType: { type: 'string', description: 'How dispatch works for this type.' },
            startLocation: { type: 'string', description: 'Default start location.' },
            endLocation: { type: 'string', description: 'Default end location.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        const { id, ...rest } = args;
        const data = {};
        for (const [k, v] of Object.entries(rest)) {
            if (v !== undefined) {
                // Allow null for rateOfJob (to clear the rate)
                if (k === 'rateOfJob' && v === null) {
                    data[k] = null;
                }
                else if (v !== null && v !== '') {
                    data[k] = v;
                }
            }
        }
        const jt = await client.jobTypes.update(String(id), data);
        return `Job type updated successfully:\n${json(jt)}`;
    },
};
const create_driver = {
    name: 'create_driver',
    description: 'Create a new driver. The agent should ask the user for every field below, one focused question at a time, before calling this tool. Only "name" is hard-required by the server, but a complete record needs payType + rate.',
    inputSchema: {
        type: 'object',
        properties: {
            name: { type: 'string', description: 'Driver full name. ASK the user.' },
            description: { type: 'string', description: 'Free-form notes about the driver. ASK the user; OK to skip if they have no notes.' },
            email: { type: 'string', description: 'Email address. ASK the user.' },
            phone: { type: 'string', description: 'Phone number. ASK the user.' },
            payType: { type: 'string', enum: ['HOURLY', 'PERCENTAGE', 'CUSTOM'], description: 'How this driver is paid. ASK the user. "HOURLY" = paid an hourly rate; "PERCENTAGE" = paid a % of job revenue; "CUSTOM" = per-job custom amounts.' },
            hourlyRate: { type: 'number', description: 'Dollars per hour. ASK only when payType = HOURLY.' },
            percentageRate: { type: 'number', description: 'Percent of job revenue (e.g. 30 for 30%). ASK only when payType = PERCENTAGE.' },
        },
        required: ['name'],
    },
    handler: async (client, args) => {
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const driver = await client.drivers.create(data);
        return `Driver created successfully:\n${json(driver)}`;
    },
};
const create_company = {
    name: 'create_company',
    description: 'Create a new company (a customer / bill-to / client). The agent should ask the user for every field below, one focused question at a time, before calling this tool.',
    inputSchema: {
        type: 'object',
        properties: {
            name: { type: 'string', description: 'Company name. ASK the user.' },
            description: { type: 'string', description: 'Free-form notes about the company. ASK; OK to skip.' },
            website: { type: 'string', description: 'Company website URL. ASK.' },
            industry: { type: 'string', description: 'Industry (e.g. "Construction", "Aggregates"). ASK.' },
            location: { type: 'string', description: 'Primary address or city/region the company operates from. ASK.' },
            size: { type: 'string', description: 'Company size descriptor (e.g. "Small", "10-50 employees"). ASK.' },
            founded: { type: 'number', description: 'Year founded (e.g. 1998). ASK.' },
            email: { type: 'string', description: 'Primary contact email. ASK.' },
            phone: { type: 'string', description: 'Primary contact phone. ASK.' },
        },
        required: ['name'],
    },
    handler: async (client, args) => {
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const company = await client.companies.create(data);
        return `Company created successfully:\n${json(company)}`;
    },
};
const create_dispatcher = {
    name: 'create_dispatcher',
    description: 'Create a new dispatcher (a trucking company / hauler that 5Rivers works with). The agent should ask the user for every field below, one focused question at a time, before calling this tool.',
    inputSchema: {
        type: 'object',
        properties: {
            name: { type: 'string', description: 'Dispatcher / trucking company name. ASK the user.' },
            description: { type: 'string', description: 'Free-form notes about the dispatcher. ASK; OK to skip.' },
            email: { type: 'string', description: 'Primary contact email. ASK.' },
            phone: { type: 'string', description: 'Primary contact phone. ASK.' },
            commissionPercent: { type: 'number', description: 'Commission % this dispatcher takes from each dispatched job (e.g. 10 for 10%). ASK.' },
        },
        required: ['name'],
    },
    handler: async (client, args) => {
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const d = await client.dispatchers.create(data);
        return `Dispatcher created successfully:\n${json(d)}`;
    },
};
const create_unit = {
    name: 'create_unit',
    description: 'Create a new unit (truck/vehicle). The agent should ask the user for every field below, one focused question at a time, before calling this tool.',
    inputSchema: {
        type: 'object',
        properties: {
            name: { type: 'string', description: 'Unit name / truck number (e.g. "T-105", "52"). ASK the user.' },
            description: { type: 'string', description: 'Free-form notes about the unit. ASK; OK to skip.' },
            color: { type: 'string', description: 'Color of the truck. ASK.' },
            plateNumber: { type: 'string', description: 'License plate number. ASK.' },
            vin: { type: 'string', description: 'Vehicle Identification Number (17 chars). ASK.' },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'RETIRED'], description: 'Operational status. ASK; default to ACTIVE for new units in service.' },
            year: { type: 'number', description: 'Model year (e.g. 2022). ASK.' },
            make: { type: 'string', description: 'Manufacturer (e.g. "Peterbilt", "Kenworth"). ASK.' },
            model: { type: 'string', description: 'Model designation (e.g. "579", "T880"). ASK.' },
            mileage: { type: 'number', description: 'Current odometer reading. ASK.' },
            insuranceExpiry: { type: 'string', description: 'Insurance expiry date (YYYY-MM-DD). ASK.' },
            lastMaintenanceDate: { type: 'string', description: 'Last maintenance date (YYYY-MM-DD). ASK.' },
            nextMaintenanceDate: { type: 'string', description: 'Next scheduled maintenance date (YYYY-MM-DD). ASK.' },
        },
        required: ['name'],
    },
    handler: async (client, args) => {
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const unit = await client.units.create(data);
        return `Unit created successfully:\n${json(unit)}`;
    },
};
const create_carrier = {
    name: 'create_carrier',
    description: 'Create a new carrier (a third-party trucking provider 5Rivers brokers loads to). The agent should ask the user for every field below, one focused question at a time, before calling this tool.',
    inputSchema: {
        type: 'object',
        properties: {
            name: { type: 'string', description: 'Carrier name. ASK the user.' },
            description: { type: 'string', description: 'Free-form notes about the carrier. ASK; OK to skip.' },
            contactPerson: { type: 'string', description: 'Primary contact at the carrier. ASK.' },
            email: { type: 'string', description: 'Primary contact email. ASK.' },
            phone: { type: 'string', description: 'Primary contact phone. ASK.' },
            rateType: { type: 'string', enum: ['PERCENTAGE', 'FLAT_PER_JOB', 'FLAT_PER_LOAD', 'FLAT_PER_TON', 'HOURLY'], description: 'How this carrier bills 5Rivers. ASK.' },
            rate: { type: 'number', description: 'Rate per the unit implied by rateType (e.g. 15 = 15% if PERCENTAGE; 250 = $250/job if FLAT_PER_JOB). ASK.' },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], description: 'Carrier status. ASK; default ACTIVE for a carrier currently being onboarded.' },
        },
        required: ['name'],
    },
    handler: async (client, args) => {
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const c = await client.carriers.create(data);
        return `Carrier created successfully:\n${json(c)}`;
    },
};
const create_expense = {
    name: 'create_expense',
    description: 'Create a new expense. Use for "add expense $500 truck maintenance today", "add recurring monthly expense $1200 office rent".',
    inputSchema: {
        type: 'object',
        properties: {
            description: { type: 'string', description: 'Expense description.' },
            amount: { type: 'number', description: 'Amount in dollars.' },
            expenseDate: { type: 'string', description: 'Expense date (YYYY-MM-DD).' },
            categoryId: { type: 'string', description: 'Expense category ID.' },
            vendor: { type: 'string', description: 'Vendor/payee name.' },
            paymentMethod: { type: 'string', enum: ['CASH', 'CHECK', 'BANK_TRANSFER', 'E_TRANSFER', 'CREDIT_CARD', 'OTHER'], description: 'Payment method.' },
            reference: { type: 'string', description: 'Reference number.' },
            notes: { type: 'string', description: 'Additional notes.' },
            recurring: { type: 'boolean', description: 'Is this a recurring expense?' },
            recurringFrequency: { type: 'string', enum: ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'], description: 'Recurrence frequency.' },
        },
        required: ['description', 'amount', 'expenseDate'],
    },
    handler: async (client, args) => {
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null && v !== '') {
                if (k === 'expenseDate')
                    data[k] = parseDateArg(String(v));
                else
                    data[k] = v;
            }
        }
        const expense = await client.expenses.create(data);
        return `Expense created successfully:\n${json(expense)}`;
    },
};
const create_expense_category = {
    name: 'create_expense_category',
    description: 'Create a new expense category. Use for "create category Insurance", "add expense category Fuel".',
    inputSchema: {
        type: 'object',
        properties: {
            name: { type: 'string', description: 'Category name.' },
            description: { type: 'string', description: 'Category description.' },
            color: { type: 'string', description: 'Color hex code (e.g. #3B82F6).' },
        },
        required: ['name'],
    },
    handler: async (client, args) => {
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const cat = await client.expenseCategories.create(data);
        return `Expense category created successfully:\n${json(cat)}`;
    },
};
const create_invoice = {
    name: 'create_invoice',
    description: 'Create a new invoice. Use for "create invoice for dispatcher Mike dated today".',
    inputSchema: {
        type: 'object',
        properties: {
            invoiceDate: { type: 'string', description: 'Invoice date (YYYY-MM-DD).' },
            dispatcherId: { type: 'string', description: 'Dispatcher ID (required if not companyId).' },
            companyId: { type: 'string', description: 'Company ID (required if not dispatcherId).' },
            notes: { type: 'string', description: 'Invoice notes.' },
        },
        required: ['invoiceDate'],
    },
    handler: async (client, args) => {
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null && v !== '') {
                if (k === 'invoiceDate')
                    data[k] = parseDateArg(String(v));
                else
                    data[k] = v;
            }
        }
        const inv = await client.invoices.create(data);
        return `Invoice created successfully:\n${json(inv)}`;
    },
};
// ── Update tools ────────────────────────────────────────────
const update_invoice = {
    name: 'update_invoice',
    description: 'Update invoice details such as date, notes, or status. Status flow: CREATED → RAISED → RECEIVED. Prefer mark_invoice_received for marking payment received.',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Invoice ID.' },
            status: { type: 'string', enum: ['CREATED', 'RAISED', 'RECEIVED'], description: 'Invoice status. RECEIVED = payment received from client, automatically marks linked jobs as paid.' },
            invoiceDate: { type: 'string', description: 'Invoice date (YYYY-MM-DD).' },
            dueDate: { type: 'string', description: 'Due date (YYYY-MM-DD).' },
            notes: { type: 'string', description: 'Invoice notes.' },
            paidAt: { type: 'string', description: 'Date payment was received (YYYY-MM-DD).' },
            paidAmount: { type: 'number', description: 'Amount paid.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        const { id, ...rest } = args;
        const data = {};
        for (const [k, v] of Object.entries(rest)) {
            if (v !== undefined && v !== null && v !== '') {
                if (k === 'invoiceDate' || k === 'dueDate' || k === 'paidAt')
                    data[k] = parseDateArg(String(v));
                else
                    data[k] = v;
            }
        }
        const inv = await client.invoices.update(String(id), data);
        return `Invoice updated successfully:\n${json(inv)}`;
    },
};
const delete_invoice = {
    name: 'delete_invoice',
    description: 'Delete an invoice by ID. Use with caution.',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Invoice ID to delete.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        await client.invoices.delete(String(args.id));
        return `Invoice ${args.id} deleted successfully.`;
    },
};
const get_invoice = {
    name: 'get_invoice',
    description: 'Get full details of a single invoice by ID, including line items and status.',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Invoice ID.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        const inv = await client.invoices.get(String(args.id));
        return json(inv);
    },
};
const update_driver = {
    name: 'update_driver',
    description: 'Update a driver\'s details. Use for "update driver phone number", "mark driver as inactive".',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Driver ID.' },
            name: { type: 'string', description: 'Full name.' },
            phone: { type: 'string', description: 'Phone number.' },
            email: { type: 'string', description: 'Email address.' },
            licenseNumber: { type: 'string', description: 'License number.' },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], description: 'Driver status.' },
            notes: { type: 'string', description: 'Notes.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        const { id, ...rest } = args;
        const data = {};
        for (const [k, v] of Object.entries(rest)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const driver = await client.drivers.update(String(id), data);
        return `Driver updated successfully:\n${json(driver)}`;
    },
};
const update_company = {
    name: 'update_company',
    description: 'Update a company\'s details. Use for "update company address", "change company contact".',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Company ID.' },
            name: { type: 'string', description: 'Company name.' },
            phone: { type: 'string', description: 'Phone number.' },
            email: { type: 'string', description: 'Email address.' },
            address: { type: 'string', description: 'Address.' },
            notes: { type: 'string', description: 'Notes.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        const { id, ...rest } = args;
        const data = {};
        for (const [k, v] of Object.entries(rest)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const company = await client.companies.update(String(id), data);
        return `Company updated successfully:\n${json(company)}`;
    },
};
const update_unit = {
    name: 'update_unit',
    description: 'Update a unit (truck/trailer). Use for "update unit status", "change unit plate number".',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Unit ID.' },
            name: { type: 'string', description: 'Unit name/number.' },
            plateNumber: { type: 'string', description: 'Plate number.' },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'], description: 'Unit status.' },
            notes: { type: 'string', description: 'Notes.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        const { id, ...rest } = args;
        const data = {};
        for (const [k, v] of Object.entries(rest)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const unit = await client.units.update(String(id), data);
        return `Unit updated successfully:\n${json(unit)}`;
    },
};
const update_carrier = {
    name: 'update_carrier',
    description: 'Update a carrier\'s details.',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Carrier ID.' },
            name: { type: 'string', description: 'Carrier name.' },
            phone: { type: 'string', description: 'Phone number.' },
            email: { type: 'string', description: 'Email address.' },
            notes: { type: 'string', description: 'Notes.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        const { id, ...rest } = args;
        const data = {};
        for (const [k, v] of Object.entries(rest)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const carrier = await client.carriers.update(String(id), data);
        return `Carrier updated successfully:\n${json(carrier)}`;
    },
};
const update_dispatcher = {
    name: 'update_dispatcher',
    description: 'Update a dispatcher\'s details.',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Dispatcher ID.' },
            name: { type: 'string', description: 'Full name.' },
            phone: { type: 'string', description: 'Phone number.' },
            email: { type: 'string', description: 'Email address.' },
            notes: { type: 'string', description: 'Notes.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        const { id, ...rest } = args;
        const data = {};
        for (const [k, v] of Object.entries(rest)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const dispatcher = await client.dispatchers.update(String(id), data);
        return `Dispatcher updated successfully:\n${json(dispatcher)}`;
    },
};
const delete_job = {
    name: 'delete_job',
    description: 'Delete a job by ID. Use with caution — this is permanent.',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Job ID to delete.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        await client.jobs.delete(String(args.id));
        return `Job ${args.id} deleted successfully.`;
    },
};
// ── Driver payments ──────────────────────────────────────────
const list_driver_payments = {
    name: 'list_driver_payments',
    description: 'List driver payments. Use for "show driver payments", "payments for driver Dinesh", "unpaid driver amounts".',
    inputSchema: {
        type: 'object',
        properties: {
            driverId: { type: 'string', description: 'Filter by driver ID.' },
            status: { type: 'string', enum: ['PENDING', 'PAID'], description: 'Filter by payment status.' },
            dateFrom: { type: 'string', description: 'Start date YYYY-MM-DD.' },
            dateTo: { type: 'string', description: 'End date YYYY-MM-DD.' },
            page: { type: 'number', description: 'Page number.' },
            limit: { type: 'number', description: 'Results per page (default 50).' },
        },
    },
    handler: async (client, args) => {
        const filters = {};
        if (args.driverId)
            filters.driverId = String(args.driverId);
        if (args.status)
            filters.status = String(args.status);
        if (args.dateFrom)
            filters.dateFrom = String(args.dateFrom);
        if (args.dateTo)
            filters.dateTo = String(args.dateTo);
        const result = await client.driverPayments.list({
            page: args.page ? Number(args.page) : 1,
            limit: args.limit ? Number(args.limit) : 50,
            filters,
        });
        if (result.data.length === 0)
            return 'No driver payments found.';
        return json({ total: result.total, page: result.page, totalPages: result.totalPages, payments: result.data });
    },
};
const create_driver_payment = {
    name: 'create_driver_payment',
    description: 'Record a payment made to a driver. Use for "pay driver Dinesh $500", "record e-transfer payment to John $800".',
    inputSchema: {
        type: 'object',
        properties: {
            driverId: { type: 'string', description: 'Driver ID.' },
            amount: { type: 'number', description: 'Payment amount.' },
            paymentDate: { type: 'string', description: 'Payment date (YYYY-MM-DD).' },
            paymentMethod: { type: 'string', enum: ['CASH', 'CHECK', 'BANK_TRANSFER', 'E_TRANSFER', 'CREDIT_CARD', 'OTHER'], description: 'Payment method.' },
            reference: { type: 'string', description: 'Reference number or cheque number.' },
            notes: { type: 'string', description: 'Notes about this payment.' },
        },
        required: ['driverId', 'amount', 'paymentDate'],
    },
    handler: async (client, args) => {
        const data = {};
        for (const [k, v] of Object.entries(args)) {
            if (v !== undefined && v !== null && v !== '') {
                if (k === 'paymentDate')
                    data[k] = parseDateArg(String(v));
                else
                    data[k] = v;
            }
        }
        const payment = await client.driverPayments.create(data);
        return `Driver payment recorded successfully:\n${json(payment)}`;
    },
};
// ── Job driver pay ───────────────────────────────────────────
const get_job_driver_pay = {
    name: 'get_job_driver_pay',
    description: 'Get the driver pay details for a specific job. Use for "what is the driver pay for job X", "show driver pay breakdown for job".',
    inputSchema: {
        type: 'object',
        properties: {
            jobId: { type: 'string', description: 'Job ID.' },
        },
        required: ['jobId'],
    },
    handler: async (client, args) => {
        const pay = await client.jobDriverPay.get(String(args.jobId));
        return json(pay);
    },
};
const set_job_driver_pay = {
    name: 'set_job_driver_pay',
    description: 'Set or update the driver pay for a specific job. Use for "set driver pay for job X to $250", "update driver pay percentage".',
    inputSchema: {
        type: 'object',
        properties: {
            jobId: { type: 'string', description: 'Job ID.' },
            payType: { type: 'string', enum: ['FIXED', 'PERCENTAGE', 'PER_HOUR', 'PER_MILE'], description: 'Pay calculation type.' },
            amount: { type: 'number', description: 'Fixed amount or percentage value.' },
            notes: { type: 'string', description: 'Notes.' },
        },
        required: ['jobId', 'payType', 'amount'],
    },
    handler: async (client, args) => {
        const { jobId, ...rest } = args;
        const data = {};
        for (const [k, v] of Object.entries(rest)) {
            if (v !== undefined && v !== null && v !== '')
                data[k] = v;
        }
        const pay = await client.jobDriverPay.set(String(jobId), data);
        return `Driver pay set successfully:\n${json(pay)}`;
    },
};
// ── Invoice job management ───────────────────────────────────
const get_next_invoice_number = {
    name: 'get_next_invoice_number',
    description: 'Get the next available invoice number. Use before creating an invoice to get the auto-generated number.',
    inputSchema: { type: 'object', properties: {} },
    handler: async (client) => {
        const result = await client.invoiceExtras.nextNumber();
        return `Next invoice number: ${result.nextNumber}`;
    },
};
const get_invoice_jobs = {
    name: 'get_invoice_jobs',
    description: 'Get all jobs attached to an invoice. Use for "show jobs on invoice INV-001".',
    inputSchema: {
        type: 'object',
        properties: {
            invoiceId: { type: 'string', description: 'Invoice ID.' },
        },
        required: ['invoiceId'],
    },
    handler: async (client, args) => {
        const jobs = await client.invoiceExtras.getJobs(String(args.invoiceId));
        if (!jobs || (Array.isArray(jobs) && jobs.length === 0))
            return 'No jobs attached to this invoice.';
        return json(jobs);
    },
};
const add_job_to_invoice = {
    name: 'add_job_to_invoice',
    description: 'Add a job to an invoice. Use for "add job X to invoice Y", "attach job to invoice".',
    inputSchema: {
        type: 'object',
        properties: {
            invoiceId: { type: 'string', description: 'Invoice ID.' },
            jobId: { type: 'string', description: 'Job ID to add.' },
            amount: { type: 'number', description: 'Override amount for this job on the invoice.' },
        },
        required: ['invoiceId', 'jobId'],
    },
    handler: async (client, args) => {
        const data = { jobId: args.jobId };
        if (args.amount)
            data.amount = args.amount;
        const result = await client.invoiceExtras.addJob(String(args.invoiceId), data);
        return `Job added to invoice successfully:\n${json(result)}`;
    },
};
const remove_job_from_invoice = {
    name: 'remove_job_from_invoice',
    description: 'Remove a job from an invoice.',
    inputSchema: {
        type: 'object',
        properties: {
            invoiceId: { type: 'string', description: 'Invoice ID.' },
            jobId: { type: 'string', description: 'Job ID to remove.' },
        },
        required: ['invoiceId', 'jobId'],
    },
    handler: async (client, args) => {
        await client.invoiceExtras.removeJob(String(args.invoiceId), String(args.jobId));
        return `Job ${args.jobId} removed from invoice ${args.invoiceId} successfully.`;
    },
};
// ── Analytics tools ──────────────────────────────────────────
const get_revenue_by_company = {
    name: 'get_revenue_by_company',
    description: 'Get revenue breakdown by company. Use for "which company generates the most revenue", "revenue by company this month".',
    inputSchema: {
        type: 'object',
        properties: {
            startDate: { type: 'string', description: 'Start date YYYY-MM-DD.' },
            endDate: { type: 'string', description: 'End date YYYY-MM-DD.' },
        },
    },
    handler: async (client, args) => {
        const data = await client.analytics.revenueByCompany(args.startDate ? String(args.startDate) : undefined, args.endDate ? String(args.endDate) : undefined);
        return json(data);
    },
};
const get_revenue_by_driver = {
    name: 'get_revenue_by_driver',
    description: 'Get revenue breakdown by driver. Use for "how much did each driver earn", "top earning drivers this month".',
    inputSchema: {
        type: 'object',
        properties: {
            startDate: { type: 'string', description: 'Start date YYYY-MM-DD.' },
            endDate: { type: 'string', description: 'End date YYYY-MM-DD.' },
        },
    },
    handler: async (client, args) => {
        const data = await client.analytics.revenueByDriver(args.startDate ? String(args.startDate) : undefined, args.endDate ? String(args.endDate) : undefined);
        return json(data);
    },
};
const get_payment_status_summary = {
    name: 'get_payment_status_summary',
    description: 'Get summary of invoice payment statuses — how many are paid, pending, overdue. Use for "how many unpaid invoices do we have", "payment status overview".',
    inputSchema: {
        type: 'object',
        properties: {
            startDate: { type: 'string', description: 'Start date YYYY-MM-DD.' },
            endDate: { type: 'string', description: 'End date YYYY-MM-DD.' },
        },
    },
    handler: async (client, args) => {
        const data = await client.analytics.paymentStatus(args.startDate ? String(args.startDate) : undefined, args.endDate ? String(args.endDate) : undefined);
        return json(data);
    },
};
const get_top_job_types = {
    name: 'get_top_job_types',
    description: 'Get top job types by volume or revenue. Use for "what are our most common job types", "top job types this quarter".',
    inputSchema: {
        type: 'object',
        properties: {
            startDate: { type: 'string', description: 'Start date YYYY-MM-DD.' },
            endDate: { type: 'string', description: 'End date YYYY-MM-DD.' },
            limit: { type: 'number', description: 'Number of results (default 10).' },
        },
    },
    handler: async (client, args) => {
        const data = await client.analytics.topJobTypes(args.startDate ? String(args.startDate) : undefined, args.endDate ? String(args.endDate) : undefined, args.limit ? Number(args.limit) : undefined);
        return json(data);
    },
};
const get_monthly_revenue = {
    name: 'get_monthly_revenue',
    description: 'Get monthly revenue trend. Use for "show revenue by month", "monthly revenue for the last 6 months".',
    inputSchema: {
        type: 'object',
        properties: {
            months: { type: 'number', description: 'Number of months to look back (default 12).' },
        },
    },
    handler: async (client, args) => {
        const data = await client.analytics.monthlyRevenue(args.months ? Number(args.months) : undefined);
        return json(data);
    },
};
const get_update_expense = {
    name: 'update_expense',
    description: 'Update an existing expense. Use for "correct expense amount", "update expense category".',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Expense ID.' },
            description: { type: 'string', description: 'Expense description.' },
            amount: { type: 'number', description: 'Amount in dollars.' },
            expenseDate: { type: 'string', description: 'Expense date (YYYY-MM-DD).' },
            categoryId: { type: 'string', description: 'Expense category ID.' },
            vendor: { type: 'string', description: 'Vendor/payee name.' },
            paymentMethod: { type: 'string', enum: ['CASH', 'CHECK', 'BANK_TRANSFER', 'E_TRANSFER', 'CREDIT_CARD', 'OTHER'], description: 'Payment method.' },
            notes: { type: 'string', description: 'Notes.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        const { id, ...rest } = args;
        const data = {};
        for (const [k, v] of Object.entries(rest)) {
            if (v !== undefined && v !== null && v !== '') {
                if (k === 'expenseDate')
                    data[k] = parseDateArg(String(v));
                else
                    data[k] = v;
            }
        }
        const expense = await client.expenses.update(String(id), data);
        return `Expense updated successfully:\n${json(expense)}`;
    },
};
const login = {
    name: 'login',
    description: 'Authenticate with the 5Rivers API. Returns a token that must be passed to all other tools as the "token" parameter.',
    inputSchema: {
        type: 'object',
        properties: {
            email: { type: 'string', description: 'Your 5Rivers account email.' },
            password: { type: 'string', description: 'Your password.' },
            organizationSlug: { type: 'string', description: 'Your organization slug (e.g. "5rivers").' },
        },
        required: ['email', 'password', 'organizationSlug'],
    },
    handler: async (client, args) => {
        const result = await client.login(String(args.email), String(args.password), String(args.organizationSlug));
        return `Login successful. Use this token for all subsequent tool calls:\n\ntoken: ${result.token}\n\nUser: ${json(result.user)}`;
    },
};
// ── Dedicated paid/received shortcuts ───────────────────────
const mark_job_paid = {
    name: 'mark_job_paid',
    description: 'Mark a job as paid by the client (jobPaid) or mark driver as paid (driverPaid). Use for "mark job paid", "job received payment", "mark driver paid for job 123".',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Job ID.' },
            jobPaid: { type: 'boolean', description: 'Set true to mark payment received from client for this job.' },
            driverPaid: { type: 'boolean', description: 'Set true to mark driver as paid for this job.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        const id = String(args.id);
        const data = {};
        if (args.jobPaid !== undefined)
            data.jobPaid = args.jobPaid;
        if (args.driverPaid !== undefined)
            data.driverPaid = args.driverPaid;
        if (Object.keys(data).length === 0)
            data.jobPaid = true; // default: mark job paid
        const job = await client.jobs.update(id, data);
        const flags = [data.jobPaid !== undefined ? `jobPaid=${data.jobPaid}` : '', data.driverPaid !== undefined ? `driverPaid=${data.driverPaid}` : ''].filter(Boolean).join(', ');
        return `Job ${id} updated (${flags}):\n${json(job)}`;
    },
};
/**
 * Paystub helper — finds the right job and marks it paid in one atomic step.
 * The model only needs values it read from the image; it never has to
 * remember a UUID from a previous tool result.
 */
const mark_job_paid_by_date = {
    name: 'mark_job_paid_by_date',
    description: 'Find a job by work date + dispatcher, verify the paid amount is within tolerance, then mark it as received (jobPaid=true). ' +
        'Use this for paystub processing — one call per line item. Pass the date and paidAmount directly from the paystub image and the dispatcherId from list_dispatchers. ' +
        'Returns full details of what was matched and marked, or a clear reason why it could not be matched.',
    inputSchema: {
        type: 'object',
        properties: {
            date: {
                type: 'string',
                description: 'Date of work as shown on the paystub (YYYY-MM-DD or any readable date).',
            },
            dispatcherId: {
                type: 'string',
                description: 'Dispatcher UUID from list_dispatchers — the company that issued the paystub.',
            },
            paidAmount: {
                type: 'number',
                description: 'Dollar amount shown on the paystub for this line item.',
            },
            tolerancePercent: {
                type: 'number',
                description: 'Max allowed variance % between system amount and paid amount before flagging for review (default 10).',
                default: 10,
            },
        },
        required: ['date', 'dispatcherId', 'paidAmount'],
    },
    handler: async (client, args) => {
        const date = parseDateArg(String(args.date));
        const dispatcherId = String(args.dispatcherId);
        const paidAmount = Number(args.paidAmount);
        const tolerance = Number(args.tolerancePercent ?? 10);
        // 1. Look up jobs for this date + dispatcher
        const result = await client.jobs.list({
            page: 1,
            limit: 100,
            filters: { jobDate: date, dispatcherId },
        });
        if (!result.data || result.data.length === 0) {
            return `NOT FOUND: No jobs on ${date} for dispatcher ${dispatcherId}.`;
        }
        // 2. Find the best amount match
        let bestJob = null;
        let bestVariance = Infinity;
        for (const job of result.data) {
            if (job['amount'] == null)
                continue;
            const variance = Math.abs(paidAmount - Number(job['amount'])) / Number(job['amount']) * 100;
            if (variance < bestVariance) {
                bestVariance = variance;
                bestJob = job;
            }
        }
        if (bestJob === null) {
            const ids = result.data.map((j) => `${j['id']} (amount: ${j['amount'] ?? 'unset'})`).join(', ');
            return `NO AMOUNT: Found ${result.data.length} job(s) on ${date} for this dispatcher but none have an amount set. Jobs: ${ids}`;
        }
        const jobId = String(bestJob['id']);
        const jobDate = String(bestJob['jobDate'] ?? date);
        const jobAmount = bestJob['amount'];
        // 3. Check tolerance
        if (bestVariance > tolerance) {
            return (`FLAGGED: Best match on ${date} is job ${jobId} ` +
                `(system: $${jobAmount}, paid: $${paidAmount}, variance: ${bestVariance.toFixed(1)}% > ${tolerance}%). ` +
                `NOT marked — needs manual review.`);
        }
        // 4. Already paid?
        if (bestJob['jobPaid']) {
            return (`ALREADY PAID: Job ${jobId} on ${jobDate} (system: $${jobAmount}) ` +
                `was already marked as received. No change made.`);
        }
        // 5. Mark as received
        await client.jobs.update(jobId, { jobPaid: true });
        return (`✅ MARKED: Job ${jobId} | date: ${jobDate} | ` +
            `system: $${jobAmount} | paid: $${paidAmount} | variance: ${bestVariance.toFixed(1)}%`);
    },
};
const mark_invoice_received = {
    name: 'mark_invoice_received',
    description: 'Mark an invoice as received (payment collected from client). Use for "mark invoice received", "invoice paid", "we got paid for invoice 42". Automatically marks all linked jobs as paid.',
    inputSchema: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Invoice ID.' },
            paidAt: { type: 'string', description: 'Date payment was received (YYYY-MM-DD). Defaults to today.' },
            paidAmount: { type: 'number', description: 'Amount received. Optional.' },
        },
        required: ['id'],
    },
    handler: async (client, args) => {
        const id = String(args.id);
        const data = { status: 'RECEIVED' };
        if (args.paidAt)
            data.paidAt = parseDateArg(String(args.paidAt));
        if (args.paidAmount)
            data.paidAmount = args.paidAmount;
        const inv = await client.invoices.update(id, data);
        return `Invoice ${id} marked as RECEIVED:\n${json(inv)}`;
    },
};
// ── Export all tools ────────────────────────────────────────
export const ALL_TOOLS = [
    // Read
    list_jobs,
    get_job,
    search_jobs,
    get_dashboard_stats,
    list_invoices,
    get_invoice,
    list_drivers,
    list_companies,
    list_dispatchers,
    list_units,
    list_carriers,
    list_job_types,
    list_expenses,
    list_expense_categories,
    get_monthly_profit,
    get_expenses_by_category,
    get_monthly_revenue,
    get_revenue_by_company,
    get_revenue_by_driver,
    get_payment_status_summary,
    get_top_job_types,
    // Write / Update
    create_job,
    update_job,
    delete_job,
    create_job_type,
    update_job_type,
    create_driver,
    update_driver,
    create_company,
    update_company,
    create_dispatcher,
    update_dispatcher,
    create_unit,
    update_unit,
    create_carrier,
    update_carrier,
    create_expense,
    get_update_expense,
    create_expense_category,
    create_invoice,
    update_invoice,
    delete_invoice,
    mark_job_paid,
    mark_job_paid_by_date,
    mark_invoice_received,
    // Invoice management
    get_next_invoice_number,
    get_invoice_jobs,
    add_job_to_invoice,
    remove_job_from_invoice,
    // Driver payments
    list_driver_payments,
    create_driver_payment,
    get_job_driver_pay,
    set_job_driver_pay,
    // Auth
    login,
];
