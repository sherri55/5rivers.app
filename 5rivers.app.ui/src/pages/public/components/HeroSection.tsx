export function HeroSection() {
  return (
    <section className="public-chapter bg-white" id="ch-hero">
      <div className="public-chapter-bg gs-bg">
        <img alt="Red dump truck on a construction haul" src="/images/homepage-hero.png" />
      </div>
      <div className="public-chapter-blur" />
      <div className="public-chapter-overlay" />
      <div className="public-chapter-content">
        <div className="gs-line-mask">
          <h1
            className="public-huge-text text-[var(--color-public-on-surface)] font-bold gs-hero-line"
          >
            PROFESSIONAL
          </h1>
        </div>
        <div className="gs-line-mask">
          <h1
            className="public-huge-text text-[var(--color-public-primary)] italic font-bold gs-hero-line"
          >
            HAULING.
          </h1>
        </div>
        <div className="mt-12 max-w-xl gs-hero-sub">
          <p className="text-lg text-[var(--color-public-on-surface-variant)] leading-relaxed border-l-4 border-[var(--color-public-primary)] pl-6">
            Professional dump truck hauling, excavating, and grading services.
            Specializing in efficient and reliable solutions for your construction needs.
          </p>
        </div>
      </div>
    </section>
  );
}
