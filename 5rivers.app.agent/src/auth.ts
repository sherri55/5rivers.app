/**
 * Auth mapping: maps chat platform users to JWT tokens for the 5Rivers API.
 *
 * Tokens are stored in a JSON file at AUTH_MAP_PATH (default: ./auth-map.json).
 * Users register via /register <token> command in chat.
 *
 * Auto-login: if FIVE_RIVERS_EMAIL, FIVE_RIVERS_PASSWORD, FIVE_RIVERS_ORG_SLUG
 * are set, the agent logs in automatically and caches the token in memory.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

// ── Auto-login token cache ─────────────────────────────────

// Read lazily so dotenv has time to load before these are used
const getEmail    = () => process.env.FIVE_RIVERS_EMAIL;
const getPassword = () => process.env.FIVE_RIVERS_PASSWORD;
const getOrgSlug  = () => process.env.FIVE_RIVERS_ORG_SLUG;
const getApiUrl   = () => process.env.FIVE_RIVERS_API_URL ?? 'http://localhost:4000/api';

let cachedToken: string | null = null;
let loginInProgress: Promise<string> | null = null;

async function fetchNewToken(): Promise<string> {
  const res = await fetch(`${getApiUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: getEmail(),
      password: getPassword(),
      organizationSlug: getOrgSlug(),
    }),
  });
  const json = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    const msg = (json?.error as Record<string, unknown>)?.message as string
      || json?.message as string
      || `Login failed: HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json.token as string;
}

/** Returns a valid token, logging in automatically if credentials are configured. */
export async function getAutoToken(): Promise<string | null> {
  // Fall back to env-provided static token
  if (!getEmail() || !getPassword() || !getOrgSlug()) {
    return process.env.FIVE_RIVERS_TOKEN ?? null;
  }

  if (cachedToken) return cachedToken;

  // Deduplicate concurrent login calls
  if (!loginInProgress) {
    loginInProgress = fetchNewToken().then((token) => {
      cachedToken = token;
      loginInProgress = null;
      console.log('[auth] Auto-login successful, token cached in memory.');
      return token;
    }).catch((err) => {
      loginInProgress = null;
      throw err;
    });
  }

  return loginInProgress;
}

/** Clears the cached token so the next call to getAutoToken() re-authenticates. */
export function clearAutoToken(): void {
  cachedToken = null;
}

const AUTH_MAP_PATH = process.env.AUTH_MAP_PATH ?? './auth-map.json';

// Key format: "telegram:12345" or "whatsapp:15551234567" or "web:userId"
type AuthMap = Record<string, string>;

let authMap: AuthMap = {};

export function loadAuthMap(): void {
  if (existsSync(AUTH_MAP_PATH)) {
    try {
      authMap = JSON.parse(readFileSync(AUTH_MAP_PATH, 'utf-8'));
    } catch {
      authMap = {};
    }
  }
}

function saveAuthMap(): void {
  writeFileSync(AUTH_MAP_PATH, JSON.stringify(authMap, null, 2), 'utf-8');
}

export function getToken(platform: string, userId: string): string | undefined {
  return authMap[`${platform}:${userId}`];
}

export function setToken(platform: string, userId: string, token: string): void {
  authMap[`${platform}:${userId}`] = token;
  saveAuthMap();
}

export function removeToken(platform: string, userId: string): void {
  delete authMap[`${platform}:${userId}`];
  saveAuthMap();
}

export function hasToken(platform: string, userId: string): boolean {
  return !!authMap[`${platform}:${userId}`];
}
