import { Layers, Network, Cpu, Wifi, ArrowRight, CheckCircle2 } from 'lucide-react';

interface ServicesSectionProps {
  onLearnMore?: () => void;
}

export function ServicesSection({ onLearnMore }: ServicesSectionProps) {
  const pillars = [
    {
      icon: Layers,
      title: 'Multi-Input Common Spend Clustering',
      badge: 'HEURISTIC 1',
      description:
        'Identifies shared private key control across disparate transaction inputs, aggregating millions of raw UTXOs into coherent suspect clusters with explainable confidence ratings.',
      metrics: ['99.4% Clustering Precision', 'Co-spend Address Synthesis', 'Change Heuristic Validation'],
    },
    {
      icon: Network,
      title: 'Multi-Hop Peel Chain Extraction',
      badge: 'HEURISTIC 2',
      description:
        'Automated traversal of rapid 1-in-2-out micro-dispersal patterns characteristic of ransomware extortion, tracing peeling branches up to 25 blocks deep to the terminal cash-out point.',
      metrics: ['Sub-second Recursion', 'Change vs Payment Disambiguation', 'Terminal VASP Detection'],
    },
    {
      icon: Cpu,
      title: 'Isolation Forest ML Anomaly Engine',
      badge: 'ML LAYER',
      description:
        'Unsupervised statistical outlier scoring extracting 22-dimensional behavioral vectors across transaction frequency, fan-out degree, value skew, and temporal variance.',
      metrics: ['22 Feature Vectors', 'Unsupervised Outlier Ranking', 'SHAP-equivalent Explainability'],
    },
    {
      icon: Wifi,
      title: 'Network-Layer P2P IP Correlation',
      badge: 'TELEMETRY LAYER',
      description:
        'Maps Bitcoin peer-to-peer mempool broadcast propagation timing, port 8333 listeners, and autonomous system numbers (ASNs) directly against on-chain transaction hashes.',
      metrics: ['Timing Window Correlation', 'GeoIP & ASN Resolution', 'Evidence Hash Verification'],
    },
  ];

  return (
    <section id="services" className="py-24 max-w-7xl mx-auto px-6 lg:px-8">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold uppercase tracking-wider mb-4">
          <span>Core Capabilities</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0F172A] mb-4">
          Architected for Sovereign Forensic Intelligence
        </h2>
        <p className="text-base sm:text-lg text-[#64748B] leading-relaxed">
          Engineered to satisfy federal evidentiary standards, delivering cryptographic proof of illicit cryptocurrency flows without relying on proprietary cloud black boxes.
        </p>
      </div>

      {/* 4 Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {pillars.map((pillar, idx) => {
          const Icon = pillar.icon;
          return (
            <div
              key={idx}
              className="relative group bg-white/80 backdrop-blur-md border border-gray-200/80 rounded-2xl p-8 hover:shadow-xl hover:border-[#D4AF37]/50 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl bg-[#FAFAFA] border border-gray-200 flex items-center justify-center text-[#D4AF37] group-hover:bg-gradient-to-r group-hover:from-[#D4AF37] group-hover:to-[#c58528] group-hover:text-white transition-all duration-300 shadow-xs">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-gray-100 text-[#64748B] group-hover:bg-amber-50 group-hover:text-[#D4AF37] transition-colors">
                    {pillar.badge}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-[#0F172A] mb-3 group-hover:text-[#D4AF37] transition-colors">
                  {pillar.title}
                </h3>

                <p className="text-sm text-[#64748B] leading-relaxed mb-6">
                  {pillar.description}
                </p>
              </div>

              <div className="pt-6 border-t border-gray-100 space-y-2">
                {pillar.metrics.map((m, mIdx) => (
                  <div key={mIdx} className="flex items-center text-xs font-medium text-[#0F172A]/90 gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                    <span>{m}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Learn More Link */}
      <div className="mt-12 text-center">
        <button
          onClick={onLearnMore}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#D4AF37] hover:text-[#c58528] transition-colors cursor-pointer group"
        >
          <span>Review our mathematical risk scoring framework</span>
          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </section>
  );
}
