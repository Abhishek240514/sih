import { useRef, useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { VideoBackground } from './VideoBackground';
import { Header } from './Header';
import { HeroContent } from './HeroContent';

interface HeroProps {
  onOpenWorkstation: () => void;
  onExploreGraph: () => void;
  onIngestDataset: () => void;
}

export function Hero({ onOpenWorkstation, onExploreGraph, onIngestDataset }: HeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const animationRanRef = useRef(false);

  useEffect(() => {
    // If video is ready or timed out after 1.5s, run GSAP timeline
    const timer = setTimeout(() => {
      setVideoReady(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!videoReady || animationRanRef.current) return;
    animationRanRef.current = true;

    const ctx = gsap.context(() => {
      // Set initial state
      gsap.set(headerRef.current, { y: -30, opacity: 0 });
      gsap.set('.gsap-hero-eyebrow', { y: 20, opacity: 0 });
      gsap.set('.gsap-hero-line-1', { y: '100%', opacity: 0 });
      gsap.set('.gsap-hero-line-2', { y: '100%', opacity: 0 });
      gsap.set('.gsap-hero-paragraph', { y: 24, opacity: 0 });
      gsap.set('.gsap-hero-buttons', { y: 24, opacity: 0 });

      const tl = gsap.timeline({ defaults: { ease: 'expo.out', duration: 0.75 } });

      tl.to(headerRef.current, { y: 0, opacity: 1, duration: 0.6 }, 0.1)
        .to('.gsap-hero-eyebrow', { y: 0, opacity: 1, duration: 0.5 }, 0.2)
        .to('.gsap-hero-line-1', { y: '0%', opacity: 1, duration: 0.75 }, 0.28)
        .to('.gsap-hero-line-2', { y: '0%', opacity: 1, duration: 0.75 }, 0.38)
        .to('.gsap-hero-paragraph', { y: 0, opacity: 1, duration: 0.65 }, 0.48)
        .to('.gsap-hero-buttons', { y: 0, opacity: 1, duration: 0.6 }, 0.58);
    }, containerRef);

    return () => ctx.revert();
  }, [videoReady]);

  return (
    <section
      ref={containerRef}
      id="overview"
      className="relative w-full h-[100dvh] min-h-[640px] overflow-hidden flex flex-col justify-between select-none"
    >
      {/* 1. Looping High-Tech Motion Background */}
      <VideoBackground onVideoReady={() => setVideoReady(true)} />

      {/* 2. Top Header Navigation */}
      <Header
        ref={headerRef}
        onOpenWorkstation={onOpenWorkstation}
      />

      {/* 3. Centered Typographic Content */}
      <HeroContent
        onExploreGraph={onExploreGraph}
        onIngestDataset={onIngestDataset}
      />

      {/* Bottom Spacer / Subtle Scroll Hint */}
      <div className="relative z-10 pb-6 flex justify-center items-center text-xs font-semibold text-[#64748B] tracking-wider uppercase">
        <span className="inline-flex items-center gap-2">
          <span>Scroll to Inspect Forensic Telemetry</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-ping" />
        </span>
      </div>
    </section>
  );
}
