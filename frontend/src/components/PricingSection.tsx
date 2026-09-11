import { useState, useRef, useEffect } from 'react';
import { FolderOpen, ArrowRight, CheckCircle2, Award } from 'lucide-react';
import { initScrollReveal, initScrollCascade, tweenNumber, ScrollTrigger } from '@/lib/animation';

interface PricingSectionProps {
  onSelectTier?: () => void;
}

function SeizureRecoveryMeter({
  targetRate,
  seizedBtc,
  targetBtc,
}: {
  targetRate: number;
  seizedBtc: string;
  targetBtc: string;
}) {
  const [animatedRate, setAnimatedRate] = useState(0);
  const meterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!meterRef.current) return;
    const trigger = ScrollTrigger.create({
      trigger: meterRef.current,
      start: 'top 85%',
      onEnter: () => {
        tweenNumber(0, targetRate, 1.1, (val) => setAnimatedRate(val));
      },
      once: true,
    });
    return () => trigger.kill();
  }, [targetRate]);

  return (
    <div ref={meterRef} className="p-4 rounded-2xl bg-[#FAFAFA] border border-gray-200/80 mb-6 space-y-2.5">
      <div className="flex justify-between items-baseline text-xs">
        <span className="text-[#64748B] font-medium">Seizure Recovery Rate</span>
        <span className="font-mono tabular-nums font-bold text-[#0F172A]">{animatedRate.toFixed(1)}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#D4AF37] to-emerald-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${animatedRate}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] font-mono tabular-nums text-[#64748B]">
        <span>
          Seized: <strong className="text-emerald-700">{seizedBtc}</strong>
        </span>
        <span>Target: {targetBtc}</span>
      </div>
    </div>
  );
}

export function PricingSection({ onSelectTier }: PricingSectionProps) {
  const containerRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (headerRef.current) {
      initScrollReveal(headerRef.current, undefined, { y: 20, duration: 0.6 });
    }
    initScrollCascade(containerRef.current, '.gsap-docket-card', 0.1);
  }, []);

  const cases = [
    {
      docket: 'CASE-2024-DARKSIDE',
      title: 'Colonial Pipeline Extortion',
      subtitle: 'Critical Infrastructure Ransomware Attack',
      status: 'COURT-READY DOSSIER',
      statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      targetBtc: '75.00 BTC',
      seizedBtc: '63.70 BTC',
      recoveryRate: 84.9,
      evidenceCount: 18,
      leadInvestigator: 'SA Marcus Sterling (FBI Cyber)',
      agency: 'DOJ Ransomware & Digital Extortion Task Force',
      featured: true,
      deliverables: [
        'Peel Chain 1-in-2-out Disambiguation Map',
        'Title 18 § 981 Civil Forfeiture Affidavit',
        'USMS Digital Currency Escrow Transfer Receipt',
        'Tor Relay Broadcast Latency Correlation',
      ],
    },
    {
      docket: 'CASE-2024-CHIPMIX',
      title: 'ChipMixer Obfuscation Syndicate',
      subtitle: 'High-Volume Tumbler Deanonymization',
      status: 'ACTIVE TRACE',
      statusColor: 'bg-amber-50 text-amber-700 border-amber-200',
      targetBtc: '142.45 BTC',
      seizedBtc: '48.20 BTC',
      recoveryRate: 33.8,
      evidenceCount: 34,
      leadInvestigator: 'Analyst Emily Chen (IRS-CI)',
      agency: 'IRS Criminal Investigation Special Agent',
      featured: false,
      deliverables: [
        'Fixed-Denomination Output Unpacking',
        'Co-Spend Input Clustering Matrix',
        'VASP Subpoena Response Synthesis',
        'FinCEN SAR XML Evidentiary File',
      ],
    },
    {
      docket: 'CASE-2024-HYDRA',
      title: 'Hydra Darknet Marketplace OTC',
      subtitle: 'Eastern European Narcotics & Laundering Hub',
      status: 'SANCTION ESCALATED',
      statusColor: 'bg-rose-50 text-rose-700 border-rose-200',
      targetBtc: '450.20 BTC',
      seizedBtc: '210.50 BTC',
      recoveryRate: 46.8,
      evidenceCount: 42,
      leadInvestigator: 'Det. Klaus Richter (BKA / Europol)',
      agency: 'Bundeskriminalamt Cybercrime Directorate',
      featured: false,
      deliverables: [
        'Vendor Multi-Sig Cold Vault Attribution',
        'OFAC Specially Designated Nationals Mapping',
        'Peer OTC Broker Counterparty Ledger',
        'Interpol Red Notice Supporting Exhibit',
      ],
    },
  ];

  return (
    <section
      ref={containerRef}
      id="dockets"
      className="py-20 max-w-7xl mx-auto px-6 lg:px-8 select-none"
    >
      {/* Section Header */}
      <div ref={headerRef} className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold uppercase tracking-wider mb-4">
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Active Investigation Dockets</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-tight text-[#0F172A] leading-[1.15] mb-4">
          Institutional Forensic Case Portfolios
        </h2>
        <p className="text-base sm:text-lg text-[#64748B] leading-relaxed">
          Monitor seizure recovery progress, maintain immutable chains of custody, and assemble court-admissible dossiers under Title 18 U.S.C. standards.
        </p>
      </div>

      {/* Case Dockets Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {cases.map((c, idx) => (
          <div
            key={idx}
            className={`gsap-docket-card relative rounded-3xl p-7 flex flex-col justify-between transition-all duration-300 ${
              c.featured
                ? 'bg-white border-2 border-[#D4AF37] shadow-lg ring-4 ring-[#D4AF37]/10'
                : 'bg-white/90 border border-gray-200/90 shadow-xs hover:shadow-md hover:border-gray-300'
            }`}
          >
            {c.featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#c58528] text-white text-[11px] font-bold uppercase tracking-wider shadow-xs">
                <Award className="w-3.5 h-3.5" />
                <span>Priority Federal Benchmark</span>
              </div>
            )}

            <div>
              {/* Top Meta */}
              <div className="flex items-center justify-between gap-2 mb-4 pt-1">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-gray-100 text-[#64748B]">
                  {c.docket}
                </span>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${c.statusColor}`}>
                  {c.status}
                </span>
              </div>

              {/* Title & Agency */}
              <h3 className="text-xl font-bold text-[#0F172A] leading-snug">
                {c.title}
              </h3>
              <p className="text-xs text-[#64748B] mt-1 mb-6">
                {c.subtitle}
              </p>

              {/* Seizure Progress Meter */}
              <SeizureRecoveryMeter
                targetRate={c.recoveryRate}
                seizedBtc={c.seizedBtc}
                targetBtc={c.targetBtc}
              />

              {/* Investigator Tag */}
              <div className="mb-6 pb-6 border-b border-gray-100 text-xs">
                <div className="text-[10px] uppercase font-semibold text-[#64748B] tracking-wider mb-1">
                  Assigned Lead Investigator
                </div>
                <div className="font-semibold text-[#0F172A]">{c.leadInvestigator}</div>
                <div className="text-[11px] text-[#64748B]">{c.agency}</div>
              </div>

              {/* Evidence Binder Deliverables */}
              <div className="space-y-2.5 mb-8">
                <div className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">
                  Evidence Items Catalog ({c.evidenceCount} Verified)
                </div>
                {c.deliverables.map((d, dIdx) => (
                  <div key={dIdx} className="flex items-start text-xs text-[#0F172A] gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 mt-0.5" />
                    <span className="leading-tight">{d}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Button */}
            <button
              type="button"
              onClick={onSelectTier}
              className={`w-full py-3.5 px-4 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                c.featured
                  ? 'bg-gradient-to-r from-[#D4AF37] to-[#c58528] text-white hover:shadow-md hover:shadow-[#D4AF37]/30'
                  : 'bg-[#0F172A] text-white hover:bg-[#1E293B]'
              }`}
            >
              <span>Inspect Case Dossier</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
