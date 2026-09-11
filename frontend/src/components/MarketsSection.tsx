import { useState, useRef, useEffect } from 'react';
import { Search, ShieldAlert, ArrowUpRight, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { initScrollReveal } from '@/lib/animation';

interface MarketsSectionProps {
  onInspectGraph?: () => void;
}

export function MarketsSection({ onInspectGraph }: MarketsSectionProps) {
  const containerRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<'all' | 'ransomware' | 'mixers' | 'peel' | 'sanctions'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  useEffect(() => {
    if (cardRef.current) {
      initScrollReveal(cardRef.current, undefined, { y: 24, duration: 0.6 });
    }
  }, []);

  const leads = [
    {
      id: 'L-101',
      name: 'DarkSide Colonial Payout',
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      category: 'Ransomware Extortion',
      type: 'ransomware',
      btc: '75.00 BTC',
      usd: '$4,821,000',
      trigger: 'Automated 1-in-2-out Peel Chain',
      riskScore: 98.4,
      riskLevel: 'CRITICAL',
    },
    {
      id: 'L-102',
      name: 'ChipMixer High-Velocity Pool',
      address: '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo',
      category: 'Mixers & Tumblers',
      type: 'mixers',
      btc: '142.45 BTC',
      usd: '$9,156,686',
      trigger: 'Wasabi ZeroLink Multi-Denomination',
      riskScore: 94.1,
      riskLevel: 'CRITICAL',
    },
    {
      id: 'L-103',
      name: 'Lazarus Group Evasion Hub',
      address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
      category: 'Sanctions Evasion',
      type: 'sanctions',
      btc: '210.80 BTC',
      usd: '$13,550,224',
      trigger: 'OFAC SDN Direct Match',
      riskScore: 99.2,
      riskLevel: 'CRITICAL',
    },
    {
      id: 'L-104',
      name: 'Hydra Darknet OTC Cashout',
      address: '1FeexV6bAHb8ybZjqQMjJrcCrHGW9sb6uF',
      category: 'Darknet Market',
      type: 'peel',
      btc: '28.37 BTC',
      usd: '$1,823,623',
      trigger: 'Rapid Multi-Hop Layering (8 Hops)',
      riskScore: 82.5,
      riskLevel: 'HIGH',
    },
    {
      id: 'L-105',
      name: 'BlackCat ALPH Ransomware Depository',
      address: 'bc1q7x412x214x419d98a0c410x992fa',
      category: 'Ransomware Extortion',
      type: 'ransomware',
      btc: '52.18 BTC',
      usd: '$3,354,130',
      trigger: 'Co-spend Address Merging with Tor Relay',
      riskScore: 96.0,
      riskLevel: 'CRITICAL',
    },
  ];

  const handleCopyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddress(addr);
    toast.success('Address copied to forensic clipboard');
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const filteredLeads = leads.filter(item => {
    const matchesTab = activeTab === 'all' || item.type === activeTab;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <section
      ref={containerRef}
      id="triage"
      className="py-20 max-w-7xl mx-auto px-6 lg:px-8 select-none"
    >
      <div
        ref={cardRef}
        className="bg-white/90 backdrop-blur-xl border border-gray-200/90 rounded-3xl p-6 sm:p-10 shadow-sm overflow-hidden"
      >
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-gray-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold uppercase tracking-wider mb-3">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Priority Triage Queue</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
              Ranked Threat Surveillance Triage
            </h2>
            <p className="text-sm text-[#64748B] mt-1">
              Autonomous prioritization of incoming transaction clusters ranked by statistical anomaly entropy and OFAC matches.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search entity, hash, or category..."
              className="w-full pl-9 pr-4 py-2 rounded-full bg-[#FAFAFA] border border-gray-200 text-xs text-[#0F172A] placeholder:text-gray-400 focus:outline-none focus:border-[#D4AF37] transition-all"
            />
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-2 my-6">
          {[
            { id: 'all', label: 'All Active Threats', count: leads.length },
            { id: 'ransomware', label: 'Ransomware Extortion', count: 2 },
            { id: 'mixers', label: 'Mixers & Tumblers', count: 1 },
            { id: 'peel', label: 'Active Peel Chains', count: 1 },
            { id: 'sanctions', label: 'Sanctions Evasion', count: 1 },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'bg-gray-100 text-[#64748B] hover:bg-gray-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-full ${
                activeTab === tab.id ? 'bg-gray-800 text-gray-200' : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto border border-gray-200/80 rounded-2xl bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAFAFA] border-b border-gray-200 text-[#64748B] font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-5">Suspect Entity & Seed Address</th>
                <th className="py-3.5 px-5">Typology Category</th>
                <th className="py-3.5 px-5 text-right">Flagged Volume</th>
                <th className="py-3.5 px-5">Primary Detection Heuristic</th>
                <th className="py-3.5 px-5 text-center">Risk Score</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLeads.map(lead => (
                <tr key={lead.id} className="hover:bg-amber-50/20 transition-colors group">
                  <td className="py-4 px-5">
                    <div className="font-bold text-[#0F172A] group-hover:text-[#D4AF37] transition-colors">
                      {lead.name}
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#64748B] mt-0.5">
                      <span>{lead.address.slice(0, 10)}...{lead.address.slice(-8)}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyAddress(lead.address)}
                        className="text-gray-400 hover:text-[#D4AF37] transition-colors p-0.5 cursor-pointer"
                        title="Copy address"
                      >
                        {copiedAddress === lead.address ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>

                  <td className="py-4 px-5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-gray-100 text-[#0F172A] border border-gray-200">
                      {lead.category}
                    </span>
                  </td>

                  <td className="py-4 px-5 text-right font-mono tabular-nums">
                    <div className="font-bold text-[#0F172A]">{lead.btc}</div>
                    <div className="text-[11px] text-[#64748B]">{lead.usd}</div>
                  </td>

                  <td className="py-4 px-5 text-[#64748B] font-medium">
                    {lead.trigger}
                  </td>

                  <td className="py-4 px-5 text-center">
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums font-bold text-xs px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      <span>{lead.riskScore}</span>
                    </span>
                  </td>

                  <td className="py-4 px-5 text-right">
                    <button
                      type="button"
                      onClick={onInspectGraph}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-[#0F172A] bg-gray-100 hover:bg-[#D4AF37] hover:text-white transition-all cursor-pointer"
                    >
                      <span>Inspect Graph</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
