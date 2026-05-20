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

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname }         from 'node:path';
import { fileURLToPath }            from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROFILES_PATH = resolve(__dirname, '../agent.profiles.json');

// ─── Types ────────────────────────────────────────────────────────────────────

interface SingleProfile {
  description?: string;
  provider: string;
  model?: string;
  reasoning?: boolean;
  reasoningEffort?: string;
  host?: string;
}

interface HybridProfile {
  description?: string;
  local: string;
  cloud: string;
}

type Profile = SingleProfile | HybridProfile;

interface ProfilesFile {
  default?: string;
  profiles: Record<string, Profile>;
}

function isHybrid(p: Profile): p is HybridProfile {
  return 'local' in p && 'cloud' in p;
}

// ─── Load profiles ────────────────────────────────────────────────────────────

function loadProfiles(): ProfilesFile {
  if (!existsSync(PROFILES_PATH)) return { profiles: {} };
  try {
    return JSON.parse(readFileSync(PROFILES_PATH, 'utf-8')) as ProfilesFile;
  } catch {
    console.warn('[config] Could not parse agent.profiles.json — using .env only');
    return { profiles: {} };
  }
}

// ─── Apply a profile to process.env ──────────────────────────────────────────

function applyProfile(profile: Profile): void {
  if (isHybrid(profile)) {
    delete process.env.LLM_PROVIDER;
    process.env.LLM_PROVIDER_LOCAL = profile.local;
    process.env.LLM_PROVIDER_CLOUD = profile.cloud;
    process.env.LLM_HYBRID_FALLBACK = 'true';
    return;
  }

  // Single-provider
  delete process.env.LLM_PROVIDER_LOCAL;
  delete process.env.LLM_PROVIDER_CLOUD;
  process.env.LLM_PROVIDER = profile.provider;

  if (profile.model) {
    const p = profile.provider;
    if (p === 'deepseek')  process.env.DEEPSEEK_MODEL  = profile.model;
    if (p === 'gemini')    process.env.GEMINI_MODEL     = profile.model;
    if (p === 'groq')      process.env.GROQ_MODEL       = profile.model;
    if (p === 'ollama')    process.env.OLLAMA_MODEL      = profile.model;
    if (p === 'lmstudio')  process.env.LMSTUDIO_TOOL_MODEL = profile.model;
  }

  if (profile.provider === 'deepseek') {
    if (profile.reasoning !== undefined) {
      process.env.DEEPSEEK_REASONING = String(profile.reasoning);
    }
    if (profile.reasoningEffort) {
      process.env.DEEPSEEK_REASONING_EFFORT = profile.reasoningEffort;
    }
  }

  if (profile.host) {
    if (profile.provider === 'lmstudio') process.env.LMSTUDIO_HOST = profile.host;
    if (profile.provider === 'ollama')   process.env.OLLAMA_HOST   = profile.host;
  }
}

// ─── CLI arg parser ───────────────────────────────────────────────────────────

interface ParsedArgs {
  profile?:          string;
  provider?:         string;
  model?:            string;
  local?:            string;
  cloud?:            string;
  reasoning?:        boolean;
  reasoningEffort?:  string;
  remaining:         string[];
}

export function parseArgs(argv: string[] = process.argv.slice(2)): ParsedArgs {
  const result: ParsedArgs = { remaining: [] };
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    const next = argv[i + 1];

    if ((arg === '--profile' || arg === '-p') && next) {
      result.profile = next; i += 2; continue;
    }
    if (arg === '--provider' && next) {
      result.provider = next; i += 2; continue;
    }
    if (arg === '--model' && next) {
      result.model = next; i += 2; continue;
    }
    if (arg === '--local' && next) {
      result.local = next; i += 2; continue;
    }
    if (arg === '--cloud' && next) {
      result.cloud = next; i += 2; continue;
    }
    if (arg === '--reasoning') {
      result.reasoning = true; i++; continue;
    }
    if (arg === '--reasoning-effort' && next) {
      result.reasoningEffort = next; i += 2; continue;
    }
    result.remaining.push(arg);
    i++;
  }
  return result;
}

// ─── Public: apply config from args ──────────────────────────────────────────

/**
 * Parse CLI args, apply a named profile (if given), then overlay any
 * explicit flags.  Call this once at startup, before importing llm.ts.
 *
 * Returns a human-readable description of the active configuration.
 */
export function applyConfig(argv?: string[]): string {
  const pf = loadProfiles();
  const args = parseArgs(argv);

  // Step 1 — apply named profile as a base
  const profileName = args.profile ?? pf.default;
  if (profileName && pf.profiles[profileName]) {
    applyProfile(pf.profiles[profileName]);
  } else if (args.profile) {
    const available = Object.keys(pf.profiles).join(', ');
    console.warn(`[config] Unknown profile "${args.profile}". Available: ${available}`);
  }

  // Step 2 — overlay explicit CLI flags (highest priority)
  if (args.local && args.cloud) {
    delete process.env.LLM_PROVIDER;
    process.env.LLM_PROVIDER_LOCAL = args.local;
    process.env.LLM_PROVIDER_CLOUD = args.cloud;
    process.env.LLM_HYBRID_FALLBACK = 'true';
  } else if (args.provider) {
    delete process.env.LLM_PROVIDER_LOCAL;
    delete process.env.LLM_PROVIDER_CLOUD;
    process.env.LLM_PROVIDER = args.provider;
  }

  if (args.model) {
    const p = (process.env.LLM_PROVIDER ?? '').toLowerCase();
    if (p === 'deepseek') process.env.DEEPSEEK_MODEL  = args.model;
    if (p === 'gemini')   process.env.GEMINI_MODEL     = args.model;
    if (p === 'groq')     process.env.GROQ_MODEL       = args.model;
    if (p === 'ollama')   process.env.OLLAMA_MODEL      = args.model;
    if (p === 'lmstudio') process.env.LMSTUDIO_TOOL_MODEL = args.model;
  }

  if (args.reasoning !== undefined) process.env.DEEPSEEK_REASONING = String(args.reasoning);
  if (args.reasoningEffort)         process.env.DEEPSEEK_REASONING_EFFORT = args.reasoningEffort;

  return describeActiveConfig();
}

// ─── Runtime profile switch ───────────────────────────────────────────────────

/**
 * Switch to a named profile (or a raw provider name) at runtime.
 * Returns a description string, or an error message if the name is unknown.
 * Caller must also call clearProviderRegistry() from llm.ts after this.
 */
export function switchProfile(nameOrProvider: string): string {
  const pf = loadProfiles();

  if (pf.profiles[nameOrProvider]) {
    applyProfile(pf.profiles[nameOrProvider]);
    return `✅ Switched to profile "${nameOrProvider}": ${describeActiveConfig()}`;
  }

  // Treat as raw provider name (e.g. "/provider deepseek")
  const validProviders = ['gemini', 'groq', 'deepseek', 'lmstudio', 'ollama'];
  if (validProviders.includes(nameOrProvider.toLowerCase())) {
    delete process.env.LLM_PROVIDER_LOCAL;
    delete process.env.LLM_PROVIDER_CLOUD;
    process.env.LLM_PROVIDER = nameOrProvider.toLowerCase();
    return `✅ Provider set to "${nameOrProvider}": ${describeActiveConfig()}`;
  }

  const available = Object.keys(pf.profiles).join(', ');
  return `❌ Unknown profile or provider "${nameOrProvider}".\nAvailable profiles: ${available}\nValid providers: ${validProviders.join(', ')}`;
}

/**
 * List all available profiles with descriptions.
 */
export function listProfiles(): string {
  const pf = loadProfiles();
  const lines = Object.entries(pf.profiles).map(([name, p]) => {
    const active = name === (pf.default ?? 'local') ? ' ← default' : '';
    const desc   = p.description ? `  ${p.description}` : '';
    return `  ${name}${active}${desc}`;
  });
  return `Available profiles:\n${lines.join('\n')}`;
}

// ─── Describe current config ──────────────────────────────────────────────────

export function describeActiveConfig(): string {
  const local = process.env.LLM_PROVIDER_LOCAL;
  const cloud = process.env.LLM_PROVIDER_CLOUD;
  if (local && cloud) return `hybrid (local=${local}, cloud=${cloud})`;

  const provider = (process.env.LLM_PROVIDER ?? 'ollama').toLowerCase();
  const modelEnv: Record<string, string | undefined> = {
    deepseek: process.env.DEEPSEEK_MODEL,
    gemini:   process.env.GEMINI_MODEL,
    groq:     process.env.GROQ_MODEL,
    ollama:   process.env.OLLAMA_MODEL,
    lmstudio: process.env.LMSTUDIO_TOOL_MODEL,
  };
  const model   = modelEnv[provider] ?? '(default)';
  const extras: string[] = [];
  if (provider === 'deepseek' && process.env.DEEPSEEK_REASONING === 'true') {
    extras.push(`reasoning=${process.env.DEEPSEEK_REASONING_EFFORT ?? 'medium'}`);
  }
  return `${provider} / ${model}${extras.length ? ` [${extras.join(', ')}]` : ''}`;
}
