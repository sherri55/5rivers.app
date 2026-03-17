import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { config } from '@/lib/config';

export function LoginModal() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);
    setLoading(false);

    if (!result.success) {
      const msg = result.error || 'Invalid username or password';
      const isNetworkError = /failed to fetch|network error/i.test(msg);
      const isInvalidCreds = /invalid credentials|invalid username or password/i.test(msg);
      setError(
        isNetworkError
          ? `Can't reach the server. Is the backend running at ${config.api.authLoginEndpoint}? Restart the frontend after changing .env.`
          : isInvalidCreds
            ? 'Invalid credentials. Default is username: admin, password: changeme (unless backend .env sets ADMIN_USERNAME / ADMIN_PASSWORD).'
            : msg
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-navy/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-navy-light w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 mx-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary p-2 rounded-xl">
            <span className="material-symbols-outlined text-navy text-2xl">local_shipping</span>
          </div>
          <h1 className="text-xl font-bold text-navy dark:text-white">5Rivers</h1>
        </div>
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">Admin Login</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-navy dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-navy dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
            />
          </div>
          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 space-y-1" role="alert">
              <p>{error}</p>
              {error.includes("Can't reach") && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Backend: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{config.api.authLoginEndpoint}</code>
                </p>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-navy dark:bg-primary text-white dark:text-navy font-semibold rounded-lg hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
