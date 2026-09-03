import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; positive: boolean };
  className?: string;
  iconColor?: string;
}

export function StatCard({ icon, label, value, subtitle, trend, className, iconColor = 'text-blue-400' }: StatCardProps) {
  return (
    <div className={cn('glass-card p-5 animate-fade-in', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className={cn('flex items-center gap-1 mt-1 text-xs font-medium', trend.positive ? 'text-emerald-400' : 'text-red-400')}>
              <span>{trend.positive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className={cn('p-2.5 rounded-lg bg-slate-800/50', iconColor)}>
          {icon}
        </div>
      </div>
    </div>
  );
}
