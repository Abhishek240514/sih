import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger safely
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };

/**
 * Standardized easing curves per design guidelines (Linear / Apple style)
 */
export const EASINGS = {
  power3Out: 'power3.out',
  expoOut: 'expo.out',
  smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
  gentle: 'power2.out',
};

/**
 * Smooth entrance animation for a section or element triggered on scroll
 */
export function initScrollReveal(
  triggerElement: HTMLElement | string,
  targetElement?: HTMLElement | string,
  options?: { y?: number; duration?: number; delay?: number; scale?: number }
) {
  const target = targetElement || triggerElement;
  const yOffset = options?.y ?? 24;
  const duration = options?.duration ?? 0.65;
  const delay = options?.delay ?? 0;
  const startScale = options?.scale ?? 1;

  return gsap.fromTo(
    target,
    { opacity: 0, y: yOffset, scale: startScale },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration,
      delay,
      ease: EASINGS.expoOut,
      scrollTrigger: {
        trigger: triggerElement,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
    }
  );
}

/**
 * Staggered card or list cascade entrance triggered on scroll
 */
export function initScrollCascade(
  container: HTMLElement | string,
  itemSelector: string,
  stagger = 0.08,
  options?: { y?: number; duration?: number }
) {
  const yOffset = options?.y ?? 26;
  const duration = options?.duration ?? 0.6;

  return gsap.fromTo(
    itemSelector,
    { opacity: 0, y: yOffset },
    {
      opacity: 1,
      y: 0,
      duration,
      stagger,
      ease: EASINGS.power3Out,
      scrollTrigger: {
        trigger: container,
        start: 'top 82%',
        toggleActions: 'play none none none',
      },
    }
  );
}

/**
 * Subtle perspective 3D tilt cascade (Apple / Linear hardware showcase style)
 */
export function initPerspectiveCascade(
  container: HTMLElement | string,
  itemSelector: string,
  stagger = 0.1
) {
  return gsap.fromTo(
    itemSelector,
    {
      opacity: 0,
      y: 30,
      rotateX: 8,
      transformPerspective: 1000,
    },
    {
      opacity: 1,
      y: 0,
      rotateX: 0,
      duration: 0.7,
      stagger,
      ease: EASINGS.expoOut,
      scrollTrigger: {
        trigger: container,
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
    }
  );
}

/**
 * Smooth odometer counter for numerical telemetry (e.g. Risk score, recovery rate)
 */
export function tweenNumber(
  start: number,
  end: number,
  duration = 0.8,
  onUpdate: (val: number) => void
) {
  const obj = { val: start };
  return gsap.to(obj, {
    val: end,
    duration,
    ease: EASINGS.power3Out,
    onUpdate: () => {
      onUpdate(Math.round(obj.val * 10) / 10);
    },
  });
}

/**
 * Animate SVG path stroke drawing
 */
export function drawSvgPath(
  pathElement: SVGPathElement | string,
  trigger?: HTMLElement | string,
  duration = 1.2
) {
  return gsap.fromTo(
    pathElement,
    { strokeDasharray: 1000, strokeDashoffset: 1000 },
    {
      strokeDashoffset: 0,
      duration,
      ease: EASINGS.expoOut,
      scrollTrigger: trigger
        ? {
            trigger,
            start: 'top 80%',
            toggleActions: 'play none none none',
          }
        : undefined,
    }
  );
}

/**
 * Subtle interactive cursor spotlight tracking on glass/card elements
 */
export function initCursorSpotlight(container: HTMLElement) {
  const handleMouseMove = (e: MouseEvent) => {
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    container.style.setProperty('--mouse-x', `${x}px`);
    container.style.setProperty('--mouse-y', `${y}px`);
  };

  container.addEventListener('mousemove', handleMouseMove);
  return () => container.removeEventListener('mousemove', handleMouseMove);
}
