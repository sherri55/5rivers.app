/**
 * ServicesSection — Chapter 2 of the homepage.
 *
 * Right-aligned headline ("CORE SERVICES") with two glass-panel cards
 * describing the available services. On mobile the cards stack full-width;
 * on tablet+ they sit side-by-side, right-aligned to mirror the headline.
 *
 * Each card is a small content block — duplicate the existing `<div>` to
 * add a third service.
 */

interface ServiceCardProps {
  title: string;
  description: string;
}

function ServiceCard({ title, description }: ServiceCardProps) {
  return (
    <div className="public-glass-panel p-8 text-left w-full sm:w-80">
      <h3 className="public-display text-2xl font-bold mb-4">{title}</h3>
      <p className="text-base text-[var(--color-public-on-surface-variant)] mb-6">
        {description}
      </p>
    </div>
  );
}

export function ServicesSection() {
  return (
    <section
      className="public-chapter bg-[var(--color-public-surface-low)]"
      id="ch-services"
    >
      <div className="public-chapter-bg gs-bg" data-speed="0.6">
        <img
          alt="Red dump truck loading at an excavation site"
          src="/images/homepage-services.png"
        />
      </div>
      <div className="public-chapter-overlay" />
      <div className="public-chapter-content items-end text-right">
        <h2
          className="public-huge-text text-[var(--color-public-on-surface)] gs-title-right font-bold"
          data-speed="1.3"
        >
          CORE
        </h2>
        <h2
          className="public-huge-text text-[var(--color-public-primary)] gs-title-left font-bold"
          data-speed="1.6"
        >
          SERVICES
        </h2>
        <div
          className="mt-16 w-full flex flex-col md:flex-row gap-8 items-stretch md:items-end md:justify-end gs-reveal-y"
          data-speed="1.2"
        >
          <ServiceCard
            title="Excavation & Grading"
            description="Precision earth moving, trenching, and fine grading operations."
          />
          <ServiceCard
            title="Driveways & Patios"
            description="Interlock driveways, patios, and professional site cleanup services."
          />
        </div>
      </div>
    </section>
  );
}
