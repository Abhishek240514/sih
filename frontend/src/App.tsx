import { Routes, Route } from 'react-router-dom';
import { DatasetProvider } from './context/DatasetContext';

// SOC Workstation Layout & Pages
import { Sidebar } from './components/layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import Investigation from './pages/Investigation';
import GraphExplorer from './pages/GraphExplorer';
import Datasets from './pages/Datasets';
import MLModels from './pages/MLModels';
import Entities from './pages/Entities';

function SOCWorkstation() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      {/* Scan line at top */}
      <div className="scan-line" />

      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div
        style={{
          marginLeft: 240,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: '100vh',
        }}
      >
        {/* Top status bar */}
        <header className="soc-topbar" style={{ zIndex: 30 }}>
          <div className="flex items-center gap-4">
            {/* Live indicator */}
            <div className="flex items-center gap-2">
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#10d98a',
                  boxShadow: '0 0 8px rgba(16, 217, 138, 0.8)',
                  display: 'inline-block',
                  animation: 'pulse-glow 2s ease-in-out infinite',
                }}
              />
              <span style={{ color: '#10d98a', fontWeight: 700, fontSize: 10.5, letterSpacing: '0.08em' }}>
                LIVE
              </span>
            </div>
            <span style={{ color: 'var(--border-hover)', fontSize: 11, letterSpacing: '0.06em' }}>
              BITCOIN FORENSIC INTELLIGENCE SYSTEM · OFFLINE MODE
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{dateStr}</span>
              <span
                className="tabular-nums"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--accent-cyan)', fontSize: 12 }}
              >
                {timeStr}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main
          className="flex-1 grid-bg"
          style={{ padding: '28px 32px', overflowY: 'auto', overflowX: 'hidden' }}
        >
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
  return (
    <DatasetProvider>
      <SOCWorkstation />
    </DatasetProvider>
  );
}