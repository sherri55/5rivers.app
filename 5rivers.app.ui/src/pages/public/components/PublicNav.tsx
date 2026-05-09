/**
 * PublicNav — fixed glass navbar for the marketing homepage.
 *
 * Layout: 5RIVERS logo (left) · in-page section anchors (md+) · DASHBOARD
 * + CONTACT US buttons (always visible). On phones the section anchors
 * collapse and the buttons shrink to fit alongside the logo.
 */

import { Link } from 'react-router-dom';

export function PublicNav() {
  return (
    <header className="fixed top-0 left-0 w-full z-[60] px-4 sm:px-8 py-4 sm:py-6 flex justify-between items-center gap-3 public-glass-panel border-b border-[var(--color-public-primary)]/20">
      <Link
        to="/"
        className="public-display text-xl sm:text-2xl font-bold tracking-tighter text-[var(--color-public-primary)] flex-shrink-0"
      >
        5RIVERS
      </Link>

      <nav className="hidden md:flex items-center gap-12">
        <a
          className="text-[var(--color-public-primary)] font-bold public-label-mono text-xs hover:tracking-widest transition-all duration-300"
          href="#ch-services"
        >
          SERVICES
        </a>
        <a
          className="text-[var(--color-public-on-surface-variant)] font-bold public-label-mono text-xs hover:text-[var(--color-public-primary)] hover:tracking-widest transition-all duration-300"
          href="#ch-about"
        >
          ABOUT
        </a>
        <a
          className="text-[var(--color-public-on-surface-variant)] font-bold public-label-mono text-xs hover:text-[var(--color-public-primary)] hover:tracking-widest transition-all duration-300"
          href="#ch-contact"
        >
          CONTACT
        </a>
      </nav>

      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <Link
          to="/dashboard"
          className="border border-[var(--color-public-primary)] text-[var(--color-public-primary)] px-3 sm:px-5 py-2 sm:py-3 public-label-mono text-[10px] sm:text-xs tracking-wider sm:tracking-widest hover:bg-[var(--color-public-primary)] hover:text-white transition-colors whitespace-nowrap"
        >
          DASHBOARD
        </Link>
        <a
          href="#ch-contact"
          className="bg-[var(--color-public-primary)] text-white px-3 sm:px-6 py-2 sm:py-3 public-label-mono text-[10px] sm:text-xs tracking-wider sm:tracking-widest hover:bg-[var(--color-public-primary-container)] transition-colors whitespace-nowrap"
        >
          CONTACT&nbsp;US
        </a>
      </div>
    </header>
  );
}
