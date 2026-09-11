import { useRef, useEffect } from 'react';
import { ShieldCheck, Scale, FileText, Lock } from 'lucide-react';
import { initScrollReveal, initScrollCascade } from '@/lib/animation';

export function SecurityCertifications() {
  const containerRef = useRef<HTMLElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (boxRef.current) {
      initScrollReveal(boxRef.current, undefined, { y: 20, duration: 0.6 });
    }
    initScrollCascade(containerRef.current, '.gsap-cert-card', 0.08);
  }, []);

  const credentials = [
    {
      icon: Scale,
      title: 'Title 18 U.S.C. § 981',
      subtitle: 'Civil Forfeiture Standards',
      desc: 'Generates court-admissible seizure accounting ready for grand jury presentations and judicial asset forfeiture filings.',
    },
    {
      icon: Lock,
      title: 'SHA-256 Chain of Custody',
      subtitle: 'Cryptographic Proof Hashing',
      desc: 'Immutable evidence ledger hashing every query, UTXO observation, and memo into a verifiable self-authenticating audit trail.',
    },
    {
      icon: FileText,
      title: 'FinCEN SAR Form 111',
      subtitle: 'BSA XML Schema E-Filing',
      desc: 'Pre-formatted suspicious activity report schemas compatible with FinCEN BSA E-Filing and global financial intelligence units.',
    },
    {
      icon: ShieldCheck,
      title: 'Air-Gapped & Offline',
      subtitle: 'Zero Cloud Telemetry Leakage',
      desc: 'Operates 100% locally on sovereign Linux workstations to preserve strict operational security and target confidentiality.',
    },
  ];

  return (
    <section ref={containerRef} className="py-16 max-w-7xl mx-auto px-6 lg:px-8 select-none">
      <div ref={boxRef} className="bg-[#FAFAFA] border border-gray-200/80 rounded-3xl p-8 sm:p-12">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold uppercase tracking-wider mb-3">
            <span>Evidentiary Compliance</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-[#0F172A] tracking-tight">
            Architected for Judicial Scrutiny & Regulatory Rigor
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {credentials.map((cred, idx) => {
            const Icon = cred.icon;
            return (
              <div
                key={idx}
                className="gsap-cert-card bg-white border border-gray-200/80 rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-[#D4AF37]/40 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-sm font-bold text-[#0F172A]">{cred.title}</div>
                <div className="text-xs font-semibold text-[#D4AF37] font-mono mt-0.5">{cred.subtitle}</div>
                <p className="text-xs text-[#64748B] leading-relaxed mt-2.5">{cred.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
