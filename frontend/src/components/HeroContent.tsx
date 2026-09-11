import { Shield, ArrowRight, Database } from 'lucide-react';

interface HeroContentProps {
  onExploreGraph: () => void;
  onIngestDataset: () => void;
}

export function HeroContent({ onExploreGraph, onIngestDataset }: HeroContentProps) {
  return (
    <div className="relative z-10 max-w-4xl mx-auto px-6 flex flex-col items-center justify-center text-center mt-[-40px] md:mt-[-80px]">
      {/* Eyebrow Badge */}
      <div className="gsap-hero-eyebrow opacity-0 inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-gray-200/80 shadow-xs mb-6 select-none">
        <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse" />
        <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
        <span className="text-[11px] font-semibold tracking-wider text-[#64748B] uppercase">
          AI-POWERED • BLOCKCHAIN FORENSICS • OFFLINE COMPLIANT
        </span>
      </div>

      {/* Main Heading */}
      <h1 className="gsap-hero-heading opacity-0 text-4xl sm:text-5xl md:text-6xl lg:text-[68px] font-bold tracking-[-0.03em] text-[#0F172A] leading-[1.08] mb-6">
        Trace <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#D4AF37] via-[#c58528] to-[#9a6316]">Bitcoin</span> Intelligence Across Any UTXO Cluster
      </h1>

      {/* Sub-headline */}
      <p className="gsap-hero-paragraph opacity-0 text-base sm:text-lg md:text-xl font-normal text-[#64748B] leading-relaxed max-w-2xl mb-9 text-balance">
        Ingest raw transaction datasets, correlate network-layer broadcast observations, isolate anomalies with ML, and de-anonymize illicit capital across multi-hop peel chains.
      </p>

      {/* Action Buttons */}
      <div className="gsap-hero-buttons opacity-0 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
        <button
          type="button"
          onClick={onExploreGraph}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full font-semibold text-sm text-white bg-gradient-to-r from-[#D4AF37] to-[#c58528] hover:shadow-md hover:shadow-[#D4AF37]/25 active:scale-[0.98] transition-all duration-200 cursor-pointer"
        >
          <span>Explore Forensic Graph</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onIngestDataset}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full font-semibold text-sm text-[#0F172A] bg-white/90 backdrop-blur-md border border-gray-200 hover:bg-white hover:border-gray-300 shadow-xs active:scale-[0.98] transition-all duration-200 cursor-pointer"
        >
          <Database className="w-4 h-4 text-[#64748B]" />
          <span>Ingest Dataset</span>
        </button>
      </div>
    </div>
  );
}
