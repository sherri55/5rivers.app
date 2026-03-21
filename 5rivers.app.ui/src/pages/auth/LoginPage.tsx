import { useState, type FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/auth';
import { ButtonSpinner } from '@/components/ui/Spinner';

// ============================================
// Login Page — matches Stitch sign-in design
// ============================================

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [orgSlug, setOrgSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, orgSlug);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Asymmetric background element */}
      <div className="fixed top-0 right-0 w-1/2 h-full bg-surface-container-low -z-10 transform skew-x-[-12deg] translate-x-20" />

      <main className="w-full max-w-[1200px] flex flex-col md:flex-row items-center justify-center gap-16 px-6 py-12">
        {/* Brand section (desktop only) */}
        <div className="hidden md:flex flex-col gap-6 max-w-md">
          <div className="text-primary font-black text-3xl tracking-tighter uppercase">
            5Rivers Trucking
          </div>
          <h1 className="text-on-surface font-semibold text-4xl leading-tight">
            Precision Fleet
            <br />
            Management Systems.
          </h1>
          <p className="text-on-surface-variant text-base leading-relaxed">
            Manage your trucking operations with institutional-grade control.
            Track jobs, drivers, invoices, and fleet performance in real-time.
          </p>
          <div className="flex items-center gap-4 mt-4">
            <div className="h-[1px] w-12 bg-outline-variant/30" />
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-outline">
              Operational Platform
            </span>
          </div>
        </div>

        {/* Login card */}
        <div className="w-full max-w-[440px]">
          <div className="bg-surface-container-lowest border border-outline-variant/15 p-10 rounded-xl shadow-2xl shadow-on-surface/5 flex flex-col gap-8">
            {/* Mobile branding */}
            <div className="md:hidden flex flex-col items-center gap-2 mb-4">
              <span className="text-primary font-black text-xl tracking-tighter uppercase">
                5Rivers Trucking
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-on-surface text-2xl font-semibold tracking-tight">
                Sign In
              </h2>
              <p className="text-on-surface-variant text-sm">
                Enter your credentials to access the fleet dashboard.
              </p>
            </div>

            {error && (
              <div className="bg-error-container text-on-error-container px-4 py-3 rounded-lg text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Org slug */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-outline px-1">
                  Organization Slug
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-[20px]">
                    corporate_fare
                  </span>
                  <input
                    type="text"
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value)}
                    required
                    className="w-full bg-surface-container-highest border-none pl-12 pr-4 py-3.5 rounded-lg text-sm focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest transition-all placeholder:text-outline/60"
                    placeholder="e.g. 5rivers-trucking"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-outline px-1">
                  Email Address
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-[20px]">
                    alternate_email
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-surface-container-highest border-none pl-12 pr-4 py-3.5 rounded-lg text-sm focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest transition-all placeholder:text-outline/60"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-outline">
                    Password
                  </label>
                </div>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors text-[20px]">
                    lock_open
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-surface-container-highest border-none pl-12 pr-12 py-3.5 rounded-lg text-sm focus:ring-1 focus:ring-primary focus:bg-surface-container-lowest transition-all placeholder:text-outline/60"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="gradient-primary mt-4 py-4 rounded-lg text-on-primary font-bold text-sm tracking-wide shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <ButtonSpinner />
                ) : (
                  <>
                    <span>Sign In</span>
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center gap-4">
              <div className="h-[1px] flex-grow bg-outline-variant/15" />
              <span className="text-[10px] font-bold text-outline uppercase tracking-widest">
                Authorized Access Only
              </span>
              <div className="h-[1px] flex-grow bg-outline-variant/15" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 w-full py-6 px-10 flex items-center justify-center text-[11px] font-medium text-outline uppercase tracking-[0.1em]">
        <div className="flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-full ring-1 ring-outline-variant/10">
          <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-on-surface-variant">System Status: Operational</span>
        </div>
      </footer>
    </div>
  );
}
