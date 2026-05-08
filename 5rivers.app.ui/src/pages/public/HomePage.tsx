/**
 * HomePage — public marketing site for 5Rivers Trucking.
 *
 * Single long-scrolling page with four "chapters" (Hero, Services, About,
 * Contact). GSAP ScrollTrigger drives parallax backgrounds, typography
 * sweeps, and stagger reveals.
 *
 * Why this lives in /pages/public/ (not its own app):
 *   - same Vite build → one deploy artifact
 *   - share design tokens with the dashboard via styles.css
 *   - the contact form can hit /api/inquiries on the same origin
 *
 * The visual styling intentionally diverges from the dashboard (maroon
 * primary instead of blue, sharp 0px-corner buttons, big display type) —
 * it's customer-facing, the dashboard is a tool.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { api, ApiError } from '@/api/client';

gsap.registerPlugin(ScrollTrigger);

// ─── Public navbar ──────────────────────────────────────────────────────────

function PublicNav() {
  return (
    <header className="fixed top-0 left-0 w-full z-[60] px-8 py-6 flex justify-between items-center public-glass-panel border-b border-[var(--color-public-primary)]/20">
      <Link to="/" className="public-display text-2xl font-bold tracking-tighter text-[var(--color-public-primary)]">
        5RIVERS
      </Link>

      <nav className="hidden md:flex items-center gap-12">
        <a className="text-[var(--color-public-primary)] font-bold public-label-mono text-xs hover:tracking-widest transition-all duration-300" href="#ch-services">
          SERVICES
        </a>
        <a className="text-[var(--color-public-on-surface-variant)] font-bold public-label-mono text-xs hover:text-[var(--color-public-primary)] hover:tracking-widest transition-all duration-300" href="#ch-about">
          ABOUT
        </a>
        <a className="text-[var(--color-public-on-surface-variant)] font-bold public-label-mono text-xs hover:text-[var(--color-public-primary)] hover:tracking-widest transition-all duration-300" href="#ch-contact">
          CONTACT
        </a>
      </nav>

      <div className="flex items-center gap-3">
        <Link
          to="/dashboard"
          className="hidden sm:inline-block border border-[var(--color-public-primary)] text-[var(--color-public-primary)] px-5 py-3 public-label-mono text-xs tracking-widest hover:bg-[var(--color-public-primary)] hover:text-white transition-colors"
        >
          DASHBOARD
        </Link>
        <a
          href="#ch-contact"
          className="bg-[var(--color-public-primary)] text-white px-6 py-3 public-label-mono text-xs tracking-widest hover:bg-[var(--color-public-primary-container)] transition-colors"
        >
          CONTACT US
        </a>
      </div>
    </header>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="public-chapter bg-white" id="ch-hero">
      <div className="public-chapter-bg gs-bg" data-speed="0.5">
        <img
          alt="Hero Truck"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAgd1cDE9LD38JpZgwSrWRXzbsf1jylA5lb-P4AWGGdnCrqsTCxEbOoIWBFvTtgxSzCYvJCcYC82-GYKmN2dpTn92mlAGuHe_RuNT3VYTtdCrPFsp6nbYrEPJNsIPSxutFD83XRvllSze1q_hxb7Fc2bkA3EFnvTRRrZJct2eIkgt0moXzQ1o5Cx-sWjotQv1TKPJpnQY1PE7LqxfUUgAW0oXYOTJORS29S9owZ0tnw0Tf_Q5QsXkmxTytWvEattolOVKamrFui"
        />
      </div>
      <div className="public-chapter-overlay"></div>
      <div className="public-chapter-content">
        <h1 className="public-huge-text text-[var(--color-public-on-surface)] gs-title-left font-bold" data-speed="1.2">
          PROFESSIONAL
        </h1>
        <h1 className="public-huge-text text-[var(--color-public-primary)] italic gs-title-right font-bold" data-speed="1.5">
          HAULING.
        </h1>
        <div className="mt-12 max-w-xl gs-reveal-y" data-speed="1.1">
          <p className="text-lg text-[var(--color-public-on-surface-variant)] leading-relaxed border-l-4 border-[var(--color-public-primary)] pl-6">
            Professional dump truck hauling, excavating, and grading services. Specializing in efficient and reliable solutions for your construction needs.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Services ───────────────────────────────────────────────────────────────

function ServicesSection() {
  return (
    <section className="public-chapter bg-[var(--color-public-surface-low)]" id="ch-services">
      <div className="public-chapter-bg gs-bg" data-speed="0.6">
        <img
          alt="Services"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDCKBSpM3Br3oJIzb3HXgFe-8vT7fpdwp4N4eKMIms9VSfzrF5nk3wNkSqp-iIG9c57JyOhfJaqZU27aQdfXpRGCS03EJf6oPw6ZD48dg9ncOHIQW_oaJGO2MW0z5Rtg4oE5xka8O2KOGX8Hq402oFu3Kx2KJ4QUI2PTZgMLxT3eUsCh7o4OGCve1cFjTYLb79CVImu2B_zJIl-0or9vnPFlph8x3EayJHgXYAiNOOfGSI5-kU0On2ZqtdPkvEU5wI1-uJrBJPI"
        />
      </div>
      <div className="public-chapter-overlay"></div>
      <div className="public-chapter-content items-end text-right">
        <h2 className="public-huge-text text-[var(--color-public-on-surface)] gs-title-right font-bold" data-speed="1.3">
          CORE
        </h2>
        <h2 className="public-huge-text text-[var(--color-public-primary)] gs-title-left font-bold" data-speed="1.6">
          SERVICES
        </h2>
        <div className="mt-16 flex flex-col md:flex-row gap-8 gs-reveal-y" data-speed="1.2">
          <div className="public-glass-panel p-8 text-left w-80">
            <h3 className="public-display text-2xl font-bold mb-4">Excavation &amp; Grading</h3>
            <p className="text-base text-[var(--color-public-on-surface-variant)] mb-6">
              Precision earth moving, trenching, and fine grading operations.
            </p>
          </div>
          <div className="public-glass-panel p-8 text-left w-80">
            <h3 className="public-display text-2xl font-bold mb-4">Driveways &amp; Patios</h3>
            <p className="text-base text-[var(--color-public-on-surface-variant)] mb-6">
              Interlock driveways, patios, and professional site cleanup services.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── About ──────────────────────────────────────────────────────────────────

function AboutSection() {
  return (
    <section className="public-chapter bg-[var(--color-public-primary)] text-white" id="ch-about">
      <div className="public-chapter-bg gs-bg" data-speed="0.4">
        <div className="absolute inset-0 bg-[var(--color-public-primary)] opacity-90 mix-blend-multiply"></div>
        <img
          alt="Tech Background"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-eBK05MMBv44uVDwlk2UMg5l3BVtR7YBw3LGntpvX0Cwql6bn3w9z9oPMTzvHgqGOQv04JyXTTXKNzsN9li8-vAWFKJTJtKRRJQcYH0PE8QrFe3TEcqwh1b6m6b9PEYaBXuDCC7lh974K5Rdxwt3iGFuQAv-Dd7DtcjS6hO65X8lTMfgurneYBi3OWwMcm5me_elC57DwYBWQiPcUEymz1L_VdWM6eMwm2bxIeZjSLtc7Dv6twLvQj7cIfGDShuHkRK-wRber"
        />
      </div>
      <div className="public-chapter-overlay public-chapter-overlay-dark"></div>
      <div className="public-chapter-content">
        <h2 className="public-huge-text text-white gs-title-left font-bold" data-speed="1.4">
          PREMIER
        </h2>
        <h2 className="public-huge-text text-white/50 gs-title-right font-bold" data-speed="1.7">
          CONSTRUCTION
        </h2>
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl gs-reveal-y" data-speed="1.1">
          <div className="border border-white/20 p-8 bg-black/20 backdrop-blur-md">
            <span className="material-symbols-outlined text-white text-3xl mb-4">location_on</span>
            <h4 className="public-display text-xl mb-2">London, Ontario</h4>
            <p className="text-base text-white/70">
              Your premier destination for top-notch construction services in London and the surrounding area. Specializing in excavating, earth moving, and grading.
            </p>
          </div>
          <div className="border border-white/20 p-8 bg-black/20 backdrop-blur-md">
            <span className="material-symbols-outlined text-white text-3xl mb-4">handyman</span>
            <h4 className="public-display text-xl mb-2">Unparalleled Quality</h4>
            <p className="text-base text-white/70">
              Dedicated to delivering professionalism and efficiency. We are committed to exceeding your expectations with our high-quality workmanship and attention to detail.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Contact ────────────────────────────────────────────────────────────────

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  serviceType: string;
  projectDetails: string;
}

const INITIAL_FORM: FormState = {
  fullName: '',
  email: '',
  phone: '',
  serviceType: 'excavation',
  projectDetails: '',
};

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

function ContactSection() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim() || !form.email.trim()) return;
    setStatus('submitting');
    setErrorMessage('');
    try {
      await api.post('/inquiries', {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        serviceType: form.serviceType,
        projectDetails: form.projectDetails.trim() || null,
      });
      setStatus('success');
      setForm(INITIAL_FORM);
    } catch (err) {
      setStatus('error');
      const msg = err instanceof ApiError ? err.message : 'Could not send your message. Please try again.';
      setErrorMessage(msg);
    }
  }

  return (
    <section className="public-chapter bg-white" id="ch-contact">
      <div className="public-chapter-bg gs-bg" data-speed="0.5"></div>
      <div className="public-chapter-overlay" style={{ background: 'rgba(255,255,255,0.8)' }}></div>
      <div className="public-chapter-content items-center text-center">
        <h2 className="public-huge-text text-[var(--color-public-on-surface)] gs-title-scale font-bold mb-12" data-speed="1.2">
          GET IN TOUCH
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start max-w-7xl w-full">
          <div className="flex flex-col gap-12 gs-reveal-y" data-speed="1.1">
            <div>
              <div className="public-label-mono text-sm text-[var(--color-public-on-surface-variant)] tracking-[0.15em] uppercase">
                519-619-1816
                <br />
                info@5riverstruckinginc.ca
              </div>
            </div>
            <div>
              <div className="public-label-mono text-sm text-[var(--color-public-on-surface-variant)] tracking-[0.15em] uppercase">
                942 Guildwood Blvd
                <br />
                London, ON N6H 4G3, Canada
              </div>
            </div>
          </div>

          <form
            className="public-glass-panel p-8 md:p-12 flex flex-col gap-6 gs-reveal-y"
            data-speed="1.3"
            onSubmit={onSubmit}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label="FULL NAME"
                type="text"
                placeholder="John Doe"
                value={form.fullName}
                onChange={(v) => update('fullName', v)}
                required
              />
              <FormField
                label="EMAIL"
                type="email"
                placeholder="john@example.com"
                value={form.email}
                onChange={(v) => update('email', v)}
                required
              />
            </div>
            <FormField
              label="PHONE (OPTIONAL)"
              type="tel"
              placeholder="519-555-0123"
              value={form.phone}
              onChange={(v) => update('phone', v)}
            />
            <div className="flex flex-col gap-2 text-left">
              <label className="public-label-mono text-[10px] text-[var(--color-public-primary)] font-bold tracking-widest">
                SERVICE TYPE
              </label>
              <select
                className="bg-transparent border-b border-[var(--color-public-primary)]/20 py-2 focus:outline-none focus:border-[var(--color-public-primary)] transition-colors"
                value={form.serviceType}
                onChange={(e) => update('serviceType', e.target.value)}
              >
                <option value="excavation">Excavation</option>
                <option value="hauling">Hauling</option>
                <option value="grading">Grading</option>
                <option value="interlock">Interlock</option>
              </select>
            </div>
            <div className="flex flex-col gap-2 text-left">
              <label className="public-label-mono text-[10px] text-[var(--color-public-primary)] font-bold tracking-widest">
                PROJECT DETAILS
              </label>
              <textarea
                className="bg-transparent border-b border-[var(--color-public-primary)]/20 py-2 focus:outline-none focus:border-[var(--color-public-primary)] transition-colors resize-none"
                placeholder="Tell us about your project..."
                rows={3}
                value={form.projectDetails}
                onChange={(e) => update('projectDetails', e.target.value)}
              />
            </div>

            {status === 'success' && (
              <div className="border border-green-500/40 bg-green-50 p-4 text-left text-sm text-green-900">
                Thanks — we received your inquiry and will be in touch shortly.
              </div>
            )}
            {status === 'error' && errorMessage && (
              <div className="border border-red-500/40 bg-red-50 p-4 text-left text-sm text-red-900">
                {errorMessage}
              </div>
            )}

            <button
              className="mt-4 bg-[var(--color-public-primary)] text-white py-4 px-8 public-label-mono text-xs tracking-[0.3em] font-bold hover:bg-[var(--color-public-primary-container)] transition-all hover:tracking-[0.4em] disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? 'SENDING…' : 'SEND MESSAGE'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

interface FormFieldProps {
  label: string;
  type: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}

function FormField({ label, type, placeholder, value, onChange, required }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2 text-left">
      <label className="public-label-mono text-[10px] text-[var(--color-public-primary)] font-bold tracking-widest">
        {label}
      </label>
      <input
        className="bg-transparent border-b border-[var(--color-public-primary)]/20 py-2 focus:outline-none focus:border-[var(--color-public-primary)] transition-colors"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  );
}

// ─── HomePage root ──────────────────────────────────────────────────────────

export function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);

  // GSAP scroll animations — registered when the container mounts so each
  // chapter gets its own ScrollTrigger. Cleanup on unmount kills them all.
  useEffect(() => {
    const ctx = gsap.context(() => {
      const chapters = gsap.utils.toArray<HTMLElement>('.public-chapter');

      chapters.forEach((chapter) => {
        // Parallax background
        const bg = chapter.querySelector('.gs-bg');
        if (bg) {
          gsap.to(bg, {
            yPercent: 30,
            ease: 'none',
            scrollTrigger: { trigger: chapter, start: 'top bottom', end: 'bottom top', scrub: true },
          });
        }

        // Aggressive typography parallax — left
        chapter.querySelectorAll<HTMLElement>('.gs-title-left').forEach((el) => {
          const speed = parseFloat(el.dataset.speed ?? '1.5');
          gsap.fromTo(
            el,
            { x: '-20vw' },
            {
              x: '20vw',
              ease: 'none',
              scrollTrigger: { trigger: chapter, start: 'top bottom', end: 'bottom top', scrub: speed },
            },
          );
        });

        // Aggressive typography parallax — right
        chapter.querySelectorAll<HTMLElement>('.gs-title-right').forEach((el) => {
          const speed = parseFloat(el.dataset.speed ?? '1.5');
          gsap.fromTo(
            el,
            { x: '20vw' },
            {
              x: '-20vw',
              ease: 'none',
              scrollTrigger: { trigger: chapter, start: 'top bottom', end: 'bottom top', scrub: speed },
            },
          );
        });

        // Scale-in title
        chapter.querySelectorAll<HTMLElement>('.gs-title-scale').forEach((el) => {
          gsap.fromTo(
            el,
            { scale: 0.8, opacity: 0 },
            {
              scale: 1.2,
              opacity: 1,
              ease: 'none',
              scrollTrigger: { trigger: chapter, start: 'top center', end: 'bottom top', scrub: true },
            },
          );
        });

        // Stagger reveals for content blocks
        const reveals = chapter.querySelectorAll<HTMLElement>('.gs-reveal-y');
        if (reveals.length) {
          gsap.from(reveals, {
            y: 150,
            opacity: 0,
            duration: 1.2,
            stagger: 0.2,
            ease: 'power4.out',
            scrollTrigger: {
              trigger: chapter,
              start: 'top 60%',
              toggleActions: 'play reverse play reverse',
            },
          });
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="public-page overflow-x-hidden relative">
      <PublicNav />
      <main className="relative z-10">
        <HeroSection />
        <ServicesSection />
        <AboutSection />
        <ContactSection />
      </main>
      <footer className="bg-[var(--color-public-on-surface)] text-white py-12 px-8 text-center">
        <p className="public-label-mono text-xs tracking-widest opacity-70">
          © {new Date().getFullYear()} 5RIVERS TRUCKING INC. — LONDON, ON
        </p>
      </footer>
    </div>
  );
}
