/**
 * Auth mapping: maps chat platform users to JWT tokens for the 5Rivers API.
 *
 * Tokens are stored in a JSON file at AUTH_MAP_PATH (default: ./auth-map.json).
 * Users register via /register <token> command in chat.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const AUTH_MAP_PATH = process.env.AUTH_MAP_PATH ?? './auth-map.json';
let authMap = {};
export function loadAuthMap() {
    if (existsSync(AUTH_MAP_PATH)) {
        try {
            authMap = JSON.parse(readFileSync(AUTH_MAP_PATH, 'utf-8'));
        }
        catch {
            authMap = {};
        }
    }
}
function saveAuthMap() {
    writeFileSync(AUTH_MAP_PATH, JSON.stringify(authMap, null, 2), 'utf-8');
}
export function getToken(platform, userId) {
    return authMap[`${platform}:${userId}`];
}
export function setToken(platform, userId, token) {
    authMap[`${platform}:${userId}`] = token;
    saveAuthMap();
}
export function removeToken(platform, userId) {
    delete authMap[`${platform}:${userId}`];
    saveAuthMap();
}
export function hasToken(platform, userId) {
    return !!authMap[`${platform}:${userId}`];
}
