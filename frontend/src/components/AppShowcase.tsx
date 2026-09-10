import { Shield, FileCheck2, Printer } from 'lucide-react';
import { toast } from 'sonner';

export function AppShowcase() {
  const handleExportMock = () => {
    toast.success('Dispatched Court-Admissible Dossier PDF to print preview');
  };

  return (
    <section className="py-20 max-w-7xl mx-auto px-6 lg:px-8">
      <div className="relative bg-[#0F172A] text-white rounded-3xl p-8 sm:p-14 lg:p-16 overflow-hidden shadow-2xl">
        {/* Gold glow accent in background */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[#D4AF37] text-xs font-semibold uppercase tracking-wider">
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Evidentiary Export Engine</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              One-Click Court Dossiers & FinCEN SAR Exports
            </h2>

            <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
              Transform complex transaction graphs into clear, judge-ready affidavits. Automatically attach timestamped UTXO lineages, cluster identity confidence ratings, and cryptographic hash verification seals.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-200">
                <div className="w-5 h-5 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#0F172A] shrink-0 font-bold">
                  ✓
                </div>
                <span>Title 18 § 981 Civil Forfeiture Complaint Packages</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-200">
                <div className="w-5 h-5 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#0F172A] shrink-0 font-bold">
                  ✓
                </div>
                <span>Cryptographic SHA-256 Chain-of-Custody Signatures</span>
              </div>
              <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-200">
                <div className="w-5 h-5 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#0F172A] shrink-0 font-bold">
                  ✓
                </div>
                <span>FinCEN Form 111 XML Suspicious Activity Filing</span>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={handleExportMock}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full text-xs font-semibold text-[#0F172A] bg-gradient-to-r from-[#D4AF37] to-[#c58528] hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Export Formal Dossier PDF</span>
              </button>
            </div>
          </div>

          {/* Right Document Mockup */}
          <div className="lg:col-span-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 space-y-4 font-mono text-xs text-gray-300 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 text-[11px] text-gray-400">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#D4AF37]" />
                <span className="font-bold text-white">FORENSIC DOSSIER PREVIEW</span>
              </div>
              <span className="text-[#D4AF37] font-bold">VERIFIED SEAL</span>
            </div>

            <div className="space-y-2 text-[11px] leading-relaxed">
              <div className="text-gray-400">CASE DOCKET: CASE-2024-DARKSIDE</div>
              <div className="text-white font-semibold font-sans text-sm">
                In re: Seizure of 63.70000000 Bitcoin from Suspect Extortion Cluster
              </div>
              <div className="p-3 bg-black/40 rounded border border-white/10 text-gray-300 text-[10px] space-y-1">
                <div>TARGET SEED: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa</div>
                <div>TERMINAL VASP: Garantex Europe (Sanctioned SDN)</div>
                <div>PEEL DEPTH: 14 Consecutive 1-in-2-out Layering Outputs</div>
                <div>DIGITAL CHECKSUM: 8a24c57f9208a0d24e65b40cfb65bdf35a3962b80459a9307d...</div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-gray-400">
              <span>Status: Court-Admissible Exhibit 4A</span>
              <span className="text-emerald-400 font-semibold">100% Validated</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
