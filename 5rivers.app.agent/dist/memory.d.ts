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
export interface JobPattern {
    /** Display name of the company (ticket letterhead). */
    companyName: string;
    /** Display name of the dispatcher ("Trucking Co" field). */
    dispatcherName: string;
    /** Job type title as it appears in the system. */
    jobTypeName: string;
    /** Driver name if consistently used for this pattern. */
    driverName?: string;
    /** Unit name/number if consistently used. */
    unitName?: string;
    /** Number of times this exact combination was successfully created. */
    count: number;
    /** ISO date (YYYY-MM-DD) of the last successful creation. */
    lastSeen: string;
}
/**
 * Record that a job was successfully created with the given names.
 * If an identical pattern already exists, increments its count.
 */
export declare function recordJobPattern(pattern: Omit<JobPattern, 'count' | 'lastSeen'>): void;
/**
 * Build the ━━ KNOWN PATTERNS ━━ section to inject into the system prompt.
 * Returns an empty string when no patterns exist yet.
 */
export declare function buildMemoryPromptSection(): string;
/**
 * Parse a `NAME: <value>` line out of a tool result string.
 * Used to extract display names from list_* USE_ID responses.
 * Returns undefined when the line is not present.
 */
export declare function parseNameFromToolResult(result: string): string | undefined;
