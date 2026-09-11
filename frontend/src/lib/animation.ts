import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger safely
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };

/**
 * Standardized easing curves per design guidelines
 */
export const EASINGS = {
  power3Out: 'power3.out',
  expoOut: 'expo.out',
  smooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
};

/**
 * Smooth entrance animation for a section or element triggered on scroll
 */
export function initScrollReveal(
  triggerElement: HTMLElement | string,
  targetElement?: HTMLElement | string,
  options?: { y?: number; duration?: number; delay?: number }
) {
  const target = targetElement || triggerElement;
  const yOffset = options?.y ?? 24;
  const duration = options?.duration ?? 0.6;
  const delay = options?.delay ?? 0;

  return gsap.fromTo(
    target,
    { opacity: 0, y: yOffset },
    {
      opacity: 1,
      y: 0,
      duration,
      delay,
      ease: EASINGS.power3Out,
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
  stagger = 0.08
) {
  return gsap.fromTo(
    itemSelector,
    { opacity: 0, y: 28 },
    {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger,
      ease: EASINGS.power3Out,
      scrollTrigger: {
        trigger: container,
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
    }
  );
}
