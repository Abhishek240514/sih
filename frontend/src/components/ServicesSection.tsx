import { useState, useRef, useEffect } from 'react';
import { Layers, Network, Cpu, Wifi, ArrowRight, ShieldCheck, GitFork, Check, RotateCcw } from 'lucide-react';
import { initScrollReveal, initScrollCascade, initPerspectiveCascade, gsap } from '@/lib/animation';

interface ServicesSectionProps {
  onLearnMore?: () => void;
}

export function ServicesSection({ onLearnMore }: ServicesSectionProps) {
  const containerRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const peelBoxRef = useRef<HTMLDivElement>(null);
  const [activeHopStep, setActiveHopStep] = useState(3);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    if (headerRef.current) {
      initScrollReveal(headerRef.current, undefined, { y: 20, duration: 0.6 });
    }

    initScrollCascade(containerRef.current, '.gsap-service-anchor', 0.1);
    initPerspectiveCascade(containerRef.current, '.gsap-service-pillar', 0.08);

    // Live sequential peel animation timeline on scroll
    if (peelBoxRef.current) {
      gsap.timeline({
        scrollTrigger: {
          trigger: peelBoxRef.current,
          start: 'top 75%',
          toggleActions: 'play none none none',
          onEnter: () => replayTrace(),
        },
      });
    }
  }, []);

  const replayTrace = () => {
    setIsSimulating(true);
    setActiveHopStep(0);

    const timer1 = setTimeout(() => setActiveHopStep(1), 600);
    const timer2 = setTimeout(() => setActiveHopStep(2), 1200);
    const timer3 = setTimeout(() => {
      setActiveHopStep(3);
      setIsSimulating(false);
    }, 1800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  };

  return (
    <section
      ref={containerRef}
      id="services"
      className="py-24 max-w-7xl mx-auto px-6 lg:px-8 select-none"
    >
      {/* Section Header */}
      <div ref={headerRef} className="max-w-3xl mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold uppercase tracking-wider mb-4">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Forensic Engine Architecture</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-tight text-[#0F172A] leading-[1.15] mb-4">
          Engineered for Sovereign Blockchain Forensic Investigations
        </h2>
        <p className="text-base sm:text-lg text-[#64748B] leading-relaxed">
          Deterministic heuristics and unsupervised machine learning models assembled to satisfy Title 18 U.S.C. evidentiary thresholds, without proprietary black boxes or external cloud leakage.
        </p>
      </div>

      {/* Asymmetrical Layout: Anchor Card + Complementary Pillars */}
      <div className="space-y-6">
        {/* Large Featured Anchor: Peel Chain & Clustering Visualizer */}
        <div className="gsap-service-anchor bg-white rounded-3xl border border-gray-200/90 shadow-sm p-8 lg:p-10 transition-all duration-300 hover:shadow-md hover:border-[#D4AF37]/40">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Narrative */}
            <div className="lg:col-span-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                  <Network className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-gray-100 text-[#64748B]">
                    CORE ALGORITHM 01 & 02
                  </span>
                  <h3 className="text-2xl font-bold text-[#0F172A] mt-1">
                    Multi-Hop Peel Chain & Co-Spend Clustering
                  </h3>
                </div>
              </div>

              <p className="text-sm text-[#64748B] leading-relaxed">
                Automated graph recursion traversing 1-in-2-out micro-dispersals characteristic of ransomware payouts. Disambiguates change addresses using decimal matching, round-number heuristic rules, and co-spending patterns up to 25 hops deep.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-gray-200/80">
                  <div className="text-[11px] font-medium text-[#64748B] uppercase tracking-wide">Clustering Precision</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-[#0F172A] mt-0.5">99.42%</div>
                  <div className="text-[11px] text-emerald-600 font-medium mt-0.5">Zero false merge target</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#FAFAFA] border border-gray-200/80">
                  <div className="text-[11px] font-medium text-[#64748B] uppercase tracking-wide">Recursion Depth</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-[#0F172A] mt-0.5">25 Hops</div>
                  <div className="text-[11px] text-[#D4AF37] font-medium mt-0.5">Sub-second traversal</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F172A]/80 bg-gray-50 border border-gray-200/70 px-3 py-1 rounded-full">
                  <Check className="w-3.5 h-3.5 text-[#D4AF37]" />
                  Common Spend Attribution
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F172A]/80 bg-gray-50 border border-gray-200/70 px-3 py-1 rounded-full">
                  <Check className="w-3.5 h-3.5 text-[#D4AF37]" />
                  Change Address Disambiguation
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F172A]/80 bg-gray-50 border border-gray-200/70 px-3 py-1 rounded-full">
                  <Check className="w-3.5 h-3.5 text-[#D4AF37]" />
                  Terminal VASP Attributions
                </span>
              </div>
            </div>

            {/* Right Live Visual Simulation of Peel Chain */}
            <div
              ref={peelBoxRef}
              className="lg:col-span-6 bg-[#0F172A] rounded-2xl p-6 text-white border border-gray-800 shadow-inner space-y-4 relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
                  <span className="font-mono text-gray-300">LIVE PEEL RECONSTRUCTION</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-[#D4AF37]">DARKSIDE • 75.00 BTC</span>
                  <button
                    type="button"
                    onClick={replayTrace}
                    disabled={isSimulating}
                    title="Replay Peel Traversal"
                    className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3 h-3 ${isSimulating ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Hop 1 */}
              <div
                className={`flex items-center justify-between gap-3 text-xs font-mono transition-all duration-500 ${
                  activeHopStep >= 0 ? 'opacity-100 translate-y-0' : 'opacity-30 translate-y-1'
                }`}
              >
                <div
                  className={`p-2.5 rounded-lg bg-gray-900 border flex-1 transition-all duration-300 ${
                    activeHopStep >= 0 ? 'border-emerald-500/60 shadow-[0_0_12px_rgba(16,185,129,0.15)]' : 'border-gray-700/60'
                  }`}
                >
                  <div className="text-gray-400 text-[10px]">HOP 0 (INITIAL EXTORTION)</div>
                  <div className="text-emerald-400 font-bold truncate">bc1q...d98a (75.00 BTC)</div>
                </div>
                <GitFork
                  className={`w-4 h-4 shrink-0 transition-colors duration-300 ${
                    activeHopStep >= 1 ? 'text-[#D4AF37]' : 'text-gray-600'
                  }`}
                />
                <div
                  className={`p-2.5 rounded-lg bg-gray-900/90 border flex-1 transition-all duration-300 ${
                    activeHopStep >= 1 ? 'border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.15)]' : 'border-gray-700/60'
                  }`}
                >
                  <div className="text-gray-400 text-[10px]">BRANCH 1 (PEEL)</div>
                  <div className="text-amber-400 font-bold">11.30 BTC &rarr; Mixer</div>
                </div>
              </div>

              {/* Hop 2 */}
              <div
                className={`flex items-center justify-between gap-3 text-xs font-mono pl-4 border-l-2 transition-all duration-500 ${
                  activeHopStep >= 2
                    ? 'border-[#D4AF37] opacity-100 translate-y-0'
                    : 'border-gray-800 opacity-30 translate-y-1'
                }`}
              >
                <div
                  className={`p-2.5 rounded-lg bg-gray-900 border flex-1 transition-all duration-300 ${
                    activeHopStep >= 2 ? 'border-blue-500/60 shadow-[0_0_12px_rgba(59,130,246,0.15)]' : 'border-gray-700/60'
                  }`}
                >
                  <div className="text-gray-400 text-[10px]">HOP 1 (CHANGE ADDRESS)</div>
                  <div className="text-white font-bold truncate">bc1q...x412 (63.70 BTC)</div>
                </div>
                <GitFork
                  className={`w-4 h-4 shrink-0 transition-colors duration-300 ${
                    activeHopStep >= 2 ? 'text-[#D4AF37]' : 'text-gray-600'
                  }`}
                />
                <div
                  className={`p-2.5 rounded-lg bg-gray-900/90 border flex-1 transition-all duration-300 ${
                    activeHopStep >= 2 ? 'border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.15)]' : 'border-gray-700/60'
                  }`}
                >
                  <div className="text-gray-400 text-[10px]">BRANCH 2 (PEEL)</div>
                  <div className="text-amber-400 font-bold">8.40 BTC &rarr; Exchange</div>
                </div>
              </div>

              {/* Hop 3 (Terminal seizure) */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all duration-500 ${
                  activeHopStep >= 3
                    ? 'bg-amber-950/40 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.2)] opacity-100 scale-100'
                    : 'bg-gray-900/50 border-gray-800 opacity-40 scale-[0.99]'
                }`}
              >
                <div>
                  <div className="text-[#D4AF37] font-semibold text-[11px] flex items-center gap-1.5">
                    {activeHopStep >= 3 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                    <span>JUDICIAL RECOVERY SEIZURE</span>
                  </div>
                  <div className="text-gray-300 font-mono text-[10px]">U.S. Marshals Service Custody Escrow</div>
                </div>
                <span className="font-mono font-bold text-emerald-400 text-sm">63.70 BTC RECOVERED</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Complementary Specialized Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Isolation Forest ML */}
          <div className="gsap-service-pillar bg-white rounded-3xl border border-gray-200/90 p-7 shadow-xs hover:shadow-md hover:border-[#D4AF37]/40 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200/60 flex items-center justify-center text-purple-600">
                <Cpu className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-gray-100 text-[#64748B]">
                ML ENGINE
              </span>
              <h4 className="text-lg font-bold text-[#0F172A]">
                Isolation Forest Anomaly Scoring
              </h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Extracts 22-dimensional topological and temporal features from every transaction. Identifies sudden fan-out explosions, value skew, and peel structuring without supervision.
              </p>
            </div>

            <div className="pt-6 mt-6 border-t border-gray-100 flex justify-between items-center text-xs font-mono tabular-nums">
              <span className="text-gray-500">Feature Dimensions</span>
              <span className="font-bold text-[#0F172A]">22 Behavioral Features</span>
            </div>
          </div>

          {/* Card 2: P2P Mempool Correlation */}
          <div className="gsap-service-pillar bg-white rounded-3xl border border-gray-200/90 p-7 shadow-xs hover:shadow-md hover:border-[#D4AF37]/40 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
                <Wifi className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-gray-100 text-[#64748B]">
                NETWORK TELEMETRY
              </span>
              <h4 className="text-lg font-bold text-[#0F172A]">
                P2P Mempool Propagation Timing
              </h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Correlates transaction broadcast arrival times across distributed Bitcoin nodes, pinpointing initial broadcast nodes, ASNs, and bulletproof proxy relays before blockchain inclusion.
              </p>
            </div>

            <div className="pt-6 mt-6 border-t border-gray-100 flex justify-between items-center text-xs font-mono tabular-nums">
              <span className="text-gray-500">Latency Resolution</span>
              <span className="font-bold text-blue-600">&lt; 420ms Delta</span>
            </div>
          </div>

          {/* Card 3: Cryptographic Integrity */}
          <div className="gsap-service-pillar bg-white rounded-3xl border border-gray-200/90 p-7 shadow-xs hover:shadow-md hover:border-[#D4AF37]/40 transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-gray-100 text-[#64748B]">
                EVIDENTIARY AUDIT
              </span>
              <h4 className="text-lg font-bold text-[#0F172A]">
                Cryptographic Chain of Custody
              </h4>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Every heuristic extraction and cluster expansion generates an immutable SHA-256 audit entry. Complies with Federal Rules of Evidence 902(13)/(14) for self-authenticating digital records.
              </p>
            </div>

            <div className="pt-6 mt-6 border-t border-gray-100 flex justify-between items-center text-xs font-mono tabular-nums">
              <span className="text-gray-500">Legal Compliance</span>
              <span className="font-bold text-[#D4AF37]">Title 18 § 981</span>
            </div>
          </div>
        </div>
      </div>

      {/* Learn More Link */}
      <div className="mt-12 text-center">
        <button
          type="button"
          onClick={onLearnMore}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#D4AF37] hover:text-[#c58528] transition-colors cursor-pointer group"
        >
          <span>Explore our mathematical risk decomposition model</span>
          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </section>
  );
}
