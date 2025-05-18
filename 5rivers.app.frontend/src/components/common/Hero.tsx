import React, { useRef } from "react";
import Image from "next/image";

interface HeroProps {
  title: string;
  description: string;
  imageUrls: {
    src: string;
    srcSetLarge: string;
    srcSetMedium: string;
  };
  imageWidth: number;
  imageHeight: number;
}

const Hero: React.FC<HeroProps> = ({
  title,
  description,
  imageUrls,
  imageWidth,
  imageHeight,
}) => {
  const imageRef = useRef<HTMLImageElement>(null);

  return (
    <picture className="relative overflow-hidden h-[65vh] w-full flex items-center justify-center bg-black">
      <source srcSet={imageUrls.srcSetLarge} media="(min-width: 1500px)" />
      <source srcSet={imageUrls.srcSetMedium} media="(min-width: 700px)" />
      <Image
        ref={imageRef}
        src={imageUrls.src}
        alt="Hero background"
        style={{ objectFit: "cover", bottom: 0, left: 0 }}
        priority
        sizes="100vw"
        className="absolute w-full h-full object-cover bottom-0 left-0"
        draggable={false}
        width={imageWidth}
        height={imageHeight}
      />
      {/* Full image overlay */}
      <div className="absolute inset-0 bg-black/30 z-10 flex items-center justify-center">
        <div className="text-white text-center p-8 rounded-2xl max-w-xl shadow-lg pointer-events-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>
          <p className="text-lg md:text-xl">{description}</p>
        </div>
      </div>
    </picture>
  );
};

export default Hero;
