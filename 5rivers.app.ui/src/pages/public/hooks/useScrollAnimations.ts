/**
 * useScrollAnimations — hook that wires GSAP ScrollTrigger to the
 * public homepage sections.
 *
 * Selectors it expects inside the container:
 *   .public-chapter      — each full-screen scroll section
 *     .gs-bg             — parallax background (any element inside chapter)
 *     .gs-title-left     — headline that sweeps left-to-right
 *     .gs-title-right    — headline that sweeps right-to-left
 *     .gs-title-scale    — headline that scales + fades in
 *     .gs-reveal-y       — content block that rises + fades on enter
 *
 * The `data-speed="<n>"` attribute on each `gs-title-*` element controls
 * how aggressively that line sweeps relative to scroll velocity.
 *
 * Usage:
 *   const ref = useRef<HTMLDivElement>(null);
 *   useScrollAnimations(ref);
 *   return <div ref={ref}>...</div>;
 *
 * The hook registers ScrollTrigger and reverts the gsap.context on
 * unmount, so all triggers are cleaned up automatically.
 */

import { useEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useScrollAnimations(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const ctx = gsap.context(() => {
      const chapters = gsap.utils.toArray<HTMLElement>('.public-chapter');

      // Reduce the horizontal typography sweep on small screens so the
      // huge headlines don't visually crash into adjacent content / the
      // edges of section padding. Desktop keeps the dramatic ±20vw sweep.
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      const sweepIn = isMobile ? '-8vw' : '-20vw';
      const sweepOut = isMobile ? '8vw' : '20vw';

      chapters.forEach((chapter) => {
        // Parallax background
        const bg = chapter.querySelector('.gs-bg');
        if (bg) {
          gsap.to(bg, {
            yPercent: 30,
            ease: 'none',
            scrollTrigger: {
              trigger: chapter,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          });
        }

        // Typography sweep — left side
        chapter.querySelectorAll<HTMLElement>('.gs-title-left').forEach((el) => {
          const speed = parseFloat(el.dataset.speed ?? '1.5');
          gsap.fromTo(
            el,
            { x: sweepIn },
            {
              x: sweepOut,
              ease: 'none',
              scrollTrigger: {
                trigger: chapter,
                start: 'top bottom',
                end: 'bottom top',
                scrub: speed,
              },
            },
          );
        });

        // Typography sweep — right side
        chapter.querySelectorAll<HTMLElement>('.gs-title-right').forEach((el) => {
          const speed = parseFloat(el.dataset.speed ?? '1.5');
          gsap.fromTo(
            el,
            { x: sweepOut },
            {
              x: sweepIn,
              ease: 'none',
              scrollTrigger: {
                trigger: chapter,
                start: 'top bottom',
                end: 'bottom top',
                scrub: speed,
              },
            },
          );
        });

        // Scale-in title (used by the contact "GET IN TOUCH" headline)
        chapter.querySelectorAll<HTMLElement>('.gs-title-scale').forEach((el) => {
          gsap.fromTo(
            el,
            { scale: 0.8, opacity: 0 },
            {
              scale: 1.2,
              opacity: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: chapter,
                start: 'top center',
                end: 'bottom top',
                scrub: true,
              },
            },
          );
        });

        // Stagger reveals for content blocks
        const reveals = chapter.querySelectorAll<HTMLElement>('.gs-reveal-y');
        if (reveals.length) {
          gsap.from(reveals, {
            y: 150,
            opacity: 0,
            duration: 1.2,
            stagger: 0.2,
            ease: 'power4.out',
            scrollTrigger: {
              trigger: chapter,
              start: 'top 60%',
              toggleActions: 'play reverse play reverse',
            },
          });
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, [containerRef]);
}
