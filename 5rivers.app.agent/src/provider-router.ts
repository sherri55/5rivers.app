/**
 * provider-router.ts — hybrid local + cloud LLM routing.
 *
 * The agent supports four providers (Ollama, Groq, LM Studio, Gemini). For
 * cost-sensitive deployments we want most turns to go to a local model
 * (free) and only escalate to a cloud model (paid) when the task is genuinely
 * complex or when the local model has just failed.
 *
 * This module owns three concerns:
 *
 *   1. routeTurn(input)        — classify a turn as 'local' or 'cloud'
 *   2. chatWithFallback(...)   — call the chosen provider, retry on cloud if
 *                                a local turn returns nothing useful
 *   3. helpers                 — read env vars (LLM_PROVIDER_LOCAL, etc.) and
 *                                expose hybridEnabled() / cloudProviderName()
 *                                so other call sites (pipeline gating, OCR
 *                                gating) can ask "is the cloud provider X?".
 *
 * Hybrid mode auto-activates when BOTH `LLM_PROVIDER_LOCAL` and
 * `LLM_PROVIDER_CLOUD` are set in .env. Otherwise the module is a thin
 * pass-through over `getProvider()` and behaviour is identical to the old
 * single-provider mode (back-compat).
 */

import type { Message } from './conversation.js';
import { sanitizeForProvider } from './conversation.js';
import { getProvider, type NormalizedResponse } from './llm.js';
import type { Phase } from './pipeline.js';

// ─── Tier ────────────────────────────────────────────────────────────────────

export type Tier = 'local' | 'cloud';

// ─── Config helpers (env-driven) ─────────────────────────────────────────────

/** True when both `LLM_PROVIDER_LOCAL` and `LLM_PROVIDER_CLOUD` are set. */
export function hybridEnabled(): boolean {
  return !!(process.env.LLM_PROVIDER_LOCAL && process.env.LLM_PROVIDER_CLOUD);
}

/** Name of the local provider in hybrid mode (lowercase). */
export function localProviderName(): string {
  return (process.env.LLM_PROVIDER_LOCAL ?? '').toLowerCase();
}

/**
 * Name of the cloud / "primary heavy-lifter" provider (lowercase).
 *
 * In hybrid mode → `LLM_PROVIDER_CLOUD`.
 * In single-provider mode → `LLM_PROVIDER` (or 'ollama' default), so the
 *   callers that ask "is the cloud Gemini?" still get a sensible answer.
 */
export function cloudProviderName(): string {
  if (process.env.LLM_PROVIDER_CLOUD) return process.env.LLM_PROVIDER_CLOUD.toLowerCase();
  return (process.env.LLM_PROVIDER ?? 'ollama').toLowerCase();
}

/** Whether a failed local turn should be retried on cloud. Defaults true. */
export function hybridFallbackEnabled(): boolean {
  if (!hybridEnabled()) return false;
  const v = (process.env.LLM_HYBRID_FALLBACK ?? 'true').toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'off';
}

// ─── Routing ─────────────────────────────────────────────────────────────────

export interface RouteInput {
  /** Does the current user message attach images? */
  hasImages: boolean;
  /** Active pipeline phase (idle / validating / creating). */
  phase: Phase;
}

/**
 * Decide which tier (local or cloud) handles this turn.
 *
 *   single-provider mode  → always 'cloud' (chatWithFallback uses
 *                           cloudProviderName(), which falls through to
 *                           LLM_PROVIDER — preserving back-compat).
 *
 *   hybrid mode           → 'cloud' for image-bearing turns or any turn
 *                           inside the multi-phase ticket pipeline,
 *                           'local' for everything else.
 */
export function routeTurn(input: RouteInput): Tier {
  if (!hybridEnabled()) return 'cloud';
  if (input.hasImages)        return 'cloud';
  if (input.phase !== 'idle') return 'cloud';
  return 'local';
}

// ─── Chat with fallback ──────────────────────────────────────────────────────

export interface ChatResult {
  response: NormalizedResponse;
  /** Tier that actually produced the response (may differ from `route` if a fallback fired). */
  tier: Tier;
  /** When local→cloud fallback fired, this records why. */
  fallbackReason?: string;
}

/**
 * Send `messages` to the routed provider, with automatic local→cloud
 * fallback on:
 *   • empty content + zero tool calls (the local model "gave up"), or
 *   • any thrown exception (network / parse / timeout / etc).
 *
 * Cloud failures are NOT caught — they propagate to the caller (same as the
 * pre-router behaviour).
 */
export async function chatWithFallback(
  messages: Message[],
  toolFilter: ReadonlySet<string> | undefined,
  route: Tier,
): Promise<ChatResult> {
  const primaryName = route === 'cloud' ? cloudProviderName() : localProviderName();

  const callProvider = async (name: string): Promise<NormalizedResponse> => {
    const provider = getProvider(name);
    const sanitized = sanitizeForProvider(messages, name);
    return provider.chat(sanitized, toolFilter);
  };

  const fallbackTo = async (reason: string): Promise<ChatResult> => {
    const cloudName = cloudProviderName();
    console.warn(`[router] local→cloud fallback (${reason}) — retrying with ${cloudName}`);
    const cloudResp = await callProvider(cloudName);
    return { response: cloudResp, tier: 'cloud', fallbackReason: reason };
  };

  try {
    const response = await callProvider(primaryName);
    if (route === 'local' && isEmpty(response) && hybridFallbackEnabled()) {
      return await fallbackTo('empty_response');
    }
    console.log(`[router] turn=${route} provider=${primaryName} content=${response.content.length}b toolCalls=${response.toolCalls?.length ?? 0}`);
    return { response, tier: route };
  } catch (err) {
    if (route === 'local' && hybridFallbackEnabled()) {
      const message = err instanceof Error ? err.message : String(err);
      return await fallbackTo(`exception:${message.slice(0, 80)}`);
    }
    throw err;
  }
}

/** Empty content AND zero tool calls = the model produced nothing actionable. */
function isEmpty(r: NormalizedResponse): boolean {
  return (!r.content || !r.content.trim()) && !r.toolCalls?.length;
}
