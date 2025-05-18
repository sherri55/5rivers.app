"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import ScrollSmoother from "gsap/ScrollSmoother";
import Hero from "../components/common/Hero";
import Promo from "../components/common/Promo";

export default function HomePage() {
  const contentRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
    ScrollSmoother.create({
      content: "#content",
      wrapper: "body", // ensure only #content is smoothed, not header/footer
      smooth: 3,
      effects: true,
    });
    ScrollSmoother.get().effects("img", { speed: "auto" });
  }, []);

  return (
    <>
      <style>{`
        body { background-color: #111; margin: 0; padding: 0; overflow-x: hidden; }
        .container { max-width: 2500px; margin: 0 auto; }
        .spacer { height: 100vh; }
        header, footer { position: static !important; z-index: 2 !important; }
      `}</style>
      <section id="content" ref={contentRef}>
        <Hero
          title="5 Rivers Trucking Inc."
          description="Professional dump trucking services for construction, landscaping, and material delivery in London, Ontario and surrounding areas. Reliable, efficient, and safe hauling for your project needs."
          imageUrls={{
            src: "/images/volvo-quarry.png",
            srcSetLarge: "/images/volvo-quarry.png",
            srcSetMedium: "/images/volvo-quarry.png",
          }}
        />

        {/* Promo Section Example */}
        <Promo
          title="Modern Dump Truck Fleet"
          description="Our fleet is equipped with the latest technology and maintained to the highest standards, ensuring safe and timely deliveries throughout London and nearby communities."
          imageUrl="/images/international-quarry.png"
          variant="ImageOnLeft"
        />
        <Promo
          title="Experienced Local Drivers"
          description="Our team of licensed and certified drivers brings years of experience serving London, Ontario and the surrounding region. Safety and professionalism are our top priorities."
          imageUrl="/images/international-driver.png"
          variant="ImageOnRight"
        />
        <Hero
          title="Your Local Dump Trucking Partner"
          description="5 Rivers Trucking Inc. is committed to supporting construction, landscaping, and material delivery projects across London, Ontario and nearby areas with dependable dump truck services."
          imageUrls={{
            src: "/images/volvo-driver.png",
            srcSetLarge:
              "/images/volvo-driver.png",
            srcSetMedium:
              "/images/volvo-driver.png",
          }}
        />
        <Promo
          title="Serving London & Nearby Areas"
          description="We proudly serve London, Ontario and surrounding communities with prompt, reliable dump trucking for all types of projects. Contact us for a quote or to discuss your hauling needs."
          imageUrl="/images/london-area.png"
          variant="ImageOnLeft"
        />
        <Promo
          title="Trusted by Local Contractors"
          description="5 Rivers Trucking Inc. is trusted by contractors and businesses across London for our reliability, professionalism, and commitment to customer satisfaction."
          imageUrl="/images/volvo-contractors.png"
          variant="ImageOnRight"
        />
        <div className="spacer"></div>
      </section>
    </>
  );
}
