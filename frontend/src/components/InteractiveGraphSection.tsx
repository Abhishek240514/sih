import { useState, useRef, useEffect } from 'react';
import { Network, ExternalLink, Info, X } from 'lucide-react';
import { initScrollReveal, gsap, EASINGS } from '@/lib/animation';

interface InteractiveGraphSectionProps {
  onOpenFullExplorer?: () => void;
}

export function InteractiveGraphSection({ onOpenFullExplorer }: InteractiveGraphSectionProps) {
  const containerRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nodesContainerRef = useRef<HTMLDivElement>(null);
  const [selectedCase, setSelectedCase] = useState<'colonial' | 'chipmixer' | 'hydra'>('colonial');
  const [activeNode, setActiveNode] = useState<any>(null);

  useEffect(() => {
    if (cardRef.current) {
      initScrollReveal(cardRef.current, undefined, { y: 24, duration: 0.6 });
    }
  }, []);

  // Animate node bloom on case change
  useEffect(() => {
    if (nodesContainerRef.current) {
      gsap.fromTo(
        nodesContainerRef.current.querySelectorAll('.graph-node-card'),
        { opacity: 0, scale: 0.88, y: 14 },
        { opacity: 1, scale: 1, y: 0, duration: 0.45, stagger: 0.05, ease: EASINGS.expoOut }
      );
    }
  }, [selectedCase]);

  const casesData = {
    colonial: {
      name: 'Colonial Pipeline Extortion',
      docket: 'CASE-2024-DARKSIDE',
      seed: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      totalBtc: '75.00 BTC',
      usdValue: '$4,821,000 USD',
      nodes: [
        {
          id: 'n1',
          label: 'Victim Extortion Deposit',
          btc: '75.00 BTC',
          type: 'SEED UTXO',
          color: '#D4AF37',
          confidence: '100% Observed',
          address: 'bc1q7x412...d98a0',
          attribution: 'Colonial Pipeline Inflow',
        },
        {
          id: 'n2',
          label: 'DarkSide Consolidator',
          btc: '74.99 BTC',
          type: 'SUSPECT CLUSTER',
          color: '#E11D48',
          confidence: '99.4% Multi-Spend',
          address: '1A1zP1eP...DivfNa',
          attribution: 'Ransomware Core Syndicate',
        },
        {
          id: 'n3',
          label: 'Peel Branch Hop 1',
          btc: '5.00 BTC',
          type: 'PEEL BRANCH',
          color: '#D97706',
          confidence: '97.8% Heuristic',
          address: '3J98t1Wp...pTmo9',
          attribution: 'Affiliate Payout Split',
        },
        {
          id: 'n4',
          label: 'Peel Branch Hop 2 (Change)',
          btc: '69.98 BTC',
          type: 'CHANGE ADDRESS',
          color: '#3B82F6',
          confidence: '98.2% Decimal Match',
          address: 'bc1q98f4...x512b',
          attribution: 'Unspent Change Reserve',
        },
        {
          id: 'n5',
          label: 'Garantex OTC Cashout',
          btc: '4.85 BTC',
          type: 'TERMINAL VASP',
          color: '#7C3AED',
          confidence: '99.1% OFAC Match',
          address: '34xp4vRo...Twseo',
          attribution: 'Sanctioned Darknet Exchange',
        },
        {
          id: 'n6',
          label: 'Judicially Seized Hold',
          btc: '63.70 BTC',
          type: 'SEIZED ASSET',
          color: '#16A34A',
          confidence: '100% USMS Custody',
          address: 'bc1qseize...marshals',
          attribution: 'U.S. Marshals Escrow #981',
        },
      ],
      edges: [
        { source: 'Victim Extortion Deposit', target: 'DarkSide Consolidator', value: '75.00 BTC' },
        { source: 'DarkSide Consolidator', target: 'Peel Branch Hop 1', value: '5.00 BTC' },
        { source: 'DarkSide Consolidator', target: 'Peel Branch Hop 2', value: '69.98 BTC' },
        { source: 'Peel Branch Hop 1', target: 'Garantex OTC Cashout', value: '4.85 BTC' },
        { source: 'Peel Branch Hop 2', target: 'Judicially Seized Hold', value: '63.70 BTC' },
      ],
    },
    chipmixer: {
      name: 'ChipMixer Obfuscation Pool',
      docket: 'CASE-2024-CHIPMIX',
      seed: '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo',
      totalBtc: '142.45 BTC',
      usdValue: '$9,156,700 USD',
      nodes: [
        {
          id: 'n1',
          label: 'Illicit Ransom Inflow',
          btc: '142.45 BTC',
          type: 'SEED UTXO',
          color: '#D4AF37',
          confidence: '100% Observed',
          address: '1BvBMSEY...Wxyz9',
          attribution: 'Extortion Payout',
        },
        {
          id: 'n2',
          label: 'Wasabi CoinJoin Pool',
          btc: '140.00 BTC',
          type: 'COINJOIN MIXER',
          color: '#2563EB',
          confidence: '96.5% Whirlpool Entropy',
          address: 'bc1qjoin...wasabi',
          attribution: 'ZeroLink Mixing Round',
        },
        {
          id: 'n3',
          label: 'Split Output 0.1 BTC',
          btc: '0.10 BTC',
          type: 'CLEANED OUTPUT',
          color: '#D97706',
          confidence: '94.2% Time-Delta',
          address: 'bc1qsub01...a8f9',
          attribution: 'Dispersed UTXO',
        },
        {
          id: 'n4',
          label: 'Split Output 1.0 BTC',
          btc: '1.00 BTC',
          type: 'CLEANED OUTPUT',
          color: '#D97706',
          confidence: '94.2% Time-Delta',
          address: 'bc1qsub10...c41e',
          attribution: 'Dispersed UTXO',
        },
        {
          id: 'n5',
          label: 'Anonymous Relay VASP',
          btc: '138.90 BTC',
          type: 'TERMINAL VASP',
          color: '#7C3AED',
          confidence: '97.8% Cluster Map',
          address: '1PeelMix...982k',
          attribution: 'High-Volume Cashout Desk',
        },
      ],
      edges: [
        { source: 'Illicit Ransom Inflow', target: 'Wasabi CoinJoin Pool', value: '142.45 BTC' },
        { source: 'Wasabi CoinJoin Pool', target: 'Split Output 0.1 BTC', value: '0.10 BTC' },
        { source: 'Wasabi CoinJoin Pool', target: 'Split Output 1.0 BTC', value: '1.00 BTC' },
        { source: 'Wasabi CoinJoin Pool', target: 'Anonymous Relay VASP', value: '138.90 BTC' },
      ],
    },
    hydra: {
      name: 'Hydra Darknet Marketplace OTC',
      docket: 'CASE-2024-HYDRA',
      seed: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      totalBtc: '450.20 BTC',
      usdValue: '$28,940,000 USD',
      nodes: [
        {
          id: 'n1',
          label: 'Vendor Escrow Account',
          btc: '450.20 BTC',
          type: 'SEED UTXO',
          color: '#D4AF37',
          confidence: '100% Observed',
          address: 'bc1qar0s...wf5mdq',
          attribution: 'Hydra Master Escrow',
        },
        {
          id: 'n2',
          label: 'High-Fan-In Mixer',
          btc: '448.00 BTC',
          type: 'SUSPECT CLUSTER',
          color: '#E11D48',
          confidence: '99.8% Co-Spend',
          address: '1HydraMix...k882',
          attribution: 'Internal Tumbler',
        },
        {
          id: 'n3',
          label: 'Peer OTC Broker Alpha',
          btc: '120.00 BTC',
          type: 'TERMINAL VASP',
          color: '#7C3AED',
          confidence: '98.4% KYC Subpoena',
          address: '3OtcAlpha...p891',
          attribution: 'Unlicensed Russian OTC Broker',
        },
        {
          id: 'n4',
          label: 'Peer OTC Broker Beta',
          btc: '328.00 BTC',
          type: 'TERMINAL VASP',
          color: '#7C3AED',
          confidence: '99.0% KYC Subpoena',
          address: '3OtcBeta...w102',
          attribution: 'Unlicensed CIS Cashout Desk',
        },
      ],
      edges: [
        { source: 'Vendor Escrow Account', target: 'High-Fan-In Mixer', value: '450.20 BTC' },
        { source: 'High-Fan-In Mixer', target: 'Peer OTC Broker Alpha', value: '120.00 BTC' },
        { source: 'High-Fan-In Mixer', target: 'Peer OTC Broker Beta', value: '328.00 BTC' },
      ],
    },
  };

  const current = casesData[selectedCase];

  return (
    <section
      ref={containerRef}
      id="graph-canvas"
      className="py-20 max-w-7xl mx-auto px-6 lg:px-8 select-none"
    >
      <div
        ref={cardRef}
        className="bg-white/90 backdrop-blur-xl border border-gray-200/90 rounded-3xl p-6 sm:p-10 shadow-sm overflow-hidden"
      >
        {/* Section Header & Case Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-gray-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold uppercase tracking-wider mb-3">
              <Network className="w-3.5 h-3.5" />
              <span>Heterogeneous Graph Topology</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
              Interactive Transaction Network Canvas
            </h2>
            <p className="text-sm text-[#64748B] mt-1">
              Visualize co-spending multi-input clusters, peel chains, and mixing hops with sub-second graph traversal.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'colonial', label: 'Colonial Pipeline (75 BTC)' },
              { id: 'chipmixer', label: 'ChipMixer Pool (142 BTC)' },
              { id: 'hydra', label: 'Hydra Darknet OTC (450 BTC)' },
            ].map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setSelectedCase(preset.id as any);
                  setActiveNode(null);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  selectedCase === preset.id
                    ? 'bg-[#0F172A] text-white shadow-xs'
                    : 'bg-gray-100 text-[#64748B] hover:bg-gray-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Graph Canvas Container */}
        <div className="relative mt-8 min-h-[460px] bg-[#FAFAFA] border border-gray-200/80 rounded-2xl p-6 flex flex-col justify-between overflow-hidden">
          {/* Top Bar Info */}
          <div className="flex flex-wrap items-center justify-between gap-4 z-10">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold font-mono px-2.5 py-1 rounded bg-amber-50 text-[#D4AF37] border border-[#D4AF37]/20">
                {current.docket}
              </span>
              <span className="text-sm font-bold text-[#0F172A]">{current.name}</span>
            </div>
            <div className="text-xs font-mono tabular-nums text-[#64748B]">
              Tracked Volume: <strong className="text-[#0F172A] font-bold">{current.totalBtc}</strong> ({current.usdValue})
            </div>
          </div>

          {/* Interactive Nodes Display */}
          <div ref={nodesContainerRef} className="py-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {current.nodes.map(node => (
              <div
                key={node.id}
                onClick={() => setActiveNode(node)}
                className={`graph-node-card relative group p-4 rounded-2xl bg-white border cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md flex flex-col items-center text-center ${
                  activeNode?.id === node.id
                    ? 'border-[#D4AF37] ring-4 ring-[#D4AF37]/20 shadow-md scale-[1.02]'
                    : 'border-gray-200/80 hover:border-gray-300'
                }`}
              >
                {activeNode?.id === node.id && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#D4AF37] animate-ping" />
                )}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white mb-2 shadow-xs transition-transform duration-300 group-hover:scale-105"
                  style={{ backgroundColor: node.color }}
                >
                  <Network className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#0F172A] line-clamp-1">{node.label}</span>
                <span className="text-xs font-mono tabular-nums font-semibold text-[#D4AF37] mt-1">{node.btc}</span>
                <span className="text-[10px] uppercase font-mono text-[#64748B] mt-0.5">{node.type}</span>
              </div>
            ))}
          </div>

          {/* Docked Inspector Drawer (when node is clicked) */}
          {activeNode && (
            <div className="bg-white border border-[#D4AF37]/40 rounded-xl p-4 shadow-sm mb-4 animate-fade-in flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0"
                  style={{ backgroundColor: activeNode.color }}
                >
                  <Network className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0F172A]">{activeNode.label}</span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-50 text-[#D4AF37] border border-[#D4AF37]/20">
                      {activeNode.confidence}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#64748B] font-mono mt-0.5">
                    Address: <strong className="text-[#0F172A]">{activeNode.address}</strong> • Attribution: {activeNode.attribution}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={onOpenFullExplorer}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] transition-all cursor-pointer"
                >
                  Isolate in Workstation
                </button>
                <button
                  type="button"
                  onClick={() => setActiveNode(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Bottom Control Bar */}
          <div className="bg-white/90 backdrop-blur-md border border-gray-200/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 z-10">
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <Info className="w-4 h-4 text-[#D4AF37]" />
              <span>Select any cluster node to inspect cryptographic proofs and UTXO breakdown.</span>
            </div>

            <button
              type="button"
              onClick={onOpenFullExplorer}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37] hover:text-[#c58528] transition-colors cursor-pointer"
            >
              <span>Open in SOC Graph Workstation</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
