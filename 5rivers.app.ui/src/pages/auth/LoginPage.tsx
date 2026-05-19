import { useState, type FormEvent } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/auth';
import { ButtonSpinner } from '@/components/ui/Spinner';

// ============================================
// Login Page — themed to match the public marketing homepage
// (maroon palette, Space Grotesk display type, sharp 0px corners,
// Space Mono labels). Intentionally diverges from the dashboard's
// blue theme so the public-facing entry path feels like one
// continuous brand.
// ============================================

const MAROON = 'var(--color-public-primary)';            // #570000
const MAROON_DARK = 'var(--color-public-primary-container)'; // #800000

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
    <div className="bg-white text-[var(--color-public-on-surface)] min-h-screen flex flex-col items-center justify-center selection:bg-[var(--color-public-primary)] selection:text-white">
      {/* Asymmetric maroon skew background — echoes the marketing site */}
      <div
        className="fixed top-0 right-0 w-1/2 h-full -z-10 transform skew-x-[-12deg] translate-x-20"
        style={{ backgroundColor: 'var(--color-public-surface-low)' }}
      />

      {/* Back-to-home link, top-left */}
      <Link
        to="/"
        className="fixed top-6 left-8 z-10 flex items-center gap-2 text-[10px] tracking-widest uppercase font-bold transition-colors hover:tracking-[0.25em]"
        style={{ color: MAROON, fontFamily: 'var(--font-label-mono)' }}
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Back to Home
      </Link>

      <main className="w-full max-w-[1200px] flex flex-col md:flex-row items-center justify-center gap-16 px-6 py-12">
        {/* Brand section (desktop only) */}
        <div className="hidden md:flex flex-col gap-6 max-w-md">
          <div
            className="font-bold text-3xl tracking-tighter uppercase"
            style={{ color: MAROON, fontFamily: 'var(--font-display)' }}
          >
            5RIVERS TRUCKING
          </div>
          <h1
            className="text-[var(--color-public-on-surface)] font-bold text-4xl leading-tight uppercase"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
          >
            Precision Fleet
            <br />
            <span style={{ color: MAROON, fontStyle: 'italic' }}>Management.</span>
          </h1>
          <p
            className="text-[var(--color-public-on-surface-variant)] text-base leading-relaxed border-l-4 pl-6"
            style={{ borderColor: MAROON }}
          >
            Manage your trucking operations with institutional-grade control.
            Track jobs, drivers, invoices, and fleet performance in real-time.
          </p>
          <div className="flex items-center gap-4 mt-4">
            <div className="h-[1px] w-12" style={{ backgroundColor: MAROON, opacity: 0.3 }} />
            <span
              className="text-[10px] uppercase font-bold tracking-[0.2em]"
              style={{ color: MAROON, fontFamily: 'var(--font-label-mono)' }}
            >
              Operational Platform
            </span>
          </div>
        </div>

        {/* Login card — sharp corners, glass-on-white */}
        <div className="w-full max-w-[440px]">
          <div
            className="bg-white p-10 flex flex-col gap-8"
            style={{
              border: '1px solid rgba(178, 43, 29, 0.2)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Mobile branding */}
            <div className="md:hidden flex flex-col items-center gap-2 mb-4">
              <span
                className="font-bold text-xl tracking-tighter uppercase"
                style={{ color: MAROON, fontFamily: 'var(--font-display)' }}
              >
                5RIVERS TRUCKING
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <h2
                className="text-2xl font-bold tracking-tight uppercase text-[var(--color-public-on-surface)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Sign In
              </h2>
              <p className="text-[var(--color-public-on-surface-variant)] text-sm">
                Enter your credentials to access the fleet dashboard.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-900 px-4 py-3 text-sm font-medium border border-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* Org slug */}
              <FormField
                label="Organization Slug"
                icon="corporate_fare"
                type="text"
                name="organization"
                autoComplete="organization"
                value={orgSlug}
                onChange={setOrgSlug}
                placeholder="e.g. 5rivers"
                required
              />

              {/* Email */}
              <FormField
                label="Email Address"
                icon="alternate_email"
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={setEmail}
                placeholder="name@company.com"
                required
              />

              {/* Password */}
              <FormField
                label="Password"
                icon="lock_open"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                required
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-[var(--color-public-on-surface-variant)] hover:text-[var(--color-public-primary)] transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                }
              />

              <button
                type="submit"
                disabled={loading}
                className="mt-4 py-4 px-8 text-white font-bold text-xs tracking-[0.3em] uppercase transition-all hover:tracking-[0.4em] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                style={{
                  backgroundColor: MAROON,
                  fontFamily: 'var(--font-label-mono)',
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = MAROON_DARK;
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = MAROON;
                }}
              >
                {loading ? (
                  <ButtonSpinner />
                ) : (
                  <>
                    <span>Sign In</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center gap-4">
              <div className="h-[1px] flex-grow" style={{ backgroundColor: MAROON, opacity: 0.15 }} />
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: MAROON, fontFamily: 'var(--font-label-mono)' }}
              >
                Authorized Access Only
              </span>
              <div className="h-[1px] flex-grow" style={{ backgroundColor: MAROON, opacity: 0.15 }} />
            </div>
          </div>
        </div>
      </main>

      {/* Footer status pill */}
      <footer className="fixed bottom-0 w-full py-6 px-10 flex items-center justify-center text-[11px] font-medium uppercase tracking-[0.1em]">
        <div
          className="flex items-center gap-3 bg-white px-4 py-2"
          style={{
            border: '1px solid rgba(178, 43, 29, 0.2)',
            fontFamily: 'var(--font-label-mono)',
          }}
        >
          <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[var(--color-public-on-surface-variant)]">System Status: Operational</span>
        </div>
      </footer>
    </div>
  );
}

// ─── Local form-field component ─────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  icon: string;
  type: string;
  name: string;
  autoComplete: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  trailing?: React.ReactNode;
}

function FormField({ label, icon, type, name, autoComplete, value, onChange, placeholder, required, trailing }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={name}
        className="text-[10px] font-bold uppercase tracking-widest"
        style={{ color: 'var(--color-public-primary)', fontFamily: 'var(--font-label-mono)' }}
      >
        {label}
      </label>
      <div className="relative group">
        <span
          className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 transition-colors text-[18px] text-[var(--color-public-on-surface-variant)] group-focus-within:text-[var(--color-public-primary)]"
        >
          {icon}
        </span>
        <input
          id={name}
          type={type}
          name={name}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          className="w-full bg-transparent border-b py-2.5 pl-10 pr-10 text-sm focus:outline-none transition-colors placeholder:text-[var(--color-public-on-surface-variant)]/40"
          style={{ borderColor: 'rgba(87, 0, 0, 0.2)' }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-public-primary)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(87, 0, 0, 0.2)')}
        />
        {trailing && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{trailing}</div>
        )}
      </div>
    </div>
  );
}
