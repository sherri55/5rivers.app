/**
 * Document Processor — code-driven orchestrator for tickets and paystubs.
 *
 * Replaces all workflow logic that was previously in the system prompt.
 * Calls tool handlers directly via ALL_TOOLS — no LLM involved.
 */
import type { RestClient } from '../../5rivers.app.mcp/dist/rest-client.js';
import { ALL_TOOLS } from '../../5rivers.app.mcp/dist/tools.js';
import type {
  DocumentExtraction,
  PaystubExtraction,
  PaystubLineItem,
  TicketExtraction,
} from './ocr-parser.js';

// ─── Public types ────────────────────────────────────────────────────────────

export interface ProcessorAction {
  tool: string;
  args: Record<string, unknown>;
  result: string;
  status: 'success' | 'error';
}

export interface PendingDocAction {
  confirmationText: string;
  writes: Array<{ tool: string; args: Record<string, unknown> }>;
}

export interface ProcessorResult {
  text: string;
  actions: ProcessorAction[];
  needsConfirmation?: PendingDocAction;
}

// ─── Tool calling helpers ────────────────────────────────────────────────────

async function callTool(
  client: RestClient,
  toolName: string,
  args: Record<string, unknown>,
): Promise<{ result: string; status: 'success' | 'error' }> {
  const def = ALL_TOOLS.find((t) => t.name === toolName);
  if (!def) return { result: `Error: Unknown tool "${toolName}"`, status: 'error' };
  try {
    const result = await def.handler(client, args);
    console.log(`[doc-proc] ${toolName}(${JSON.stringify(args).slice(0, 100)}) → ${result.slice(0, 200)}`);
    return { result, status: 'success' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[doc-proc] ${toolName} error: ${msg}`);
    return { result: `Error: ${msg}`, status: 'error' };
  }
}

// ─── Fuzzy result parser ─────────────────────────────────────────────────────

interface ResolvedEntity {
  id: string;
  name: string;
}

/**
 * Parse the text output of formatFuzzyResult() into a usable id+name,
 * or null if nothing matched.
 */
function parseUseIdFromResult(result: string): ResolvedEntity | null {
  // USE_ID: <uuid>  /  NAME: <name>
  const idMatch   = result.match(/^USE_ID:\s*(.+)$/m);
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

// ─── Mark result parser ──────────────────────────────────────────────────────

type MarkStatus = 'marked' | 'flagged' | 'not_found' | 'already_paid' | 'no_amount' | 'error';

interface MarkResult {
  status: MarkStatus;
  jobId?: string;
  jobDate?: string;
  systemAmount?: string;
  variance?: string;
  raw: string;
}

function parseMarkResult(raw: string): MarkResult {
  if (raw.startsWith('✅ MARKED:')) {
    const jobId = raw.match(/Job\s+(\S+)/)?.[1];
    const jobDate = raw.match(/date:\s*(\S+)/)?.[1];
    const system = raw.match(/system:\s*\$?([\d,.]+)/)?.[1];
    const variance = raw.match(/variance:\s*([\d.]+%)/)?.[1];
    return { status: 'marked', jobId, jobDate, systemAmount: system, variance, raw };
  }
  if (raw.startsWith('FLAGGED:'))      return { status: 'flagged', raw };
  if (raw.startsWith('NOT FOUND:'))    return { status: 'not_found', raw };
  if (raw.startsWith('ALREADY PAID:')) return { status: 'already_paid', raw };
  if (raw.startsWith('NO AMOUNT:'))    return { status: 'no_amount', raw };
  return { status: 'error', raw };
}

function statusEmoji(s: MarkStatus): string {
  switch (s) {
    case 'marked':       return '✅';
    case 'flagged':      return '⚠️';
    case 'not_found':    return '❌';
    case 'already_paid': return '🔵';
    case 'no_amount':    return '⚪';
    case 'error':        return '🔴';
  }
}

function statusLabel(s: MarkStatus): string {
  switch (s) {
    case 'marked':       return 'Marked';
    case 'flagged':      return 'Flagged (>10% var)';
    case 'not_found':    return 'Not found';
    case 'already_paid': return 'Already paid';
    case 'no_amount':    return 'No system amount';
    case 'error':        return 'Error';
  }
}

// ─── Paystub processor ───────────────────────────────────────────────────────

async function processPaystub(
  extraction: PaystubExtraction,
  client: RestClient,
  supervised: boolean,
): Promise<ProcessorResult> {
  const actions: ProcessorAction[] = [];

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
  } else {
    return processPaystubPathB(extraction, dispatcher, client, supervised, actions);
  }
}

// ── Path A: dates are readable — mark by date ────────────────────────────────

async function processPaystubPathA(
  extraction: PaystubExtraction,
  dispatcher: ResolvedEntity,
  client: RestClient,
  supervised: boolean,
  actions: ProcessorAction[],
): Promise<ProcessorResult> {
  // Build the list of write operations
  const validItems = extraction.lineItems.filter(
    (li): li is PaystubLineItem & { date: string; amount: number } =>
      li.date !== null && li.amount !== null,
  );

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
    const rows = validItems.map((li, i) =>
      `| ${i + 1} | ${li.date} | $${li.amount.toFixed(2)} | mark_job_paid_by_date |`,
    );
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

async function processPaystubPathB(
  extraction: PaystubExtraction,
  dispatcher: ResolvedEntity,
  client: RestClient,
  supervised: boolean,
  actions: ProcessorAction[],
): Promise<ProcessorResult> {
  // Fetch unpaid jobs directly via REST client (not through tool formatter)
  let unpaidJobs: Array<{ id: string; date: string; amount: number }> = [];
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
    unpaidJobs = (result.data as Record<string, unknown>[])
      .filter((j) => j.amount != null)
      .map((j) => ({
        id:     String(j.id),
        date:   String(j.jobDate ?? j.date ?? ''),
        amount: Number(j.amount),
      }));
  } catch (err) {
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
  const used = new Set<string>();
  const writes: Array<{ tool: string; args: Record<string, unknown> }> = [];
  const matchRows: string[] = [];
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
    let bestJob: typeof unpaidJobs[0] | null = null;
    let bestVariance = Infinity;

    for (const job of unpaidJobs) {
      if (used.has(job.id)) continue;
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
      matchRows.push(
        `| ${i + 1} | $${li.amount.toFixed(2)} | ${bestJob.date} | $${bestJob.amount.toFixed(2)} | ${bestVariance.toFixed(1)}% | ✅ Matched |`,
      );
      matched++;
    } else {
      matchRows.push(
        `| ${i + 1} | $${li.amount.toFixed(2)} | — | — | — | ❌ No match |`,
      );
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

async function executePaystubWrites(
  writes: Array<{ tool: string; args: Record<string, unknown> }>,
  extraction: PaystubExtraction,
  dispatcher: ResolvedEntity,
  skipped: number,
  client: RestClient,
  actions: ProcessorAction[],
): Promise<ProcessorResult> {
  const results: MarkResult[] = [];

  for (const w of writes) {
    const call = await callTool(client, w.tool, w.args);
    actions.push({ tool: w.tool, args: w.args, ...call });
    results.push(parseMarkResult(call.result));
  }

  return { text: formatPaystubResults(results, dispatcher, skipped), actions };
}

function formatPaystubResults(results: MarkResult[], dispatcher: ResolvedEntity, skipped: number): string {
  const rows = results.map((r, i) => {
    const date   = r.jobDate   ?? (r.raw.match(/on\s+(\S+)/)?.[1] ?? '—');
    const system = r.systemAmount ? `$${r.systemAmount}` : '—';
    const paid   = r.raw.match(/paid:\s*\$?([\d,.]+)/)?.[1];
    const paidStr = paid ? `$${paid}` : '—';
    const var_   = r.variance ?? '—';
    return `| ${i + 1} | ${date} | ${paidStr} | ${system} | ${var_} | ${statusEmoji(r.status)} ${statusLabel(r.status)} |`;
  });

  const counts: Record<string, number> = {};
  for (const r of results) counts[r.status] = (counts[r.status] ?? 0) + 1;

  const summary: string[] = [];
  if (counts.marked)       summary.push(`${counts.marked} marked`);
  if (counts.flagged)      summary.push(`${counts.flagged} flagged`);
  if (counts.not_found)    summary.push(`${counts.not_found} not found`);
  if (counts.already_paid) summary.push(`${counts.already_paid} already paid`);
  if (counts.no_amount)    summary.push(`${counts.no_amount} no system amount`);
  if (counts.error)        summary.push(`${counts.error} errors`);
  if (skipped > 0)         summary.push(`${skipped} skipped (unreadable)`);

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

// ─── Ticket processor ────────────────────────────────────────────────────────

async function processTicket(
  extraction: TicketExtraction,
  client: RestClient,
  supervised: boolean,
): Promise<ProcessorResult> {
  const actions: ProcessorAction[] = [];

  // ── Resolve entities in parallel ───────────────────────────────────────────
  const [companyRes, dispatcherRes, unitRes, driverRes] = await Promise.all([
    extraction.company    ? callTool(client, 'list_companies',   { search: extraction.company })    : null,
    extraction.dispatcher ? callTool(client, 'list_dispatchers', { search: extraction.dispatcher })  : null,
    extraction.unit       ? callTool(client, 'list_units',       { search: extraction.unit })        : null,
    extraction.driver     ? callTool(client, 'list_drivers',     { search: extraction.driver })      : null,
  ]);

  // Record actions
  if (companyRes)    actions.push({ tool: 'list_companies',   args: { search: extraction.company },    ...companyRes });
  if (dispatcherRes) actions.push({ tool: 'list_dispatchers', args: { search: extraction.dispatcher }, ...dispatcherRes });
  if (unitRes)       actions.push({ tool: 'list_units',       args: { search: extraction.unit },       ...unitRes });
  if (driverRes)     actions.push({ tool: 'list_drivers',     args: { search: extraction.driver },     ...driverRes });

  // Parse IDs
  const company    = companyRes    ? parseUseIdFromResult(companyRes.result)    : null;
  const dispatcher = dispatcherRes ? parseUseIdFromResult(dispatcherRes.result) : null;
  const unit       = unitRes       ? parseUseIdFromResult(unitRes.result)       : null;
  const driver     = driverRes     ? parseUseIdFromResult(driverRes.result)     : null;

  // ── Resolve job type (if company found) ────────────────────────────────────
  let jobTypeId: string | null = null;
  let jobTypeName: string | null = null;

  if (company) {
    const jtRes = await callTool(client, 'list_job_types', { companyId: company.id });
    actions.push({ tool: 'list_job_types', args: { companyId: company.id }, ...jtRes });

    // Try to match by route or title from the extracted locations
    try {
      const parsed = JSON.parse(jtRes.result);
      const types = parsed.jobTypes ?? parsed.data ?? [];
      if (types.length === 1) {
        jobTypeId   = String(types[0].id);
        jobTypeName = String(types[0].title ?? types[0].name ?? '');
      } else if (types.length > 1 && (extraction.startLocation || extraction.endLocation)) {
        // Try matching by location in title
        const search = [extraction.startLocation, extraction.endLocation].filter(Boolean).join(' ').toLowerCase();
        const match = types.find((jt: Record<string, unknown>) =>
          String(jt.title ?? '').toLowerCase().includes(search),
        );
        if (match) {
          jobTypeId   = String(match.id);
          jobTypeName = String(match.title ?? match.name ?? '');
        }
      }
    } catch { /* not JSON — skip */ }
  }

  // ── Build confirmation summary ─────────────────────────────────────────────
  const mark = (entity: ResolvedEntity | null, ocrName: string | null) => {
    if (!ocrName) return '—';
    if (entity) return `${entity.name} ✓`;
    return `${ocrName} ❌ (not matched)`;
  };

  const lines: string[] = [];
  if (extraction.ticketNumber) lines.push(`**Ticket #${extraction.ticketNumber}** — ${extraction.date ?? 'date not readable'}`);
  else lines.push(`**Ticket** — ${extraction.date ?? 'date not readable'}`);

  lines.push(`Company: ${mark(company, extraction.company)}  |  Dispatcher: ${mark(dispatcher, extraction.dispatcher)}`);
  lines.push(`Unit: ${mark(unit, extraction.unit)}  |  Driver: ${mark(driver, extraction.driver)}`);

  if (extraction.startTime || extraction.endTime) {
    lines.push(`Time: ${extraction.startTime ?? '—'} → ${extraction.endTime ?? '—'}`);
  }
  if (extraction.startLocation || extraction.endLocation) {
    lines.push(`Route: ${extraction.startLocation ?? '—'} → ${extraction.endLocation ?? '—'}`);
  }
  if (jobTypeName) {
    lines.push(`Job Type: ${jobTypeName} ✓`);
  }
  if (extraction.material) {
    lines.push(`Material: ${extraction.material}`);
  }

  // Check for critical missing fields
  const missing: string[] = [];
  if (!extraction.date) missing.push('date');
  if (!jobTypeId)       missing.push('job type');

  if (missing.length > 0) {
    lines.push('');
    lines.push(`⚠️ Cannot create job — missing required field(s): **${missing.join(', ')}**.`);
    lines.push(`Please provide the missing information.`);
    return { text: lines.join('\n'), actions };
  }

  // ── Pre-build create_job args ──────────────────────────────────────────────
  const createArgs: Record<string, unknown> = {
    jobDate:    extraction.date,
    jobTypeId:  jobTypeId,
  };
  if (dispatcher) createArgs.dispatcherId   = dispatcher.id;
  if (driver)     createArgs.driverId       = driver.id;
  if (unit)       createArgs.unitId         = unit.id;
  if (extraction.startTime)     createArgs.startTime     = extraction.startTime;
  if (extraction.endTime)       createArgs.endTime       = extraction.endTime;
  if (extraction.startLocation) createArgs.startLocation = extraction.startLocation;
  if (extraction.endLocation)   createArgs.endLocation   = extraction.endLocation;
  if (extraction.ticketNumber)  createArgs.ticketNumber  = extraction.ticketNumber;

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

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Process a parsed document extraction.
 * Returns a formatted text response and audit trail.
 *
 * For `unknown` extraction types, returns null — the caller should fall
 * through to the tool-calling model.
 */
export async function processDocument(
  extraction: DocumentExtraction,
  client: RestClient,
  supervised: boolean,
): Promise<ProcessorResult | null> {
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
 * Format the results of executing pending document writes (after user confirmation).
 * Called from llm.ts when the user confirms a pending document action.
 */
export function formatWriteResults(
  toolResults: Array<{ name: string; args: Record<string, unknown>; result: string }>,
): string {
  if (toolResults.length === 0) return 'No actions were executed.';

  // If this was a create_job, show simple success/failure
  if (toolResults.length === 1 && toolResults[0].name === 'create_job') {
    const r = toolResults[0];
    if (!r.result.startsWith('Error')) return '✅ Job created successfully.';
    return `❌ Failed to create job: ${r.result}`;
  }

  // Multiple writes — likely mark_job_paid_by_date calls (paystub)
  const results = toolResults.map((r) => parseMarkResult(r.result));
  const rows = results.map((r, i) => {
    const date   = r.jobDate ?? '—';
    const system = r.systemAmount ? `$${r.systemAmount}` : '—';
    const var_   = r.variance ?? '—';
    return `| ${i + 1} | ${date} | ${system} | ${var_} | ${statusEmoji(r.status)} ${statusLabel(r.status)} |`;
  });

  const counts: Record<string, number> = {};
  for (const r of results) counts[r.status] = (counts[r.status] ?? 0) + 1;

  const summary: string[] = [];
  if (counts.marked)       summary.push(`${counts.marked} marked`);
  if (counts.flagged)      summary.push(`${counts.flagged} flagged`);
  if (counts.not_found)    summary.push(`${counts.not_found} not found`);
  if (counts.already_paid) summary.push(`${counts.already_paid} already paid`);
  if (counts.error)        summary.push(`${counts.error} errors`);

  return [
    `| # | Date | System | Var% | Status |`,
    `|---|------|--------|------|--------|`,
    ...rows,
    '',
    `**${summary.join(', ')}.**`,
  ].join('\n');
}
