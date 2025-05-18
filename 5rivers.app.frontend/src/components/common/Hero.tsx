import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import ScrollSmoother from "gsap/ScrollSmoother";

interface HeroProps {
  title: string;
  description: string;
  imageUrls: {
    src: string;
    srcSetLarge: string;
    srcSetMedium: string;
  };
}

const Hero: React.FC<HeroProps> = ({ title, description, imageUrls }) => {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
    if (!ScrollSmoother.get()) {
      ScrollSmoother.create({
        content: "#content",
        smooth: 3,
        effects: true,
      });
    }
    ScrollSmoother.get().effects("img", { speed: 1 });
  }, []);

  useEffect(() => {
    if (imageRef.current) {
      gsap.to(imageRef.current, {
        y: "20%",
        ease: "none",
        scrollTrigger: {
          trigger: imageRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    }
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <picture className="relative overflow-hidden h-[95vh] w-full flex items-center justify-center bg-black">
      <source srcSet={imageUrls.srcSetLarge} media="(min-width: 1500px)" />
      <source srcSet={imageUrls.srcSetMedium} media="(min-width: 700px)" />
      <img
        ref={imageRef}
        src={imageUrls.src}
        alt="Hero background"
        loading="eager"
        className="absolute w-full h-[160%] object-cover bottom-0 left-0"
        draggable={false}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
        <div className="bg-black/30 text-white text-center p-8 rounded-2xl max-w-xl shadow-lg pointer-events-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>
          <p className="text-lg md:text-xl">{description}</p>
        </div>
      </div>
    </picture>
  );
};

export default Hero;
