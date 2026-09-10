import { Shield, ArrowRight, Database } from 'lucide-react';

interface HeroContentProps {
  onExploreGraph: () => void;
  onIngestDataset: () => void;
}

export function HeroContent({ onExploreGraph, onIngestDataset }: HeroContentProps) {
  return (
    <div className="relative z-10 max-w-4xl mx-auto px-6 flex flex-col items-center justify-center text-center mt-[-60px] md:mt-[-100px]">
      {/* Eyebrow Tag */}
      <div className="gsap-hero-eyebrow opacity-0 inline-flex items-center space-x-3 px-4 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-white/50 shadow-xs mb-6 select-none">
        <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
        <span className="text-xs font-semibold tracking-wider text-[#64748B] uppercase">
          AI-POWERED • BLOCKCHAIN FORENSICS • OFFLINE
        </span>
      </div>

      {/* Main Heading */}
      <h1 className="gsap-hero-heading opacity-0 text-5xl sm:text-6xl md:text-7xl lg:text-[80px] font-extrabold tracking-tight text-[#0F172A] leading-[1.05] mb-6">
        Trace <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#D4AF37] to-[#c58528]">Bitcoin</span> Intelligence
      </h1>

      {/* Sub-headline Paragraph */}
      <p className="gsap-hero-paragraph opacity-0 text-lg sm:text-xl font-medium text-[#64748B] leading-relaxed max-w-2xl mb-8">
        Ingest transaction metadata, correlate network-layer observations, isolate anomalies with ML, and trace illicit fund flows across multi-hop peel chains.
      </p>

      {/* CTA Buttons */}
      <div className="gsap-hero-buttons opacity-0 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
        <button
          type="button"
          onClick={onExploreGraph}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-white bg-gradient-to-r from-[#D4AF37] to-[#c58528] hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
        >
          <span>Explore Transaction Graph</span>
          <ArrowRight className="w-[18px] h-[18px]" />
        </button>

        <button
          type="button"
          onClick={onIngestDataset}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-[#0F172A] bg-white/80 backdrop-blur-md border border-gray-200 hover:bg-white hover:border-gray-300 shadow-xs transition-all duration-300 cursor-pointer"
        >
          <Database className="w-[18px] h-[18px] text-[#64748B]" />
          <span>Ingest Dataset</span>
        </button>
      </div>
    </div>
  );
}
