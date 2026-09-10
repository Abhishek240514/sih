import { FolderOpen, ArrowRight, CheckCircle2, Award } from 'lucide-react';

interface PricingSectionProps {
  onSelectTier?: () => void;
}

export function PricingSection({ onSelectTier }: PricingSectionProps) {
  const cases = [
    {
      docket: 'CASE-2024-DARKSIDE',
      title: 'Colonial Pipeline Ransomware',
      status: 'COURT-READY DOSSIER',
      targetBtc: '75.00 BTC',
      seizedBtc: '63.70 BTC',
      recoveryRate: 84.9,
      evidenceCount: 18,
      leadInvestigator: 'SA Marcus Sterling',
      featured: true,
    },
    {
      docket: 'CASE-2024-CHIPMIX',
      title: 'ChipMixer Tumbler Pool',
      status: 'ACTIVE TRACE',
      targetBtc: '142.45 BTC',
      seizedBtc: '48.20 BTC',
      recoveryRate: 33.8,
      evidenceCount: 34,
      leadInvestigator: 'Analyst Emily Chen',
      featured: false,
    },
    {
      docket: 'CASE-2024-HYDRA',
      title: 'Hydra Darknet OTC Cashout',
      status: 'SANCTION ESCALATED',
      targetBtc: '450.20 BTC',
      seizedBtc: '210.50 BTC',
      recoveryRate: 46.8,
      evidenceCount: 42,
      leadInvestigator: 'Det. Klaus Richter',
      featured: false,
    },
  ];

  return (
    <section id="dockets" className="py-20 max-w-7xl mx-auto px-6 lg:px-8">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold uppercase tracking-wider mb-4">
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Active Case Dockets</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0F172A] mb-4">
          Real-World Forensic Case Management
        </h2>
        <p className="text-base sm:text-lg text-[#64748B] leading-relaxed">
          Track asset recovery rates, manage chain-of-custody proofs, and compile evidentiary dossiers ready for federal court filings.
        </p>
      </div>

      {/* Case Dockets Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {cases.map((c, idx) => (
          <div
            key={idx}
            className={`relative rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 ${
              c.featured
                ? 'bg-white border-2 border-[#D4AF37] shadow-2xl ring-4 ring-[#D4AF37]/10'
                : 'bg-white/80 backdrop-blur-md border border-gray-200/80 hover:shadow-xl hover:border-gray-300'
            }`}
          >
            {c.featured && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#c58528] text-white text-[11px] font-bold tracking-wider uppercase shadow-md">
                <Award className="w-3 h-3" />
                <span>Priority Docket</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-bold text-[#D4AF37]">{c.docket}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 text-[#0F172A] font-semibold">
                  {c.status}
                </span>
              </div>

              <h3 className="text-xl font-bold text-[#0F172A] mb-2">{c.title}</h3>
              <p className="text-xs text-[#64748B] mb-6">Lead Agent: {c.leadInvestigator}</p>

              {/* Asset Recovery Bar */}
              <div className="space-y-2 p-4 bg-[#FAFAFA] rounded-2xl border border-gray-200/60 mb-6">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-[#64748B]">Recovery Rate</span>
                  <span className="font-mono text-[#D4AF37]">{c.recoveryRate}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#D4AF37] to-[#c58528] rounded-full"
                    style={{ width: `${c.recoveryRate}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-[#64748B] pt-1">
                  <span>Target: {c.targetBtc}</span>
                  <span className="text-emerald-600 font-bold">Seized: {c.seizedBtc}</span>
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-2 text-xs text-[#0F172A]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>{c.evidenceCount} Verified Evidence Exhibits</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Signed SHA-256 Chain of Custody</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Affidavit & Grand Jury Exhibits Ready</span>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={onSelectTier}
                className={`w-full inline-flex items-center justify-center gap-2 py-3 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  c.featured
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#c58528] text-white hover:shadow-lg hover:shadow-[#D4AF37]/30'
                    : 'bg-gray-100 text-[#0F172A] hover:bg-[#0F172A] hover:text-white'
                }`}
              >
                <span>Open Investigation Dossier</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
