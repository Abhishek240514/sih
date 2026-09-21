import { NavLink } from 'react-router-dom';
import { useDataset } from '../../context/DatasetContext';

const navItems = [
  {
    path: '/',
    label: 'Dashboard',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    path: '/alerts',
    label: 'Alerts',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  {
    path: '/entities',
    label: 'Entities',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    path: '/graph',
    label: 'Graph',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
    ),
  },
  {
    path: '/investigations',
    label: 'Investigations',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
    ),
  },
  {
    path: '/datasets',
    label: 'Datasets',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M3 5V19A9 3 0 0 0 21 19V5"/>
        <path d="M3 12A9 3 0 0 0 21 12"/>
      </svg>
    ),
  },
  {
    path: '/ml',
    label: 'ML Models',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/>
        <path d="M9 17v1a3 3 0 0 0 6 0v-1"/>
      </svg>
    ),
  },
] as const;

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { activeDatasetId } = useDataset();

  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col z-40 transition-all duration-300"
      style={{
        width: collapsed ? '72px' : '240px',
        background: 'rgba(9, 15, 29, 0.97)',
        borderRight: '1px solid rgba(99, 155, 255, 0.08)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(99, 155, 255, 0.08)' }}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div
            className="flex items-center justify-center shrink-0 rounded-xl"
            style={{
              width: 38, height: 38,
              background: 'linear-gradient(135deg, #3b7cf9 0%, #9b5cf6 100%)',
              boxShadow: '0 4px 14px rgba(59, 124, 249, 0.4)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M11.5 2.5c4.69 0 8.5 3.81 8.5 8.5s-3.81 8.5-8.5 8.5S3 15.69 3 11s3.81-8.5 8.5-8.5zm.5 3v1.5l1 .25c.66.16 1 .69 1 1.25 0 .56-.34 1.09-1 1.25V11h1c.55 0 1 .45 1 1s-.45 1-1 1h-1v1.5h-1V13H11c-.55 0-1-.45-1-1s.45-1 1-1h.5V9.25C11.16 9.09 11 8.81 11 8.5c0-.31.16-.59.5-.75V5.5z"/>
            </svg>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                BTC Forensics
              </p>
              <p style={{ fontSize: 10.5, color: 'var(--text-muted)', letterSpacing: '0.06em', marginTop: 2 }}>
                INTELLIGENCE SYSTEM
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Live Status */}
      {!collapsed && (
        <div style={{ padding: '10px 16px 8px' }}>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ background: 'rgba(16, 217, 138, 0.06)', border: '1px solid rgba(16, 217, 138, 0.12)' }}
          >
            <span className="status-dot online" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: 'rgba(16, 217, 138, 0.9)', fontWeight: 600, letterSpacing: '0.06em' }}>
              SOC WORKSTATION ACTIVE
            </span>
          </div>
        </div>
      )}

      {/* Nav Label */}
      {!collapsed && (
        <p style={{ padding: '12px 16px 4px', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Navigation
        </p>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '4px 10px', overflowY: 'auto' }} className="hide-scrollbar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `sidebar-nav-item${isActive ? ' active' : ''}`
              }
              style={collapsed ? { justifyContent: 'center', padding: '10px 0' } : {}}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Dataset Panel */}
      {!collapsed && (
        <div style={{ padding: '10px 10px 16px', borderTop: '1px solid rgba(99, 155, 255, 0.08)' }}>
          <div
            className="rounded-xl p-3"
            style={{ background: 'rgba(99, 155, 255, 0.04)', border: '1px solid rgba(99, 155, 255, 0.08)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M3 5V19A9 3 0 0 0 21 19V5"/>
                <path d="M3 12A9 3 0 0 0 21 12"/>
              </svg>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Active Dataset</p>
            </div>
            {activeDatasetId ? (
              <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--accent-cyan)', wordBreak: 'break-all', lineHeight: 1.4 }}>
                {activeDatasetId.slice(0, 22)}...
              </p>
            ) : (
              <div className="flex items-center justify-between">
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>None selected</p>
                <NavLink
                  to="/datasets"
                  style={{ fontSize: 11, color: 'var(--accent-blue)', fontWeight: 600 }}
                >
                  Select →
                </NavLink>
              </div>
            )}
          </div>

          <p style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--text-muted)', marginTop: 12, letterSpacing: '0.03em' }}>
            v1.0 · Offline Mode
          </p>
        </div>
      )}

      {/* Collapsed dataset indicator */}
      {collapsed && activeDatasetId && (
        <div style={{ padding: '10px 0 16px', display: 'flex', justifyContent: 'center' }}>
          <div className="status-dot online" title="Dataset active" />
        </div>
      )}
    </aside>
  );
}