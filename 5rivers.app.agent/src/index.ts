/**
 * 5Rivers Agent — main exports
 *
 * Auto-loads the agent's own .env so env vars are available whether the agent
 * is started via the CLI or imported by the server at runtime.
 *
 * Also applies the active profile (AGENT_PROFILE env var → agent.profiles.json)
 * so the server process honours `start.ps1 -Mode web -Model deepseek` the same
 * way the agent CLI does. Without this, the server would always use whatever
 * LLM_PROVIDER is set in .env regardless of how the stack was started.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
// override: false — don't overwrite vars already set by the host process
dotenv.config({ path: resolve(__dirname, '../.env'), override: false });

// Apply named profile BEFORE llm.ts providers are touched. Providers read
// process.env lazily (only when their chat() is called), so it's enough that
// this runs at module load — every subsequent processMessage() then sees the
// right LLM_PROVIDER / DEEPSEEK_MODEL / etc.
import { applyConfig } from './config.js';
const _activeConfig = applyConfig();
console.log(`[agent] Active config: ${_activeConfig}`);

export { processMessage, resetConversation, type AgentResponse } from './llm.js';
export { getToken, setToken, removeToken, hasToken, loadAuthMap, getAutoToken, clearAutoToken } from './auth.js';
export {
  getHistory,
  addMessage,
  clearHistory,
  setSystemPrompt,
} from './conversation.js';
