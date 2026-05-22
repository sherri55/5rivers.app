/**
 * memory.ts — Persistent agent memory for recognised job patterns.
 *
 * Stores name-level patterns observed from successfully created jobs so the
 * agent can skip confirmation questions when it has seen the same combination
 * before. Patterns are keyed by (companyName, dispatcherName, jobTypeName).
 *
 * File location: `./agent-memory.json` relative to the process working
 * directory (override with AGENT_MEMORY_PATH env var).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const MEMORY_PATH = resolve(process.env.AGENT_MEMORY_PATH ?? './agent-memory.json');
const MAX_PATTERNS = 200; // guard against unbounded growth
// ─── IO ───────────────────────────────────────────────────────────────────────
function load() {
    try {
        if (existsSync(MEMORY_PATH)) {
            const raw = readFileSync(MEMORY_PATH, 'utf-8');
            const parsed = JSON.parse(raw);
            if (parsed.version === 1 && Array.isArray(parsed.patterns))
                return parsed;
        }
    }
    catch { /* corrupt file — start fresh */ }
    return { version: 1, patterns: [] };
}
function save(mem) {
    try {
        writeFileSync(MEMORY_PATH, JSON.stringify(mem, null, 2), 'utf-8');
    }
    catch (err) {
        console.warn('[memory] Could not save agent-memory.json:', err instanceof Error ? err.message : err);
    }
}
// ─── Pattern key (case-insensitive) ──────────────────────────────────────────
function patternKey(p) {
    return `${p.companyName.toLowerCase()}|${p.dispatcherName.toLowerCase()}|${p.jobTypeName.toLowerCase()}`;
}
// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Record that a job was successfully created with the given names.
 * If an identical pattern already exists, increments its count.
 */
export function recordJobPattern(pattern) {
    const mem = load();
    const key = patternKey(pattern);
    const existing = mem.patterns.find((p) => patternKey(p) === key);
    const today = new Date().toISOString().slice(0, 10);
    if (existing) {
        existing.count++;
        existing.lastSeen = today;
        if (pattern.driverName)
            existing.driverName = pattern.driverName;
        if (pattern.unitName)
            existing.unitName = pattern.unitName;
    }
    else {
        mem.patterns.push({ ...pattern, count: 1, lastSeen: today });
    }
    // Keep most-recently-seen patterns only
    mem.patterns.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
    if (mem.patterns.length > MAX_PATTERNS)
        mem.patterns.length = MAX_PATTERNS;
    save(mem);
    console.log(`[memory] recorded pattern: ${pattern.companyName} + ${pattern.dispatcherName} → ${pattern.jobTypeName}`);
}
/**
 * Build the ━━ KNOWN PATTERNS ━━ section to inject into the system prompt.
 * Returns an empty string when no patterns exist yet.
 */
export function buildMemoryPromptSection() {
    const mem = load();
    if (!mem.patterns.length)
        return '';
    // Top 20 by usage count
    const top = [...mem.patterns]
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
    const lines = top.map((p) => {
        const extras = [];
        if (p.driverName)
            extras.push(`driver: ${p.driverName}`);
        if (p.unitName)
            extras.push(`unit: ${p.unitName}`);
        const suffix = extras.length ? ` [${extras.join(', ')}]` : '';
        return `  • ${p.companyName} + ${p.dispatcherName} → ${p.jobTypeName}${suffix} (×${p.count})`;
    });
    return [
        '',
        '━━ KNOWN PATTERNS (from past jobs) ━━',
        ...lines,
        'When all fields on a ticket match a known pattern, resolve IDs and create the job directly — no confirmation question needed.',
        '',
    ].join('\n');
}
/**
 * Parse a `NAME: <value>` line out of a tool result string.
 * Used to extract display names from list_* USE_ID responses.
 * Returns undefined when the line is not present.
 */
export function parseNameFromToolResult(result) {
    const m = result.match(/^NAME:\s*(.+)$/m);
    return m?.[1]?.trim() || undefined;
}
