/**
 * ContactSection — Chapter 4 of the homepage.
 *
 * Two-column layout (single column on mobile): contact details on the
 * left, glass-panel inquiry form on the right. The form posts to the
 * public `/api/inquiries` endpoint — no auth required.
 *
 * Form state is local to this component since the data isn't shared
 * with anything else. Status is a small finite state machine
 * (idle → submitting → success | error).
 */

import { useState } from 'react';
import { api, ApiError } from '@/api/client';

// ─── Form state ─────────────────────────────────────────────────────────────

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

// ─── Top-level section ──────────────────────────────────────────────────────

export function ContactSection() {
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
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Could not send your message. Please try again.';
      setErrorMessage(msg);
    }
  }

  return (
    <section className="public-chapter bg-white" id="ch-contact">
      <div className="public-chapter-bg gs-bg" data-speed="0.5">
        <img
          alt="Red dump truck side panel detail"
          src="/images/homepage-form.png"
        />
      </div>
      <div
        className="public-chapter-overlay"
        style={{ background: 'rgba(255,255,255,0.8)' }}
      />
      <div className="public-chapter-content items-center text-center">
        <h2
          className="public-huge-text text-[var(--color-public-on-surface)] gs-title-scale font-bold mb-12"
          data-speed="1.2"
        >
          GET IN TOUCH
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start max-w-7xl w-full">
          <ContactDetails />

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

            <ServiceTypeField
              value={form.serviceType}
              onChange={(v) => update('serviceType', v)}
            />

            <ProjectDetailsField
              value={form.projectDetails}
              onChange={(v) => update('projectDetails', v)}
            />

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

// ─── Sub-components ─────────────────────────────────────────────────────────

function ContactDetails() {
  return (
    <div className="flex flex-col gap-12 gs-reveal-y" data-speed="1.1">
      <div>
        <div className="public-label-mono text-sm text-[var(--color-public-on-surface-variant)] tracking-[0.15em] uppercase">
          +1 226-700-5268
          <br />
          +1 437-679-9350
          <br />
          <br />
          info@5riverstruckinginc.ca
        </div>
      </div>
      <div>
        <div className="public-label-mono text-sm text-[var(--color-public-on-surface-variant)] tracking-[0.15em] uppercase">
          140 Cherryhill Place
          <br />
          London, ON N6H 4M5, Canada
        </div>
      </div>
    </div>
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

interface ServiceTypeFieldProps {
  value: string;
  onChange: (v: string) => void;
}

function ServiceTypeField({ value, onChange }: ServiceTypeFieldProps) {
  return (
    <div className="flex flex-col gap-2 text-left">
      <label className="public-label-mono text-[10px] text-[var(--color-public-primary)] font-bold tracking-widest">
        SERVICE TYPE
      </label>
      <select
        className="bg-transparent border-b border-[var(--color-public-primary)]/20 py-2 focus:outline-none focus:border-[var(--color-public-primary)] transition-colors"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="excavation">Excavation</option>
        <option value="hauling">Hauling</option>
        <option value="grading">Grading</option>
        <option value="interlock">Interlock</option>
      </select>
    </div>
  );
}

interface ProjectDetailsFieldProps {
  value: string;
  onChange: (v: string) => void;
}

function ProjectDetailsField({ value, onChange }: ProjectDetailsFieldProps) {
  return (
    <div className="flex flex-col gap-2 text-left">
      <label className="public-label-mono text-[10px] text-[var(--color-public-primary)] font-bold tracking-widest">
        PROJECT DETAILS
      </label>
      <textarea
        className="bg-transparent border-b border-[var(--color-public-primary)]/20 py-2 focus:outline-none focus:border-[var(--color-public-primary)] transition-colors resize-none"
        placeholder="Tell us about your project..."
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
