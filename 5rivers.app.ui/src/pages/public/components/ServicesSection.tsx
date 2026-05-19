interface ServicePanelProps {
  eyebrow: string;
  headline: string;
  description: string;
  image: string;
  imageAlt: string;
}

function ServicePanel({ eyebrow, headline, description, image, imageAlt }: ServicePanelProps) {
  return (
    <div className="services-panel">
      <div className="services-panel-bg">
        <img alt={imageAlt} src={image} />
      </div>
      <div className="services-panel-blur" />
      <div className="services-panel-overlay" />
      <div className="services-panel-content">
        <p className="public-label-mono text-xs text-[var(--color-public-primary)] tracking-[0.25em] uppercase mb-4 gs-panel-reveal">
          {eyebrow}
        </p>
        <div className="gs-line-mask">
          <h2 className="public-huge-text text-[var(--color-public-on-surface)] font-bold gs-panel-line">
            {headline}
          </h2>
        </div>
        <p className="mt-8 text-lg text-[var(--color-public-on-surface-variant)] max-w-md leading-relaxed gs-panel-reveal">
          {description}
        </p>
      </div>
    </div>
  );
}

export function ServicesSection() {
  return (
    <div className="services-outer" id="ch-services">
      <div className="services-track">
        <ServicePanel
          eyebrow="01 — Earthwork"
          headline="EXCAVATION"
          description="Precision earth moving, trenching, and fine grading for residential, commercial, and municipal projects across London and the surrounding area."
          image="/images/homepage-services.png"
          imageAlt="Red dump truck loading at an excavation site"
        />
        <ServicePanel
          eyebrow="02 — Material Transport"
          headline="HAULING"
          description="Reliable dump truck hauling of aggregate, fill, topsoil, and construction materials. Efficient, on-time delivery every job."
          image="/images/homepage-hero.png"
          imageAlt="Red dump truck on a construction haul road"
        />
        <ServicePanel
          eyebrow="03 — Hardscape"
          headline="DRIVEWAYS"
          description="Interlock driveways, patios, and professional site cleanup. Quality hardscape work built to last, delivered with precision and care."
          image="/images/homepage-about.png"
          imageAlt="Excavator working on a London Ontario construction site"
        />
      </div>
    </div>
  );
}
