/**
 * AboutSection — Chapter 3 of the homepage.
 *
 * Maroon-washed block with two callout cards (location + quality).
 * The image is heavily overlaid (90% maroon) so the photo reads as
 * texture rather than focal subject.
 */

interface AboutCardProps {
  icon: string;
  title: string;
  body: string;
}

function AboutCard({ icon, title, body }: AboutCardProps) {
  return (
    <div className="border border-white/20 p-8 bg-black/20 backdrop-blur-md">
      <span className="material-symbols-outlined text-white text-3xl mb-4">{icon}</span>
      <h4 className="public-display text-xl mb-2">{title}</h4>
      <p className="text-base text-white/70">{body}</p>
    </div>
  );
}

export function AboutSection() {
  return (
    <section
      className="public-chapter bg-[var(--color-public-primary)] text-white"
      id="ch-about"
    >
      <div className="public-chapter-bg gs-bg" data-speed="0.4">
        <div className="absolute inset-0 bg-[var(--color-public-primary)] opacity-90 mix-blend-multiply" />
        <img
          alt="Red dump truck against the London Ontario skyline at dusk"
          src="/images/homepage-about.png"
        />
      </div>
      <div className="public-chapter-overlay public-chapter-overlay-dark" />
      <div className="public-chapter-content">
        <h2 className="public-huge-text text-white gs-title-left font-bold" data-speed="1.4">
          PREMIER
        </h2>
        <h2
          className="public-huge-text text-white/50 gs-title-right font-bold"
          data-speed="1.7"
        >
          CONSTRUCTION
        </h2>
        <div
          className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl gs-reveal-y"
          data-speed="1.1"
        >
          <AboutCard
            icon="location_on"
            title="London, Ontario"
            body="Your premier destination for top-notch construction services in London and the surrounding area. Specializing in excavating, earth moving, and grading."
          />
          <AboutCard
            icon="handyman"
            title="Unparalleled Quality"
            body="Dedicated to delivering professionalism and efficiency. We are committed to exceeding your expectations with our high-quality workmanship and attention to detail."
          />
        </div>
      </div>
    </section>
  );
}
