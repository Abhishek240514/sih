import { forwardRef, useState } from 'react';
import { Hexagon, ArrowRight, Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface HeaderProps {
  onOpenWorkstation: () => void;
  activeSection?: string;
  onNavigateSection?: (sectionId: string) => void;
}

export const Header = forwardRef<HTMLElement, HeaderProps>(function Header(
  { onOpenWorkstation, activeSection = 'overview', onNavigateSection },
  ref
) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { id: 'overview', label: 'Overview' },
    { id: 'datasets', label: 'Datasets' },
    { id: 'graph-canvas', label: 'Graph Explorer' },
    { id: 'triage', label: 'Threat Triage' },
    { id: 'risk-engine', label: 'ML Engine' },
    { id: 'dockets', label: 'Investigations' },
  ];

  const handleNavClick = (id: string) => {
    setMobileMenuOpen(false);
    if (onNavigateSection) {
      onNavigateSection(id);
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header
      ref={ref}
      className="relative z-50 w-full max-w-7xl mx-auto px-6 lg:px-8 py-6 flex items-center justify-between transition-transform"
    >
      {/* Logo */}
      <div
        onClick={() => handleNavClick('overview')}
        className="flex items-center gap-3 cursor-pointer select-none group"
      >
        <div className="relative flex items-center justify-center">
          <Hexagon
            className="w-8 h-8 text-[#D4AF37] transition-transform duration-300 group-hover:rotate-12"
            strokeWidth={2}
            fill="rgba(212, 175, 55, 0.2)"
          />
          <span className="absolute text-[10px] font-bold text-[#D4AF37] font-mono">₿</span>
        </div>
        <span className="font-extrabold text-2xl tracking-wide text-[#0F172A]">
          COINWISE <span className="text-xs font-semibold text-[#D4AF37] uppercase tracking-widest ml-1 font-mono">FORENSICS</span>
        </span>
      </div>

      {/* Desktop Navigation Links */}
      <nav className="hidden lg:flex items-center space-x-10 font-medium text-sm text-[#0F172A]/80">
        {navLinks.map(link => {
          const isActive = activeSection === link.id;
          return (
            <button
              key={link.id}
              onClick={() => handleNavClick(link.id)}
              className={`relative py-1 transition-colors hover:text-[#D4AF37] cursor-pointer ${
                isActive ? 'text-[#0F172A] font-semibold' : 'text-[#0F172A]/80'
              }`}
            >
              <span>{link.label}</span>
              {isActive && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-[2px] bg-[#D4AF37] rounded-full"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Desktop CTA Button */}
      <div className="hidden lg:flex items-center gap-4">
        <button
          onClick={onOpenWorkstation}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-[#D4AF37] to-[#c58528] hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
        >
          <span>Launch Workstation</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Hamburger Button */}
      <div className="flex lg:hidden items-center">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(prev => !prev)}
          className="p-2 rounded-lg text-[#0F172A] hover:bg-black/5 transition-colors cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 w-full bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-xl py-6 px-6 flex flex-col space-y-4 lg:hidden z-50"
          >
            {navLinks.map(link => (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className="text-left text-base font-medium text-[#0F172A] hover:text-[#D4AF37] py-2 transition-colors"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenWorkstation();
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-[#D4AF37] to-[#c58528] shadow-md shadow-[#D4AF37]/25"
              >
                <span>Launch Workstation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
});
