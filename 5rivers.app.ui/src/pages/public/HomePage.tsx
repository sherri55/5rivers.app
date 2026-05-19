import { useRef } from 'react';
import { PublicNav } from './components/PublicNav';
import { HeroSection } from './components/HeroSection';
import { StatsSection } from './components/StatsSection';
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
        <StatsSection />
        <ServicesSection />
        <AboutSection />
        <ContactSection />
      </main>
      <PublicFooter />
    </div>
  );
}
