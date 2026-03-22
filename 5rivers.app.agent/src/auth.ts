/**
 * Auth mapping: maps chat platform users to JWT tokens for the 5Rivers API.
 *
 * Tokens are stored in a JSON file at AUTH_MAP_PATH (default: ./auth-map.json).
 * Users register via /register <token> command in chat.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

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
