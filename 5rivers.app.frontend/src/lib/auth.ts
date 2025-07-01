/**
 * Authentication utilities for client-side authentication checks
 */

/**
 * Check if user is authenticated by verifying token in localStorage
 * @returns boolean indicating if user is authenticated
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('token');
  return !!token;
}

/**
 * Get the current user's token from localStorage
 * @returns the auth token or null if not found
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

/**
 * Clear all authentication data
 * This is a client-side only function - use logoutUser() from api.ts for full logout
 */
export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  // Also clear the cookie on client side
  document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; secure; samesite=strict';
}
