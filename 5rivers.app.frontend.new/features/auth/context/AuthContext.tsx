import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { config } from '@/lib/config';

const TOKEN_KEY = 'auth-token';
const TOKEN_EXPIRY_KEY = 'auth-token-expiry';

interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  }, []);

  useEffect(() => {
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (token && expiry && new Date(expiry) < new Date()) {
      logout();
    }
  }, [token, logout]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch(config.api.authLoginEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      const { token: newToken } = data;
      if (!newToken) {
        return { success: false, error: 'Invalid response from server' };
      }

      setToken(newToken);
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(TOKEN_EXPIRY_KEY, expires.toISOString());
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
