import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div
        className={cn(
          'transition-all duration-300',
          collapsed ? 'ml-[72px]' : 'ml-[260px]'
        )}
      >
        <Header />
        <main className="p-6 min-h-[calc(100vh-64px)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
