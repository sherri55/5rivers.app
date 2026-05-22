/**
 * config.ts — Profile-based provider configuration.
 *
 * Loads named profiles from agent.profiles.json and applies them to
 * process.env so every provider implementation picks up the settings
 * without any code changes.
 *
 * Priority (highest → lowest):
 *   1. Explicit CLI flags  (--provider, --model, --local, --cloud, etc.)
 *   2. Named profile       (--profile <name>)
 *   3. Existing .env       (unchanged)
 */
interface ParsedArgs {
    profile?: string;
    provider?: string;
    model?: string;
    reasoning?: boolean;
    reasoningEffort?: string;
    remaining: string[];
}
export declare function parseArgs(argv?: string[]): ParsedArgs;
/**
 * Parse CLI args, apply a named profile (if given), then overlay any
 * explicit flags.  Call this once at startup, before importing llm.ts.
 *
 * Returns a human-readable description of the active configuration.
 */
export declare function applyConfig(argv?: string[]): string;
/**
 * Switch to a named profile (or a raw provider name) at runtime.
 * Returns a description string, or an error message if the name is unknown.
 * Caller must also call clearProviderRegistry() from llm.ts after this.
 */
export declare function switchProfile(nameOrProvider: string): string;
/**
 * List all available profiles with descriptions.
 */
export declare function listProfiles(): string;
export declare function describeActiveConfig(): string;
export {};
