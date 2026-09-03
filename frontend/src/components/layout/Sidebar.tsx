import { NavLink, useLocation } from 'react-router-dom';
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

export function Sidebar() {
  const location = useLocation();
  const { datasetId } = useDataset();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col z-40">
      <div className="p-4 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-2xl">₿</span>
          <span>BTC Forensics</span>
        </h1>
        <p className="text-xs text-gray-500 mt-1">v1.0.0</p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-200">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-2">Active Dataset</p>
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm truncate max-w-[200px] text-gray-900">
              {datasetId ? datasetId.slice(0, 20) + '...' : 'None selected'}
            </span>
            <NavLink to="/datasets" className="text-xs text-primary hover:underline">
              Change
            </NavLink>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Bitcoin Forensic Intelligence System
            <br />
            Offline Analysis Platform
          </p>
        </div>
      </div>
    </aside>
  );
}