import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { DatasetProvider } from './context/DatasetContext';

// Coinwise-Styled Forensic Landing Components
import { Hero } from './components/Hero';
import { LiveMarketTicker } from './components/LiveMarketTicker';
import { ServicesSection } from './components/ServicesSection';
import { StakingCalculator } from './components/StakingCalculator';
import { InteractiveGraphSection } from './components/InteractiveGraphSection';
import { MarketsSection } from './components/MarketsSection';
import { SecurityCertifications } from './components/SecurityCertifications';
import { PricingSection } from './components/PricingSection';
import { AppShowcase } from './components/AppShowcase';
import { Footer } from './components/Footer';
import { GetStartedModal } from './components/GetStartedModal';

// Dedicated SOC Workstation Layout & Pages
import { Sidebar } from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import Investigation from './pages/Investigation';
import GraphExplorer from './pages/GraphExplorer';
import Datasets from './pages/Datasets';
import MLModels from './pages/MLModels';
import Entities from './pages/Entities';

function ExecutivePortalView({
  onOpenModal,
  onOpenWorkstation,
}: {
  onOpenModal: () => void;
  onOpenWorkstation: () => void;
}) {
  const handleScrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0F172A] font-sans selection:bg-[#D4AF37]/20 selection:text-[#0F172A]">
      {/* 1. Coinwise Hero with Motion Video Loop & GSAP Entrance */}
      <Hero
        onOpenWorkstation={onOpenModal}
        onExploreGraph={() => handleScrollToSection('graph-canvas')}
        onIngestDataset={onOpenModal}
      />

      {/* 2. Live Bitcoin Forensic Telemetry Ticker */}
      <LiveMarketTicker onSelectMetric={() => handleScrollToSection('triage')} />

      {/* 3. Core Forensic Intelligence Pillars */}
      <ServicesSection onLearnMore={() => handleScrollToSection('risk-engine')} />

      {/* 4. Interactive Hybrid Risk & ML Anomaly Simulator */}
      <StakingCalculator onStartInvestigation={onOpenModal} />

      {/* 5. Embedded Cytoscape.js Transaction Network Canvas */}
      <InteractiveGraphSection onOpenFullExplorer={onOpenWorkstation} />

      {/* 6. Live Ranked Threat Surveillance Triage Table */}
      <MarketsSection
        onInspectGraph={() => handleScrollToSection('graph-canvas')}
      />

      {/* 7. Evidentiary Standards & Legal Compliance Badges */}
      <SecurityCertifications />

      {/* 8. Active Cybercrime Investigation Dockets */}
      <PricingSection onSelectTier={onOpenModal} />

      {/* 9. Judicial Affidavits & FinCEN SAR Export Suite */}
      <AppShowcase />

      {/* 10. Institutional Forensic Footer */}
      <Footer />
    </div>
  );
}

function SOCWorkstationRoutes({ onReturnToPortal }: { onReturnToPortal: () => void }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 ml-64">
        {/* Top bar with return button */}
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-2.5 flex items-center justify-between z-30">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono font-bold text-slate-200">
              SOC WORKSTATION MODE • LOCAL ANALYSIS ACTIVE
            </span>
          </div>
          <button
            onClick={onReturnToPortal}
            className="text-xs font-semibold px-4 py-1.5 rounded-full bg-amber-50 text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#D4AF37] hover:text-white transition-all cursor-pointer"
          >
            ← Return to Coinwise Forensics Portal
          </button>
        </div>

        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/investigations" element={<Investigation />} />
            <Route path="/investigations/:entityId" element={<Investigation />} />
            <Route path="/graph" element={<GraphExplorer />} />
            <Route path="/datasets" element={<Datasets />} />
            <Route path="/ml" element={<MLModels />} />
            <Route path="/entities" element={<Entities />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [isWorkstationMode, setIsWorkstationMode] = useState(false);

  return (
    <DatasetProvider>
      {isWorkstationMode ? (
        <SOCWorkstationRoutes onReturnToPortal={() => setIsWorkstationMode(false)} />
      ) : (
        <ExecutivePortalView
          onOpenModal={() => setModalOpen(true)}
          onOpenWorkstation={() => setIsWorkstationMode(true)}
        />
      )}

      {/* Quick Ingest & Lead Initiation Modal */}
      <GetStartedModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onLaunchWorkspace={() => setIsWorkstationMode(true)}
      />
    </DatasetProvider>
  );
}