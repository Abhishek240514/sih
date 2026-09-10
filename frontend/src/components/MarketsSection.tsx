import { useState } from 'react';
import { Search, ShieldAlert, ArrowUpRight } from 'lucide-react';

interface MarketsSectionProps {
  onInspectGraph?: () => void;
}

export function MarketsSection({ onInspectGraph }: MarketsSectionProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'ransomware' | 'mixers' | 'peel' | 'sanctions'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
      name: 'BlackCat ALPH Ransom Split',
      address: '3D2oetANDV7BsGaFvTnhHMoa9L3bSoxH6C',
      category: 'Ransomware Extortion',
      type: 'ransomware',
      btc: '42.10 BTC',
      usd: '$2,706,188',
      trigger: 'Co-spend Input Clustering Heuristic',
      riskScore: 88.0,
      riskLevel: 'HIGH',
    },
  ];

  const filteredLeads = leads.filter(lead => {
    const matchesTab = activeTab === 'all' || lead.type === activeTab;
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.trigger.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <section id="triage" className="py-20 max-w-7xl mx-auto px-6 lg:px-8">
      <div className="bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-3xl p-6 sm:p-10 shadow-xl overflow-hidden">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold uppercase tracking-wider mb-3">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Ranked Threat Surveillance Triage</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Priority Investigative Leads
            </h2>
            <p className="text-sm text-[#64748B] mt-1">
              Top-ranked anomaly clusters prioritized by statistical outlier confidence and heuristic scoring.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search address, TXID, cluster..."
              className="w-full bg-[#FAFAFA] border border-gray-200 rounded-full pl-10 pr-4 py-2 text-xs text-[#0F172A] placeholder-gray-400 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-6 pb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#c58528] text-white shadow-xs'
                : 'bg-gray-100 text-[#64748B] hover:bg-gray-200'
            }`}
          >
            All Threats
          </button>
          <button
            onClick={() => setActiveTab('ransomware')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'ransomware'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#c58528] text-white shadow-xs'
                : 'bg-gray-100 text-[#64748B] hover:bg-gray-200'
            }`}
          >
            Ransomware Extortion
          </button>
          <button
            onClick={() => setActiveTab('mixers')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'mixers'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#c58528] text-white shadow-xs'
                : 'bg-gray-100 text-[#64748B] hover:bg-gray-200'
            }`}
          >
            Mixers & Tumblers
          </button>
          <button
            onClick={() => setActiveTab('peel')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'peel'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#c58528] text-white shadow-xs'
                : 'bg-gray-100 text-[#64748B] hover:bg-gray-200'
            }`}
          >
            Active Peel Chains
          </button>
          <button
            onClick={() => setActiveTab('sanctions')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'sanctions'
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#c58528] text-white shadow-xs'
                : 'bg-gray-100 text-[#64748B] hover:bg-gray-200'
            }`}
          >
            Sanctions Evasion
          </button>
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
                    <div className="font-mono text-[11px] text-[#64748B] mt-0.5">
                      {lead.address.slice(0, 10)}...{lead.address.slice(-8)}
                    </div>
                  </td>

                  <td className="py-4 px-5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-gray-100 text-[#0F172A] border border-gray-200">
                      {lead.category}
                    </span>
                  </td>

                  <td className="py-4 px-5 text-right font-mono">
                    <div className="font-bold text-[#0F172A]">{lead.btc}</div>
                    <div className="text-[11px] text-[#64748B]">{lead.usd}</div>
                  </td>

                  <td className="py-4 px-5 text-[#64748B] font-medium">
                    {lead.trigger}
                  </td>

                  <td className="py-4 px-5 text-center">
                    <span className="inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
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
