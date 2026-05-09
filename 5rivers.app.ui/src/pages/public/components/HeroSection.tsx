/**
 * HeroSection — Chapter 1 of the homepage.
 *
 * Full-bleed photo of a red dump truck with the headline
 * "PROFESSIONAL HAULING." rendered in the brand display font.
 *
 * The headline animates horizontally (gs-title-left / gs-title-right)
 * during scroll — see useScrollAnimations.ts. The image parallaxes
 * vertically via the `.gs-bg` class on its wrapper.
 */

export function HeroSection() {
  return (
    <section className="public-chapter bg-white" id="ch-hero">
      <div className="public-chapter-bg gs-bg" data-speed="0.5">
        <img alt="Red dump truck on a construction haul" src="/images/homepage-hero.png" />
      </div>
      <div className="public-chapter-overlay" />
      <div className="public-chapter-content">
        <h1
          className="public-huge-text text-[var(--color-public-on-surface)] gs-title-left font-bold"
          data-speed="1.2"
        >
          PROFESSIONAL
        </h1>
        <h1
          className="public-huge-text text-[var(--color-public-primary)] italic gs-title-right font-bold"
          data-speed="1.5"
        >
          HAULING.
        </h1>
        <div className="mt-12 max-w-xl gs-reveal-y" data-speed="1.1">
          <p className="text-lg text-[var(--color-public-on-surface-variant)] leading-relaxed border-l-4 border-[var(--color-public-primary)] pl-6">
            Professional dump truck hauling, excavating, and grading services.
            Specializing in efficient and reliable solutions for your construction needs.
          </p>
        </div>
      </div>
    </section>
  );
}
