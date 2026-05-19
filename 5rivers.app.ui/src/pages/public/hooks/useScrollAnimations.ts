import { useEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useScrollAnimations(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const ctx = gsap.context(() => {
      const root = containerRef.current;
      if (!root) return;

      animateHero(root);
      animateStats(root);
      animateServices(root);
      animateAbout(root);
      animateContact(root);
    }, containerRef);

    return () => ctx.revert();
  }, [containerRef]);
}

const isMob = () => typeof window !== 'undefined' && window.innerWidth < 768;

// ─── Hero ────────────────────────────────────────────────────────────────────

function animateHero(root: HTMLElement) {
  const hero = root.querySelector<HTMLElement>('#ch-hero');
  if (!hero) return;

  const mobile = isMob();
  const bg = hero.querySelector<HTMLElement>('.gs-bg');
  if (bg) {
    gsap.to(bg, {
      yPercent: mobile ? 12 : 25,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
    });

    if (!mobile) {
      gsap.fromTo(bg, { scale: 1.1 }, {
        scale: 1,
        ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 2 },
      });
    }

    const img = bg.querySelector<HTMLElement>('img');
    if (img) {
      gsap.fromTo(img,
        { filter: 'grayscale(20%) contrast(120%) blur(16px)' },
        {
          filter: 'grayscale(20%) contrast(120%) blur(0px)',
          ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top 90%', end: 'top 10%', scrub: 2 },
        },
      );
    }
  }

  const lines = hero.querySelectorAll<HTMLElement>('.gs-hero-line');
  if (lines.length) {
    gsap.from(lines, {
      yPercent: 115,
      duration: mobile ? 1 : 1.2,
      stagger: mobile ? 0.14 : 0.18,
      ease: 'expo.out',
    });
  }

  const sub = hero.querySelector<HTMLElement>('.gs-hero-sub');
  if (sub) {
    gsap.from(sub, {
      y: mobile ? 40 : 30,
      opacity: 0,
      duration: mobile ? 0.9 : 1,
      delay: mobile ? 0.4 : 0.5,
      ease: 'power3.out',
    });
  }
}

// ─── Stats ───────────────────────────────────────────────────────────────────

function animateStats(root: HTMLElement) {
  const section = root.querySelector<HTMLElement>('#ch-stats');
  if (!section) return;

  const mobile = isMob();

  if (mobile) {
    // Each stat item flies up individually with spring ease
    section.querySelectorAll<HTMLElement>('.gs-stat').forEach((el, i) => {
      gsap.from(el, {
        y: 80,
        opacity: 0,
        duration: 0.75,
        delay: i * 0.12,
        ease: 'back.out(1.4)',
        scrollTrigger: { trigger: section, start: 'top 85%', toggleActions: 'play none none reverse' },
      });
    });
  } else {
    gsap.from(section, {
      opacity: 0,
      y: 50,
      duration: 0.8,
      ease: 'power2.out',
      scrollTrigger: { trigger: section, start: 'top 85%', toggleActions: 'play none none reverse' },
    });
  }

  section.querySelectorAll<HTMLElement>('.gs-stat-num').forEach((el) => {
    const target = parseInt(el.dataset.target ?? '0', 10);
    const obj = { val: 0 };
    gsap.to(obj, {
      val: target,
      duration: 2,
      ease: 'power2.out',
      onUpdate() { el.textContent = String(Math.round(obj.val)); },
      scrollTrigger: {
        trigger: section,
        start: mobile ? 'top 90%' : 'top 70%',
        toggleActions: 'play none none none',
      },
    });
  });
}

// ─── Services ────────────────────────────────────────────────────────────────

function animateServices(root: HTMLElement) {
  const outer = root.querySelector<HTMLElement>('.services-outer');
  if (!outer) return;

  if (isMob()) {
    outer.querySelectorAll<HTMLElement>('.services-panel').forEach((panel) => {
      // Image: fast clip-path wipe upward — tight scrub range for snappy visual
      const imgBg = panel.querySelector<HTMLElement>('.services-panel-bg');
      if (imgBg) {
        gsap.fromTo(imgBg,
          { clipPath: 'inset(100% 0% 0% 0%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            ease: 'power2.out',
            scrollTrigger: { trigger: panel, start: 'top 95%', end: 'top 45%', scrub: 0.8 },
          },
        );
      }

      // Headline: large yPercent slide-up out of line-mask
      const lines = panel.querySelectorAll<HTMLElement>('.gs-panel-line');
      if (lines.length) {
        gsap.from(lines, {
          yPercent: 120,
          duration: 0.85,
          ease: 'expo.out',
          scrollTrigger: { trigger: panel, start: 'top 80%', toggleActions: 'play none none reverse' },
        });
      }

      // Eyebrow: fly in from left
      const eyebrow = panel.querySelector<HTMLElement>('.gs-panel-reveal');
      if (eyebrow) {
        gsap.from(eyebrow, {
          x: -70,
          opacity: 0,
          duration: 0.7,
          ease: 'expo.out',
          scrollTrigger: { trigger: panel, start: 'top 78%', toggleActions: 'play none none reverse' },
        });
      }

      // Description: rise up with slight delay
      const allReveals = panel.querySelectorAll<HTMLElement>('.gs-panel-reveal');
      if (allReveals.length > 1) {
        gsap.from(allReveals[allReveals.length - 1], {
          y: 50,
          opacity: 0,
          duration: 0.75,
          delay: 0.15,
          ease: 'power3.out',
          scrollTrigger: { trigger: panel, start: 'top 78%', toggleActions: 'play none none reverse' },
        });
      }
    });
    return;
  }

  // ── Desktop horizontal scroll ──────────────────────────────────────────────
  const track = outer.querySelector<HTMLElement>('.services-track');
  const panels = gsap.utils.toArray<HTMLElement>('.services-panel', outer);
  if (!track || panels.length < 2) return;

  const panelCount = panels.length;

  const tween = gsap.to(track, {
    xPercent: -(100 / panelCount) * (panelCount - 1),
    ease: 'none',
    scrollTrigger: {
      trigger: outer,
      start: 'top top',
      end: () => `+=${window.innerWidth * (panelCount - 1)}`,
      pin: true,
      anticipatePin: 1,
      scrub: 1,
    },
  });

  const fp = panels[0];
  gsap.from(fp.querySelectorAll<HTMLElement>('.gs-panel-line'), {
    yPercent: 110, stagger: 0.12, duration: 1, ease: 'power4.out',
    scrollTrigger: { trigger: outer, start: 'top 80%', toggleActions: 'play none none reverse' },
  });
  gsap.from(fp.querySelectorAll<HTMLElement>('.gs-panel-reveal'), {
    opacity: 0, y: 20, stagger: 0.1, duration: 0.7, ease: 'power2.out',
    scrollTrigger: { trigger: outer, start: 'top 80%', toggleActions: 'play none none reverse' },
  });

  panels.forEach((panel, i) => {
    if (i === 0) return;

    const imgBg = panel.querySelector<HTMLElement>('.services-panel-bg');
    if (imgBg) {
      gsap.fromTo(imgBg,
        { clipPath: 'inset(0% 100% 0% 0%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          ease: 'power2.inOut',
          scrollTrigger: { trigger: panel, containerAnimation: tween, start: 'left 95%', end: 'left 15%', scrub: true },
        },
      );
    }

    const lines = panel.querySelectorAll<HTMLElement>('.gs-panel-line');
    if (lines.length) {
      gsap.from(lines, {
        yPercent: 110, stagger: 0.12, duration: 0.9, ease: 'power3.out',
        scrollTrigger: { trigger: panel, containerAnimation: tween, start: 'left 65%', toggleActions: 'play none none reverse' },
      });
    }

    const reveals = panel.querySelectorAll<HTMLElement>('.gs-panel-reveal');
    if (reveals.length) {
      gsap.from(reveals, {
        opacity: 0, y: 20, stagger: 0.1, duration: 0.7, ease: 'power2.out',
        scrollTrigger: { trigger: panel, containerAnimation: tween, start: 'left 55%', toggleActions: 'play none none reverse' },
      });
    }
  });
}

// ─── About ───────────────────────────────────────────────────────────────────

function animateAbout(root: HTMLElement) {
  const section = root.querySelector<HTMLElement>('#ch-about');
  if (!section) return;

  const mobile = isMob();
  const bg = section.querySelector<HTMLElement>('.gs-bg');

  if (bg) {
    gsap.to(bg, {
      yPercent: 30,
      ease: 'none',
      scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true },
    });

    gsap.fromTo(bg,
      { clipPath: 'inset(100% 0% 0% 0%)' },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        ease: 'power2.out',
        scrollTrigger: { trigger: section, start: 'top 85%', end: 'top 20%', scrub: 1.5 },
      },
    );

    const img = bg.querySelector<HTMLElement>('img');
    if (img) {
      gsap.fromTo(img,
        { filter: 'grayscale(20%) contrast(120%) blur(12px)' },
        {
          filter: 'grayscale(20%) contrast(120%) blur(0px)',
          ease: 'none',
          scrollTrigger: { trigger: section, start: 'top 85%', end: 'top 20%', scrub: 2 },
        },
      );
    }
  }

  if (mobile) {
    // Mobile: headlines fly in from opposite sides — triggered, not scrubbed
    section.querySelectorAll<HTMLElement>('.gs-title-left').forEach((el) => {
      gsap.from(el, {
        x: '-115%',
        duration: 0.85,
        ease: 'expo.out',
        scrollTrigger: { trigger: section, start: 'top 75%', toggleActions: 'play none none reverse' },
      });
    });

    section.querySelectorAll<HTMLElement>('.gs-title-right').forEach((el) => {
      gsap.from(el, {
        x: '115%',
        duration: 0.9,
        delay: 0.1,
        ease: 'expo.out',
        scrollTrigger: { trigger: section, start: 'top 75%', toggleActions: 'play none none reverse' },
      });
    });

    // Cards: spring bounce stagger
    const reveals = section.querySelectorAll<HTMLElement>('.gs-reveal-y');
    if (reveals.length) {
      gsap.from(reveals, {
        y: 100,
        opacity: 0,
        duration: 0.85,
        stagger: 0.18,
        ease: 'back.out(1.3)',
        scrollTrigger: { trigger: section, start: 'top 65%', toggleActions: 'play none none reverse' },
      });
    }
  } else {
    // Desktop: horizontal scrub sweeps
    section.querySelectorAll<HTMLElement>('.gs-title-left').forEach((el) => {
      const speed = parseFloat(el.dataset.speed ?? '1.5');
      gsap.fromTo(el, { x: '-20vw' }, {
        x: '20vw',
        ease: 'none',
        scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: speed },
      });
    });

    section.querySelectorAll<HTMLElement>('.gs-title-right').forEach((el) => {
      const speed = parseFloat(el.dataset.speed ?? '1.5');
      gsap.fromTo(el, { x: '20vw' }, {
        x: '-20vw',
        ease: 'none',
        scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: speed },
      });
    });

    const reveals = section.querySelectorAll<HTMLElement>('.gs-reveal-y');
    if (reveals.length) {
      gsap.from(reveals, {
        y: 80,
        opacity: 0,
        duration: 1,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: { trigger: section, start: 'top 60%', toggleActions: 'play none none reverse' },
      });
    }
  }
}

// ─── Contact ─────────────────────────────────────────────────────────────────

function animateContact(root: HTMLElement) {
  const section = root.querySelector<HTMLElement>('#ch-contact');
  if (!section) return;

  const mobile = isMob();
  const bg = section.querySelector<HTMLElement>('.gs-bg');
  if (bg) {
    gsap.to(bg, {
      yPercent: 20,
      ease: 'none',
      scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }

  const title = section.querySelector<HTMLElement>('.gs-title-scale');
  if (title) {
    if (mobile) {
      // Mobile: dramatic scale-up triggered snap
      gsap.from(title, {
        scale: 0.4,
        opacity: 0,
        duration: 0.9,
        ease: 'expo.out',
        scrollTrigger: { trigger: section, start: 'top 80%', toggleActions: 'play none none reverse' },
      });
    } else {
      gsap.fromTo(title,
        { scale: 0.8, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          ease: 'none',
          scrollTrigger: { trigger: section, start: 'top 70%', end: 'top 10%', scrub: true },
        },
      );
    }
  }

  const reveals = section.querySelectorAll<HTMLElement>('.gs-reveal-y');
  if (reveals.length) {
    gsap.from(reveals, {
      y: mobile ? 80 : 60,
      opacity: 0,
      duration: mobile ? 0.85 : 0.9,
      stagger: mobile ? 0.2 : 0.15,
      ease: mobile ? 'back.out(1.2)' : 'power3.out',
      scrollTrigger: {
        trigger: section,
        start: mobile ? 'top 75%' : 'top 70%',
        toggleActions: 'play none none reverse',
      },
    });
  }
}
