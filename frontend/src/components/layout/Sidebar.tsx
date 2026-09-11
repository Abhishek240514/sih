import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useDataset } from '../../context/DatasetContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/alerts', label: 'Alerts', icon: '🚨' },
  { path: '/entities', label: 'Entities', icon: '👤' },
  { path: '/graph', label: 'Graph', icon: '🕸️' },
  { path: '/investigations', label: 'Investigations', icon: '🔍' },
  { path: '/datasets', label: 'Datasets', icon: '📁' },
  { path: '/ml', label: 'ML Models', icon: '🤖' },
] as const;

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { activeDatasetId } = useDataset();

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-slate-900 border-r border-slate-800 flex flex-col z-40 transition-all duration-300",
      collapsed ? "w-[72px]" : "w-64"
    )}>
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white flex items-center gap-2 overflow-hidden">
          <span className="text-2xl">₿</span>
          {!collapsed && <span>BTC Forensics</span>}
        </h1>
        {!collapsed && <p className="text-xs text-gray-500">v1.0.0</p>}
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            )}
          >
            <span className="text-lg">{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {!collapsed && (
        <div className="p-3 border-t border-slate-800">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-2">Active Dataset</p>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm truncate max-w-[200px] text-white">
                {activeDatasetId ? activeDatasetId.slice(0, 20) + '...' : 'None selected'}
              </span>
              <NavLink to="/datasets" className="text-xs text-primary hover:underline">
                Change
              </NavLink>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800">
            <p className="text-xs text-slate-500 text-center">
              Bitcoin Forensic Intelligence System
              <br />
              Offline Analysis Platform
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}