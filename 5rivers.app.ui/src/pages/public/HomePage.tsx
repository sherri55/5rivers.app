/**
 * HomePage — public marketing site for 5Rivers Trucking.
 *
 * Single long-scrolling page with four "chapters" (Hero, Services, About,
 * Contact). GSAP ScrollTrigger drives parallax backgrounds, typography
 * sweeps, and stagger reveals — see `hooks/useScrollAnimations.ts`.
 *
 * Why this lives in /pages/public/ (not its own app):
 *   - same Vite build → one deploy artifact
 *   - share design tokens with the dashboard via styles.css
 *   - the contact form can hit /api/inquiries on the same origin
 *
 * The visual styling intentionally diverges from the dashboard (maroon
 * primary instead of blue, sharp 0px-corner buttons, big display type) —
 * it's customer-facing, the dashboard is a tool.
 *
 * Structure (each is its own file under ./components/):
 *   PublicNav        — fixed glass header with logo + Dashboard / Contact
 *   HeroSection      — Chapter 1: "Professional Hauling."
 *   ServicesSection  — Chapter 2: "Core Services"
 *   AboutSection     — Chapter 3: "Premier Construction"
 *   ContactSection   — Chapter 4: contact details + inquiry form
 *   PublicFooter     — copyright band
 *
 * To add another section, build a `<section className="public-chapter">`
 * component, drop it into `<main>` below, and the GSAP hook will pick up
 * any `.gs-*` selectors automatically.
 */

import { useRef } from 'react';
import { PublicNav } from './components/PublicNav';
import { HeroSection } from './components/HeroSection';
import { ServicesSection } from './components/ServicesSection';
import { AboutSection } from './components/AboutSection';
import { ContactSection } from './components/ContactSection';
import { PublicFooter } from './components/PublicFooter';
import { useScrollAnimations } from './hooks/useScrollAnimations';

export function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  useScrollAnimations(containerRef);

  return (
    <div ref={containerRef} className="public-page overflow-x-hidden relative">
      <PublicNav />
      <main className="relative z-10">
        <HeroSection />
        <ServicesSection />
        <AboutSection />
        <ContactSection />
      </main>
      <PublicFooter />
    </div>
  );
}
