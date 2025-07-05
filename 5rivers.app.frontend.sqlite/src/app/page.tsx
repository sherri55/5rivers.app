"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import ScrollSmoother from "gsap/ScrollSmoother";
import Image from "next/image";
import Hero from "../components/common/Hero";
import Promo from "../components/common/Promo";

export default function HomePage() {
  const wrapperRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
    if (!ScrollSmoother.get()) {
      ScrollSmoother.create({
        wrapper: "#smooth-wrapper",
        content: "#content",
        smooth: 1.5,
        effects: true,
      });
    }
    ScrollSmoother.get().effects("#content img", { speed: 1 });
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      if (ScrollSmoother.get()) ScrollSmoother.get().kill();
    };
  }, []);

  return (
    <div
      id="smooth-wrapper"
      ref={wrapperRef}
      style={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <section id="content" ref={contentRef}>
        <Hero
          title="5 Rivers Trucking Inc."
          description="Professional dump trucking services for construction, landscaping, and material delivery in London, Ontario and surrounding areas. Reliable, efficient, and safe hauling for your project needs."
          imageUrls={{
            src: "/images/volvo-quarry.png",
            srcSetLarge: "/images/volvo-quarry.png",
            srcSetMedium: "/images/volvo-quarry.png",
          }}
          imageWidth={1920}
          imageHeight={1200}
        />

        {/* Promo Section Example */}
        <Promo
          title="Modern Dump Truck Fleet"
          description="Our fleet is equipped with the latest technology and maintained to the highest standards, ensuring safe and timely deliveries throughout London and nearby communities."
          imageUrl="/images/international-quarry.png"
          imageWidth={1200}
          imageHeight={800}
          variant="ImageOnLeft"
        />
        <Promo
          title="Experienced Local Drivers"
          description="Our team of licensed and certified drivers brings years of experience serving London, Ontario and the surrounding region. Safety and professionalism are our top priorities."
          imageUrl="/images/international-driver.png"
          imageWidth={1200}
          imageHeight={800}
          variant="ImageOnRight"
        />
        <Hero
          title="Your Local Dump Trucking Partner"
          description="5 Rivers Trucking Inc. is committed to supporting construction, landscaping, and material delivery projects across London, Ontario and nearby areas with dependable dump truck services."
          imageUrls={{
            src: "/images/volvo-driver.png",
            srcSetLarge: "/images/volvo-driver.png",
            srcSetMedium: "/images/volvo-driver.png",
          }}
          imageWidth={1920}
          imageHeight={1200}
        />
        <Promo
          title="Serving London & Nearby Areas"
          description="We proudly serve London, Ontario and surrounding communities with prompt, reliable dump trucking for all types of projects. Contact us for a quote or to discuss your hauling needs."
          imageUrl="/images/london-area.png"
          imageWidth={1200}
          imageHeight={800}
          variant="ImageOnLeft"
        />
        <Promo
          title="Trusted by Local Contractors"
          description="5 Rivers Trucking Inc. is trusted by contractors and businesses across London for our reliability, professionalism, and commitment to customer satisfaction."
          imageUrl="/images/volvo-contractors.png"
          imageWidth={1200}
          imageHeight={800}
          variant="ImageOnRight"
        />
        <div className="spacer" style={{ height: 100 }}></div>
      </section>
    </div>
  );
}
