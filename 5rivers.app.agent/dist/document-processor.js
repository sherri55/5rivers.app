import { ALL_TOOLS } from '../../5rivers.app.mcp/dist/tools.js';
// ─── Tool calling helpers ────────────────────────────────────────────────────
async function callTool(client, toolName, args) {
    const def = ALL_TOOLS.find((t) => t.name === toolName);
    if (!def)
        return { result: `Error: Unknown tool "${toolName}"`, status: 'error' };
    try {
        const result = await def.handler(client, args);
        console.log(`[doc-proc] ${toolName}(${JSON.stringify(args).slice(0, 100)}) → ${result.slice(0, 200)}`);
        return { result, status: 'success' };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[doc-proc] ${toolName} error: ${msg}`);
        return { result: `Error: ${msg}`, status: 'error' };
    }
}
/**
 * Parse the text output of formatFuzzyResult() into a usable id+name,
 * or null if nothing matched.
 */
function parseUseIdFromResult(result) {
    // USE_ID: <uuid>  /  NAME: <name>
    const idMatch = result.match(/^USE_ID:\s*(.+)$/m);
    const nameMatch = result.match(/^NAME:\s*(.+)$/m);
    if (idMatch) {
        return { id: idMatch[1].trim(), name: nameMatch?.[1]?.trim() ?? '' };
    }
    // MULTIPLE_MATCHES — take the first entry:  "  1. Some Name  (id: <uuid>)"
    const multiMatch = result.match(/^\s*1\.\s*(.+?)\s*\(id:\s*([^)]+)\)/m);
    if (multiMatch) {
        return { id: multiMatch[2].trim(), name: multiMatch[1].trim() };
    }
    return null;
}
function parseMarkResult(raw) {
    if (raw.startsWith('✅ MARKED:')) {
        const jobId = raw.match(/Job\s+(\S+)/)?.[1];
        const jobDate = raw.match(/date:\s*(\S+)/)?.[1];
        const system = raw.match(/system:\s*\$?([\d,.]+)/)?.[1];
        const variance = raw.match(/variance:\s*([\d.]+%)/)?.[1];
        return { status: 'marked', jobId, jobDate, systemAmount: system, variance, raw };
    }
    if (raw.startsWith('FLAGGED:'))
        return { status: 'flagged', raw };
    if (raw.startsWith('NOT FOUND:'))
        return { status: 'not_found', raw };
    if (raw.startsWith('ALREADY PAID:'))
        return { status: 'already_paid', raw };
    if (raw.startsWith('NO AMOUNT:'))
        return { status: 'no_amount', raw };
    return { status: 'error', raw };
}
function statusEmoji(s) {
    switch (s) {
        case 'marked': return '✅';
        case 'flagged': return '⚠️';
        case 'not_found': return '❌';
        case 'already_paid': return '🔵';
        case 'no_amount': return '⚪';
        case 'error': return '🔴';
    }
}
function statusLabel(s) {
    switch (s) {
        case 'marked': return 'Marked';
        case 'flagged': return 'Flagged (>10% var)';
        case 'not_found': return 'Not found';
        case 'already_paid': return 'Already paid';
        case 'no_amount': return 'No system amount';
        case 'error': return 'Error';
    }
}
// ─── Paystub processor ───────────────────────────────────────────────────────
async function processPaystub(extraction, client, supervised) {
    const actions = [];
    // ── Validate extraction ────────────────────────────────────────────────────
    if (!extraction.issuedBy) {
        return {
            text: '❌ Could not identify the issuing company from the paystub header. Please tell me who issued this paystub.',
            actions,
        };
    }
    if (extraction.lineItems.length === 0) {
        return {
            text: '❌ Could not extract any line items from the paystub. The image may be unclear — please try sending a clearer photo.',
            actions,
        };
    }
    // ── Step 1: Resolve dispatcher ─────────────────────────────────────────────
    const dispatcherCall = await callTool(client, 'list_dispatchers', { search: extraction.issuedBy });
    actions.push({ tool: 'list_dispatchers', args: { search: extraction.issuedBy }, ...dispatcherCall });
    const dispatcher = parseUseIdFromResult(dispatcherCall.result);
    if (!dispatcher) {
        return {
            text: `❌ Could not match dispatcher "${extraction.issuedBy}" in the system.\n\n${dispatcherCall.result}\n\nPlease tell me which dispatcher issued this paystub.`,
            actions,
        };
    }
    // ── Step 2: Process line items ─────────────────────────────────────────────
    if (extraction.datesReadable) {
        return processPaystubPathA(extraction, dispatcher, client, supervised, actions);
    }
    else {
        return processPaystubPathB(extraction, dispatcher, client, supervised, actions);
    }
}
// ── Path A: dates are readable — mark by date ────────────────────────────────
async function processPaystubPathA(extraction, dispatcher, client, supervised, actions) {
    // Build the list of write operations
    const validItems = extraction.lineItems.filter((li) => li.date !== null && li.amount !== null);
    const writes = validItems.map((li) => ({
        tool: 'mark_job_paid_by_date',
        args: {
            date: li.date,
            dispatcherId: dispatcher.id,
            paidAmount: li.amount,
        },
    }));
    const skipped = extraction.lineItems.length - validItems.length;
    if (supervised && writes.length > 0) {
        // Build confirmation table
        const rows = validItems.map((li, i) => `| ${i + 1} | ${li.date} | $${li.amount.toFixed(2)} | mark_job_paid_by_date |`);
        const table = [
            `Dispatcher: **${dispatcher.name}** (matched from "${extraction.issuedBy}")`,
            '',
            `| # | Date | Amount | Action |`,
            `|---|------|--------|--------|`,
            ...rows,
        ].join('\n');
        const skippedNote = skipped > 0 ? `\n\n⚠️ ${skipped} line item(s) skipped — missing date or amount.` : '';
        const confirmationText = `${table}${skippedNote}\n\nI will mark **${writes.length}** job(s) as paid. Shall I proceed?`;
        return {
            text: confirmationText,
            actions,
            needsConfirmation: { confirmationText, writes },
        };
    }
    // Execute writes directly (supervision off)
    return executePaystubWrites(writes, extraction, dispatcher, skipped, client, actions);
}
// ── Path B: dates not readable — match by amount from unpaid jobs ────────────
async function processPaystubPathB(extraction, dispatcher, client, supervised, actions) {
    // Fetch unpaid jobs directly via REST client (not through tool formatter)
    let unpaidJobs = [];
    try {
        const result = await client.jobs.list({
            limit: 100,
            filters: { dispatcherId: dispatcher.id, jobPaid: 'false' },
        });
        actions.push({
            tool: 'list_jobs',
            args: { dispatcherId: dispatcher.id, jobPaid: false },
            result: `Fetched ${result.data.length} unpaid job(s)`,
            status: 'success',
        });
        unpaidJobs = result.data
            .filter((j) => j.amount != null)
            .map((j) => ({
            id: String(j.id),
            date: String(j.jobDate ?? j.date ?? ''),
            amount: Number(j.amount),
        }));
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        actions.push({
            tool: 'list_jobs',
            args: { dispatcherId: dispatcher.id, jobPaid: false },
            result: `Error: ${msg}`,
            status: 'error',
        });
        return {
            text: `❌ No unpaid jobs found for dispatcher "${dispatcher.name}". Cannot match paystub amounts.`,
            actions,
        };
    }
    if (unpaidJobs.length === 0) {
        return {
            text: `No unpaid jobs found for dispatcher **${dispatcher.name}**. All jobs may already be marked as paid.`,
            actions,
        };
    }
    // Match each line item amount to the closest unpaid job (within 10%)
    const used = new Set();
    const writes = [];
    const matchRows = [];
    let matched = 0;
    let unmatched = 0;
    for (let i = 0; i < extraction.lineItems.length; i++) {
        const li = extraction.lineItems[i];
        if (li.amount === null) {
            matchRows.push(`| ${i + 1} | — | — | — | — | ⚪ Amount not readable |`);
            unmatched++;
            continue;
        }
        // Find best match by amount
        let bestJob = null;
        let bestVariance = Infinity;
        for (const job of unpaidJobs) {
            if (used.has(job.id))
                continue;
            const variance = job.amount > 0
                ? Math.abs(job.amount - li.amount) / job.amount * 100
                : Infinity;
            if (variance < bestVariance) {
                bestVariance = variance;
                bestJob = job;
            }
        }
        if (bestJob && bestVariance <= 10) {
            used.add(bestJob.id);
            writes.push({
                tool: 'mark_job_paid_by_date',
                args: {
                    date: bestJob.date,
                    dispatcherId: dispatcher.id,
                    paidAmount: li.amount,
                },
            });
            matchRows.push(`| ${i + 1} | $${li.amount.toFixed(2)} | ${bestJob.date} | $${bestJob.amount.toFixed(2)} | ${bestVariance.toFixed(1)}% | ✅ Matched |`);
            matched++;
        }
        else {
            matchRows.push(`| ${i + 1} | $${li.amount.toFixed(2)} | — | — | — | ❌ No match |`);
            unmatched++;
        }
    }
    const table = [
        `Dispatcher: **${dispatcher.name}**`,
        `⚠️ Dates were not readable — matched by amount against ${unpaidJobs.length} unpaid job(s).`,
        '',
        `| # | Paystub Amt | Job Date | System Amt | Variance | Status |`,
        `|---|-------------|----------|------------|----------|--------|`,
        ...matchRows,
        '',
        `**${matched} matched, ${unmatched} unmatched.**`,
    ].join('\n');
    if (supervised && writes.length > 0) {
        const confirmationText = `${table}\n\nShall I mark the ${matched} matched job(s) as paid?`;
        return {
            text: confirmationText,
            actions,
            needsConfirmation: { confirmationText, writes },
        };
    }
    if (writes.length === 0) {
        return { text: table, actions };
    }
    // Execute writes directly
    return executePaystubWrites(writes, extraction, dispatcher, unmatched, client, actions);
}
// ── Execute paystub write operations and build results ───────────────────────
async function executePaystubWrites(writes, extraction, dispatcher, skipped, client, actions) {
    const results = [];
    for (const w of writes) {
        const call = await callTool(client, w.tool, w.args);
        actions.push({ tool: w.tool, args: w.args, ...call });
        results.push(parseMarkResult(call.result));
    }
    return { text: formatPaystubResults(results, dispatcher, skipped), actions };
}
function formatPaystubResults(results, dispatcher, skipped) {
    const rows = results.map((r, i) => {
        const date = r.jobDate ?? (r.raw.match(/on\s+(\S+)/)?.[1] ?? '—');
        const system = r.systemAmount ? `$${r.systemAmount}` : '—';
        const paid = r.raw.match(/paid:\s*\$?([\d,.]+)/)?.[1];
        const paidStr = paid ? `$${paid}` : '—';
        const var_ = r.variance ?? '—';
        return `| ${i + 1} | ${date} | ${paidStr} | ${system} | ${var_} | ${statusEmoji(r.status)} ${statusLabel(r.status)} |`;
    });
    const counts = {};
    for (const r of results)
        counts[r.status] = (counts[r.status] ?? 0) + 1;
    const summary = [];
    if (counts.marked)
        summary.push(`${counts.marked} marked`);
    if (counts.flagged)
        summary.push(`${counts.flagged} flagged`);
    if (counts.not_found)
        summary.push(`${counts.not_found} not found`);
    if (counts.already_paid)
        summary.push(`${counts.already_paid} already paid`);
    if (counts.no_amount)
        summary.push(`${counts.no_amount} no system amount`);
    if (counts.error)
        summary.push(`${counts.error} errors`);
    if (skipped > 0)
        summary.push(`${skipped} skipped (unreadable)`);
    return [
        `Dispatcher: **${dispatcher.name}**`,
        '',
        `| # | Date | Paid | System | Var% | Status |`,
        `|---|------|------|--------|------|--------|`,
        ...rows,
        '',
        `**${summary.join(', ')}.**`,
    ].join('\n');
}
// ─── Shared helpers ─────────────────────────────────────────────────────────
/** Format a ✓/❌ marker for a resolved entity */
function markEntity(entity, ocrName) {
    if (!ocrName)
        return '—';
    if (entity)
        return `${entity.name} ✓`;
    return `${ocrName} ❌ (not matched)`;
}
/** Resolve a job type for a given company + extraction locations */
async function resolveJobType(company, extraction, client, actions) {
    const jtRes = await callTool(client, 'list_job_types', { companyId: company.id });
    actions.push({ tool: 'list_job_types', args: { companyId: company.id }, ...jtRes });
    try {
        const parsed = JSON.parse(jtRes.result);
        const types = parsed.jobTypes ?? parsed.data ?? [];
        if (types.length === 1) {
            return { id: String(types[0].id), name: String(types[0].title ?? types[0].name ?? '') };
        }
        if (types.length > 1 && (extraction.startLocation || extraction.endLocation)) {
            const search = [extraction.startLocation, extraction.endLocation].filter(Boolean).join(' ').toLowerCase();
            const match = types.find((jt) => String(jt.title ?? '').toLowerCase().includes(search));
            if (match) {
                return { id: String(match.id), name: String(match.title ?? match.name ?? '') };
            }
        }
    }
    catch { /* not JSON — skip */ }
    return null;
}
/**
 * Cached entity resolver — avoids duplicate API calls when the same entity
 * name appears across multiple tickets in one document.
 */
class EntityResolver {
    client;
    cache = new Map();
    actions = [];
    constructor(client) {
        this.client = client;
    }
    async resolve(toolName, search) {
        if (!search)
            return null;
        const key = `${toolName}:${search}`;
        if (this.cache.has(key))
            return this.cache.get(key);
        const res = await callTool(this.client, toolName, { search });
        this.actions.push({ tool: toolName, args: { search }, ...res });
        const entity = parseUseIdFromResult(res.result);
        this.cache.set(key, entity);
        return entity;
    }
    /** Drain recorded actions (transfers ownership to caller) */
    drainActions() {
        const out = [...this.actions];
        this.actions = [];
        return out;
    }
}
/** Build the create_job args from resolved entities and extraction */
function buildCreateJobArgs(extraction, jobTypeId, dispatcher, driver, unit) {
    const args = {
        jobDate: extraction.date,
        jobTypeId,
    };
    if (dispatcher)
        args.dispatcherId = dispatcher.id;
    if (driver)
        args.driverId = driver.id;
    if (unit)
        args.unitId = unit.id;
    if (extraction.startTime)
        args.startTime = extraction.startTime;
    if (extraction.endTime)
        args.endTime = extraction.endTime;
    if (extraction.startLocation)
        args.startLocation = extraction.startLocation;
    if (extraction.endLocation)
        args.endLocation = extraction.endLocation;
    // Server stores ticket references in ticketIds (not ticketNumber)
    if (extraction.ticketNumber)
        args.ticketIds = extraction.ticketNumber;
    return args;
}
// ─── Ticket processor (single) ──────────────────────────────────────────────
async function processTicket(extraction, client, supervised) {
    const actions = [];
    // ── Resolve entities in parallel ───────────────────────────────────────────
    const [companyRes, dispatcherRes, unitRes, driverRes] = await Promise.all([
        extraction.company ? callTool(client, 'list_companies', { search: extraction.company }) : null,
        extraction.dispatcher ? callTool(client, 'list_dispatchers', { search: extraction.dispatcher }) : null,
        extraction.unit ? callTool(client, 'list_units', { search: extraction.unit }) : null,
        extraction.driver ? callTool(client, 'list_drivers', { search: extraction.driver }) : null,
    ]);
    if (companyRes)
        actions.push({ tool: 'list_companies', args: { search: extraction.company }, ...companyRes });
    if (dispatcherRes)
        actions.push({ tool: 'list_dispatchers', args: { search: extraction.dispatcher }, ...dispatcherRes });
    if (unitRes)
        actions.push({ tool: 'list_units', args: { search: extraction.unit }, ...unitRes });
    if (driverRes)
        actions.push({ tool: 'list_drivers', args: { search: extraction.driver }, ...driverRes });
    const company = companyRes ? parseUseIdFromResult(companyRes.result) : null;
    const dispatcher = dispatcherRes ? parseUseIdFromResult(dispatcherRes.result) : null;
    const unit = unitRes ? parseUseIdFromResult(unitRes.result) : null;
    const driver = driverRes ? parseUseIdFromResult(driverRes.result) : null;
    // ── Resolve job type ───────────────────────────────────────────────────────
    const jobType = company
        ? await resolveJobType(company, extraction, client, actions)
        : null;
    // ── Build confirmation summary ─────────────────────────────────────────────
    const lines = [];
    if (extraction.ticketNumber)
        lines.push(`**Ticket #${extraction.ticketNumber}** — ${extraction.date ?? 'date not readable'}`);
    else
        lines.push(`**Ticket** — ${extraction.date ?? 'date not readable'}`);
    lines.push(`Company: ${markEntity(company, extraction.company)}  |  Dispatcher: ${markEntity(dispatcher, extraction.dispatcher)}`);
    lines.push(`Unit: ${markEntity(unit, extraction.unit)}  |  Driver: ${markEntity(driver, extraction.driver)}`);
    if (extraction.startTime || extraction.endTime) {
        lines.push(`Time: ${extraction.startTime ?? '—'} → ${extraction.endTime ?? '—'}`);
    }
    if (extraction.startLocation || extraction.endLocation) {
        lines.push(`Route: ${extraction.startLocation ?? '—'} → ${extraction.endLocation ?? '—'}`);
    }
    if (jobType) {
        lines.push(`Job Type: ${jobType.name} ✓`);
    }
    if (extraction.material) {
        lines.push(`Material: ${extraction.material}`);
    }
    // Check for critical missing fields
    const missing = [];
    if (!extraction.date)
        missing.push('date');
    if (!jobType)
        missing.push('job type');
    if (missing.length > 0) {
        lines.push('');
        lines.push(`⚠️ Cannot create job — missing required field(s): **${missing.join(', ')}**.`);
        lines.push(`Please provide the missing information.`);
        return { text: lines.join('\n'), actions };
    }
    // ── Pre-build create_job args ──────────────────────────────────────────────
    const createArgs = buildCreateJobArgs(extraction, jobType.id, dispatcher, driver, unit);
    if (supervised) {
        lines.push('');
        lines.push('Shall I create this job?');
        const confirmationText = lines.join('\n');
        return {
            text: confirmationText,
            actions,
            needsConfirmation: {
                confirmationText,
                writes: [{ tool: 'create_job', args: createArgs }],
            },
        };
    }
    // Execute directly
    const createCall = await callTool(client, 'create_job', createArgs);
    actions.push({ tool: 'create_job', args: createArgs, ...createCall });
    lines.push('');
    lines.push(createCall.status === 'success' ? '✅ Job created.' : `❌ Failed: ${createCall.result}`);
    return { text: lines.join('\n'), actions };
}
// ─── Multiple-ticket processor ──────────────────────────────────────────────
/**
 * Process multiple tickets extracted from a single document.
 * Resolves all entities first, presents a unified summary of all entries,
 * then collects all create_job writes into one confirmation prompt.
 */
async function processMultipleTickets(tickets, client, supervised) {
    const resolver = new EntityResolver(client);
    const actions = [];
    const allWrites = [];
    const summaryLines = [];
    const skippedIndices = [];
    summaryLines.push(`📋 **${tickets.length} entry/entries detected in document**\n`);
    // ── Resolve entities and build per-ticket summaries (no writes yet) ────────
    for (let i = 0; i < tickets.length; i++) {
        const t = tickets[i];
        const num = i + 1;
        // Resolve entities (cached across tickets)
        const company = await resolver.resolve('list_companies', t.company);
        const dispatcher = await resolver.resolve('list_dispatchers', t.dispatcher);
        const unit = await resolver.resolve('list_units', t.unit);
        const driver = await resolver.resolve('list_drivers', t.driver);
        // Resolve job type
        const jobType = company
            ? await resolveJobType(company, t, client, actions)
            : null;
        // Build summary block for this ticket
        const header = t.ticketNumber
            ? `**${num}. Ticket #${t.ticketNumber}** — ${t.date ?? 'no date'}`
            : `**${num}. Ticket** — ${t.date ?? 'no date'}`;
        summaryLines.push(header);
        summaryLines.push(`Company: ${markEntity(company, t.company)}  |  Dispatcher: ${markEntity(dispatcher, t.dispatcher)}`);
        summaryLines.push(`Unit: ${markEntity(unit, t.unit)}  |  Driver: ${markEntity(driver, t.driver)}`);
        if (t.startTime || t.endTime)
            summaryLines.push(`Time: ${t.startTime ?? '—'} → ${t.endTime ?? '—'}`);
        if (t.startLocation || t.endLocation)
            summaryLines.push(`Route: ${t.startLocation ?? '—'} → ${t.endLocation ?? '—'}`);
        if (jobType)
            summaryLines.push(`Job Type: ${jobType.name} ✓`);
        if (t.material)
            summaryLines.push(`Material: ${t.material}`);
        // Check required fields
        const missing = [];
        if (!t.date)
            missing.push('date');
        if (!jobType)
            missing.push('job type');
        if (missing.length > 0) {
            summaryLines.push(`⚠️ Cannot create — missing: **${missing.join(', ')}**`);
            skippedIndices.push(num);
        }
        else {
            const createArgs = buildCreateJobArgs(t, jobType.id, dispatcher, driver, unit);
            allWrites.push({ tool: 'create_job', args: createArgs });
        }
        summaryLines.push(''); // blank line between tickets
    }
    // Merge resolver actions
    actions.push(...resolver.drainActions());
    // ── Summary footer ────────────────────────────────────────────────────────
    if (allWrites.length === 0) {
        summaryLines.push('❌ No jobs can be created — all entries have missing required fields.');
        return { text: summaryLines.join('\n'), actions };
    }
    const skippedNote = skippedIndices.length > 0
        ? ` (${skippedIndices.length} skipped: #${skippedIndices.join(', #')})`
        : '';
    if (supervised) {
        summaryLines.push(`Shall I create **${allWrites.length}** job(s)?${skippedNote}`);
        const confirmationText = summaryLines.join('\n');
        return {
            text: confirmationText,
            actions,
            needsConfirmation: { confirmationText, writes: allWrites },
        };
    }
    // Execute directly (supervision off)
    const results = [];
    for (const w of allWrites) {
        const call = await callTool(client, w.tool, w.args);
        actions.push({ tool: w.tool, args: w.args, ...call });
        results.push(call.status === 'success' ? '✅' : '❌');
    }
    const ok = results.filter((r) => r === '✅').length;
    const fail = results.filter((r) => r === '❌').length;
    summaryLines.push(`✅ ${ok} job(s) created${fail > 0 ? `, ❌ ${fail} failed` : ''}.${skippedNote}`);
    return { text: summaryLines.join('\n'), actions };
}
// ─── Public API ──────────────────────────────────────────────────────────────
/**
 * Process a single parsed document extraction.
 * Returns a formatted text response and audit trail.
 *
 * For `unknown` extraction types, returns null — the caller should fall
 * through to the tool-calling model.
 */
export async function processDocument(extraction, client, supervised) {
    switch (extraction.type) {
        case 'paystub':
            return processPaystub(extraction, client, supervised);
        case 'ticket':
            return processTicket(extraction, client, supervised);
        case 'unknown':
            return null;
    }
}
/**
 * Process multiple document extractions from a single image/document.
 *
 * The OCR model may detect multiple entries (e.g. several tickets on one page,
 * or multiple loads for one job). This function:
 *   1. Analyzes ALL entries first (resolves entities, validates fields)
 *   2. Presents a unified summary of everything found
 *   3. Collects all write operations into one confirmation prompt
 *   4. Only executes after user confirms (when supervised)
 *
 * Falls through to tool-calling model (returns null) if all entries are unknown.
 */
export async function processDocuments(extractions, client, supervised) {
    const known = extractions.filter((e) => e.type !== 'unknown');
    if (known.length === 0)
        return null;
    // Single entry → delegate to existing single-doc processor
    if (known.length === 1) {
        return processDocument(known[0], client, supervised);
    }
    // Multiple entries of the same type
    const tickets = known.filter((e) => e.type === 'ticket');
    const paystubs = known.filter((e) => e.type === 'paystub');
    if (tickets.length > 0 && paystubs.length === 0) {
        return processMultipleTickets(tickets, client, supervised);
    }
    if (paystubs.length > 0 && tickets.length === 0) {
        // Multiple paystub sections — merge line items if same issuer, else process first
        if (paystubs.length === 1) {
            return processPaystub(paystubs[0], client, supervised);
        }
        // Merge line items from all paystub sections into one extraction
        const merged = {
            type: 'paystub',
            issuedBy: paystubs[0].issuedBy,
            periodFrom: paystubs[0].periodFrom,
            periodTo: paystubs[paystubs.length - 1].periodTo,
            lineItems: paystubs.flatMap((p) => p.lineItems),
            datesReadable: false, // recalculate below
        };
        const withDate = merged.lineItems.filter((li) => li.date !== null).length;
        merged.datesReadable = merged.lineItems.length > 0 && withDate >= merged.lineItems.length * 0.5;
        return processPaystub(merged, client, supervised);
    }
    // Mixed types — process tickets and paystubs separately, combine results
    const results = [];
    const allWrites = [];
    const allActions = [];
    if (tickets.length > 0) {
        const tr = tickets.length === 1
            ? await processTicket(tickets[0], client, supervised)
            : await processMultipleTickets(tickets, client, supervised);
        results.push(tr);
        allActions.push(...tr.actions);
        if (tr.needsConfirmation)
            allWrites.push(...tr.needsConfirmation.writes);
    }
    if (paystubs.length > 0) {
        const pr = await processPaystub(paystubs[0], client, supervised);
        if (pr) {
            results.push(pr);
            allActions.push(...pr.actions);
            if (pr.needsConfirmation)
                allWrites.push(...pr.needsConfirmation.writes);
        }
    }
    const combinedText = results.map((r) => r.text).join('\n\n---\n\n');
    if (allWrites.length > 0 && supervised) {
        return {
            text: combinedText,
            actions: allActions,
            needsConfirmation: { confirmationText: combinedText, writes: allWrites },
        };
    }
    return { text: combinedText, actions: allActions };
}
/**
 * Format the results of executing pending document writes (after user confirmation).
 * Called from llm.ts when the user confirms a pending document action.
 */
export function formatWriteResults(toolResults) {
    if (toolResults.length === 0)
        return 'No actions were executed.';
    // ── Single create_job → simple success/failure ────────────────────────────
    if (toolResults.length === 1 && toolResults[0].name === 'create_job') {
        const r = toolResults[0];
        if (!r.result.startsWith('Error'))
            return '✅ Job created successfully.';
        return `❌ Failed to create job: ${r.result}`;
    }
    // ── Multiple create_job calls (multi-ticket document) ─────────────────────
    const allCreateJobs = toolResults.every((r) => r.name === 'create_job');
    if (allCreateJobs) {
        const rows = toolResults.map((r, i) => {
            const date = String(r.args.jobDate ?? '—');
            const ticket = String(r.args.ticketIds ?? '—');
            const ok = !r.result.startsWith('Error');
            return `| ${i + 1} | ${date} | ${ticket} | ${ok ? '✅ Created' : '❌ Failed'} |`;
        });
        const ok = toolResults.filter((r) => !r.result.startsWith('Error')).length;
        const fail = toolResults.length - ok;
        return [
            `| # | Date | Ticket | Status |`,
            `|---|------|--------|--------|`,
            ...rows,
            '',
            `**${ok} created${fail > 0 ? `, ${fail} failed` : ''}.**`,
        ].join('\n');
    }
    // ── mark_job_paid_by_date calls (paystub) ─────────────────────────────────
    const results = toolResults.map((r) => parseMarkResult(r.result));
    const rows = results.map((r, i) => {
        const date = r.jobDate ?? '—';
        const system = r.systemAmount ? `$${r.systemAmount}` : '—';
        const var_ = r.variance ?? '—';
        return `| ${i + 1} | ${date} | ${system} | ${var_} | ${statusEmoji(r.status)} ${statusLabel(r.status)} |`;
    });
    const counts = {};
    for (const r of results)
        counts[r.status] = (counts[r.status] ?? 0) + 1;
    const summary = [];
    if (counts.marked)
        summary.push(`${counts.marked} marked`);
    if (counts.flagged)
        summary.push(`${counts.flagged} flagged`);
    if (counts.not_found)
        summary.push(`${counts.not_found} not found`);
    if (counts.already_paid)
        summary.push(`${counts.already_paid} already paid`);
    if (counts.error)
        summary.push(`${counts.error} errors`);
    return [
        `| # | Date | System | Var% | Status |`,
        `|---|------|--------|------|--------|`,
        ...rows,
        '',
        `**${summary.join(', ')}.**`,
    ].join('\n');
}
