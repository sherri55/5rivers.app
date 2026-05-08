/**
 * 5Rivers Agent — main exports
 *
 * Auto-loads the agent's own .env so env vars are available whether the agent
 * is started via the CLI or imported by the server at runtime.
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
// override: false — don't overwrite vars already set by the host process
dotenv.config({ path: resolve(__dirname, '../.env'), override: false });

export { processMessage, resetConversation, type AgentResponse } from './llm.js';
export { getToken, setToken, removeToken, hasToken, loadAuthMap, getAutoToken, clearAutoToken } from './auth.js';
export {
  getHistory,
  addMessage,
  clearHistory,
  setSystemPrompt,
} from './conversation.js';
