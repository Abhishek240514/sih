import { useState } from 'react';
import { Network, ExternalLink, Info } from 'lucide-react';

interface InteractiveGraphSectionProps {
  onOpenFullExplorer?: () => void;
}

export function InteractiveGraphSection({ onOpenFullExplorer }: InteractiveGraphSectionProps) {
  const [selectedCase, setSelectedCase] = useState<'colonial' | 'chipmixer' | 'hydra'>('colonial');
  const [activeNode, setActiveNode] = useState<any>(null);

  const casesData = {
    colonial: {
      name: 'Colonial Pipeline Extortion',
      docket: 'CASE-2024-DARKSIDE',
      seed: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      totalBtc: '75.0 BTC',
      nodes: [
        { id: 'n1', label: 'Victim Extortion Deposit', btc: '75.0 BTC', type: 'seed', color: '#D4AF37' },
        { id: 'n2', label: 'DarkSide Consolidator', btc: '74.99 BTC', type: 'cluster', color: '#E11D48' },
        { id: 'n3', label: 'Peel Branch Hop 1', btc: '5.0 BTC', type: 'peel', color: '#D97706' },
        { id: 'n4', label: 'Peel Branch Hop 2', btc: '69.98 BTC', type: 'peel', color: '#D97706' },
        { id: 'n5', label: 'Garantex OTC Cashout', btc: '4.85 BTC', type: 'vasp', color: '#7C3AED' },
        { id: 'n6', label: 'Seized Wallet Hold', btc: '63.7 BTC', type: 'seized', color: '#16A34A' },
      ],
      edges: [
        { source: 'Victim Extortion Deposit', target: 'DarkSide Consolidator', value: '75.0 BTC' },
        { source: 'DarkSide Consolidator', target: 'Peel Branch Hop 1', value: '5.0 BTC' },
        { source: 'DarkSide Consolidator', target: 'Peel Branch Hop 2', value: '69.98 BTC' },
        { source: 'Peel Branch Hop 1', target: 'Garantex OTC Cashout', value: '4.85 BTC' },
        { source: 'Peel Branch Hop 2', target: 'Seized Wallet Hold', value: '63.7 BTC' },
      ],
    },
    chipmixer: {
      name: 'ChipMixer Obfuscation Pool',
      docket: 'CASE-2024-CHIPMIX',
      seed: '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo',
      totalBtc: '142.45 BTC',
      nodes: [
        { id: 'n1', label: 'Illicit Ransom Inflow', btc: '142.45 BTC', type: 'seed', color: '#D4AF37' },
        { id: 'n2', label: 'Wasabi CoinJoin Pool', btc: '140.0 BTC', type: 'mixer', color: '#2563EB' },
        { id: 'n3', label: 'Split Output 0.1 BTC', btc: '0.1 BTC', type: 'peel', color: '#D97706' },
        { id: 'n4', label: 'Split Output 1.0 BTC', btc: '1.0 BTC', type: 'peel', color: '#D97706' },
        { id: 'n5', label: 'Anonymous Relay', btc: '138.9 BTC', type: 'vasp', color: '#7C3AED' },
      ],
      edges: [
        { source: 'Illicit Ransom Inflow', target: 'Wasabi CoinJoin Pool', value: '142.45 BTC' },
        { source: 'Wasabi CoinJoin Pool', target: 'Split Output 0.1 BTC', value: '0.1 BTC' },
        { source: 'Wasabi CoinJoin Pool', target: 'Split Output 1.0 BTC', value: '1.0 BTC' },
        { source: 'Wasabi CoinJoin Pool', target: 'Anonymous Relay', value: '138.9 BTC' },
      ],
    },
    hydra: {
      name: 'Hydra Darknet Marketplace OTC',
      docket: 'CASE-2024-HYDRA',
      seed: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      totalBtc: '450.20 BTC',
      nodes: [
        { id: 'n1', label: 'Vendor Escrow Account', btc: '450.2 BTC', type: 'seed', color: '#D4AF37' },
        { id: 'n2', label: 'High-Fan-In Mixer', btc: '448.0 BTC', type: 'cluster', color: '#E11D48' },
        { id: 'n3', label: 'Peer OTC Broker 1', btc: '120.0 BTC', type: 'vasp', color: '#7C3AED' },
        { id: 'n4', label: 'Peer OTC Broker 2', btc: '328.0 BTC', type: 'vasp', color: '#7C3AED' },
      ],
      edges: [
        { source: 'Vendor Escrow Account', target: 'High-Fan-In Mixer', value: '450.2 BTC' },
        { source: 'High-Fan-In Mixer', target: 'Peer OTC Broker 1', value: '120.0 BTC' },
        { source: 'High-Fan-In Mixer', target: 'Peer OTC Broker 2', value: '328.0 BTC' },
      ],
    },
  };

  const current = casesData[selectedCase];

  return (
    <section id="graph-canvas" className="py-20 max-w-7xl mx-auto px-6 lg:px-8">
      <div className="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-3xl p-6 sm:p-10 shadow-xl overflow-hidden">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-gray-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold uppercase tracking-wider mb-3">
              <Network className="w-3.5 h-3.5" />
              <span>Interactive Graph Visualization</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Heterogeneous Transaction Network Engine
            </h2>
            <p className="text-sm text-[#64748B] mt-1">
              Visualize co-spending multi-input clusters, peel chains, and mixing hops with sub-second graph traversal.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedCase('colonial')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                selectedCase === 'colonial'
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#c58528] text-white shadow-sm'
                  : 'bg-gray-100 text-[#64748B] hover:bg-gray-200'
              }`}
            >
              Colonial Pipeline (75 BTC)
            </button>
            <button
              onClick={() => setSelectedCase('chipmixer')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                selectedCase === 'chipmixer'
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#c58528] text-white shadow-sm'
                  : 'bg-gray-100 text-[#64748B] hover:bg-gray-200'
              }`}
            >
              ChipMixer Pool (142 BTC)
            </button>
            <button
              onClick={() => setSelectedCase('hydra')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                selectedCase === 'hydra'
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#c58528] text-white shadow-sm'
                  : 'bg-gray-100 text-[#64748B] hover:bg-gray-200'
              }`}
            >
              Hydra OTC (450 BTC)
            </button>
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
              <span className="text-sm font-semibold text-[#0F172A]">{current.name}</span>
            </div>
            <div className="text-xs font-mono text-[#64748B]">
              Total Tracked: <strong className="text-[#0F172A] font-bold">{current.totalBtc}</strong>
            </div>
          </div>

          {/* Graphical Nodes & Edges Render */}
          <div className="py-12 flex flex-wrap items-center justify-around gap-6">
            {current.nodes.map(node => (
              <div
                key={node.id}
                onClick={() => setActiveNode(node)}
                className={`relative group p-4 rounded-2xl bg-white border-2 cursor-pointer transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg flex flex-col items-center text-center ${
                  activeNode?.id === node.id ? 'border-[#D4AF37] shadow-md ring-2 ring-[#D4AF37]/20' : 'border-gray-200/80'
                }`}
                style={{ width: '180px' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white mb-2 shadow-xs"
                  style={{ backgroundColor: node.color }}
                >
                  <Network className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-[#0F172A] line-clamp-1">{node.label}</span>
                <span className="text-xs font-mono font-semibold text-[#D4AF37] mt-1">{node.btc}</span>
                <span className="text-[10px] uppercase font-mono text-[#64748B] mt-0.5">{node.type}</span>
              </div>
            ))}
          </div>

          {/* Transfers Summary Bar */}
          <div className="bg-white/90 backdrop-blur-md border border-gray-200/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 z-10">
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <Info className="w-4 h-4 text-[#D4AF37]" />
              <span>Click any cluster node to inspect cryptographic proofs and UTXO breakdown.</span>
            </div>

            <button
              onClick={onOpenFullExplorer}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37] hover:text-[#c58528] transition-colors cursor-pointer"
            >
              <span>Open in Full Graph Workstation</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
