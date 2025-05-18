import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import ScrollSmoother from "gsap/ScrollSmoother";

interface PromoProps {
  title: string;
  description: string;
  imageUrl: string;
  variant?: "ImageOnLeft" | "ImageOnRight";
  ctaText?: string;
  ctaHref?: string;
  ctaOnClick?: () => void;
}

const PromoText: React.FC<{
  title: string;
  description: string;
  ctaText?: string;
  ctaHref?: string;
  ctaOnClick?: () => void;
  className?: string;
  titleClass?: string;
  descClass?: string;
}> = ({
  title,
  description,
  ctaText,
  ctaHref,
  ctaOnClick,
  className = "",
  titleClass = "",
  descClass = "",
}) => (
  <div className={className}>
    <h2 className={titleClass}>{title}</h2>
    <p className={descClass}>{description}</p>
    {ctaText &&
      (ctaHref ? (
        <a
          href={ctaHref}
          className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          {ctaText}
        </a>
      ) : (
        <button
          onClick={ctaOnClick}
          className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          {ctaText}
        </button>
      ))}
  </div>
);

const Promo: React.FC<PromoProps> = ({
  title,
  description,
  imageUrl,
  variant = "ImageOnLeft",
  ctaText,
  ctaHref,
  ctaOnClick,
}) => {
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const isLeft = variant === "ImageOnLeft";

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
    if (imageRef.current && imageContainerRef.current) {
      gsap.to(imageRef.current, {
        y: "20%",
        ease: "none",
        scrollTrigger: {
          trigger: imageContainerRef.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    }
    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, [isLeft]);

  return (
    <section className="w-full grid grid-cols-1 md:grid-cols-12 items-center my-16 md:my-24">
      {isLeft ? (
        <>
          <div className="hidden md:block col-span-12 md:col-span-2" />
          {/* Desktop: text in its own cell; Mobile: text overlays image */}
          <div className="col-span-12 md:col-span-5 relative">
            <div
              ref={imageContainerRef}
              className="relative w-full h-[50vh] max-h-[500px] overflow-hidden"
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt={title}
                className="absolute w-full h-[160%] object-cover bottom-0 left-0"
              />
              {/* Mobile: text overlays image */}
              <div className="absolute inset-0 flex items-end md:hidden z-10">
                <PromoText
                  title={title}
                  description={description}
                  ctaText={ctaText}
                  ctaHref={ctaHref}
                  ctaOnClick={ctaOnClick}
                  className="bg-black/60 p-4 w-full text-left max-w-xl"
                  titleClass="text-3xl font-bold mb-4 text-white"
                  descClass="text-lg mb-4 text-white"
                />
              </div>
            </div>
          </div>
          {/* Desktop: text in its own cell */}
          <div className="hidden md:flex col-span-12 md:col-span-3 ml-5">
            <PromoText
              title={title}
              description={description}
              ctaText={ctaText}
              ctaHref={ctaHref}
              ctaOnClick={ctaOnClick}
              className="text-left w-full max-w-xl"
              titleClass="text-4xl font-bold mb-4 "
              descClass="text-xl mb-4 "
            />
          </div>
          <div className="hidden md:block col-span-12 md:col-span-2" />
        </>
      ) : (
        <>
          <div className="hidden md:block col-span-12 md:col-span-2" />
          <div className="hidden md:flex col-span-12 md:col-span-3 mr-5">
            <PromoText
              title={title}
              description={description}
              ctaText={ctaText}
              ctaHref={ctaHref}
              ctaOnClick={ctaOnClick}
              className="text-right w-full max-w-xl"
              titleClass="text-3xl md:text-4xl font-bold mb-4 "
              descClass="text-lg md:text-xl mb-4 "
            />
          </div>
          <div className="col-span-12 md:col-span-5 relative">
            <div
              ref={imageContainerRef}
              className="relative w-full h-[50vh] max-h-[500px] overflow-hidden"
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt={title}
                className="absolute w-full h-[160%] object-cover bottom-0 left-0"
              />
              {/* Promo text overlays image on mobile */}
              <div className="absolute inset-0 flex items-end md:hidden z-10">
                <PromoText
                  title={title}
                  description={description}
                  ctaText={ctaText}
                  ctaHref={ctaHref}
                  ctaOnClick={ctaOnClick}
                  className="bg-black/60 p-4 w-full text-left max-w-xl"
                  titleClass="text-3xl font-bold mb-4 text-white"
                  descClass="text-lg mb-4 text-white"
                />
              </div>
            </div>
          </div>
          <div className="hidden md:block col-span-12 md:col-span-2" />
        </>
      )}
    </section>
  );
};

export default Promo;
