import { Hexagon } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-gray-200/80 bg-white py-12 px-6 lg:px-8 select-none">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Left: Logo & Tagline */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <Hexagon
              className="w-7 h-7 text-[#D4AF37]"
              strokeWidth={2}
              fill="rgba(212, 175, 55, 0.2)"
            />
            <span className="absolute text-[9px] font-bold text-[#D4AF37] font-mono">₿</span>
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-wide text-[#0F172A]">
              COINWISE <span className="text-xs font-semibold text-[#D4AF37] uppercase tracking-widest ml-1 font-mono">FORENSICS</span>
            </span>
            <p className="text-xs text-[#64748B]">Autonomous Bitcoin Forensic Intelligence Workspace</p>
          </div>
        </div>

        {/* Center: Offline Linux Badge */}
        <div className="flex items-center gap-2 text-xs font-mono text-[#64748B] px-3.5 py-1.5 rounded-full bg-[#FAFAFA] border border-gray-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>OFFLINE LINUX BACKEND • SECURE LOCAL ENGINE</span>
        </div>

        {/* Right: Copyright */}
        <div className="text-xs text-[#64748B] text-center md:text-right">
          <div>© 2026 Coinwise Forensics System. All rights reserved.</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Designed for Federal Cybercrime & Forensic Intelligence Operations</div>
        </div>
      </div>
    </footer>
  );
}
