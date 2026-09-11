import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ title, value, change, changeType, icon, className }: StatCardProps) {
  return (
    <div className={cn('bg-white rounded-xl border p-6', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {typeof value === 'number' ? formatNumber(value) : value}
          </p>
          {change && (
            <p className={cn('mt-1 text-sm font-medium', {
              'text-green-600': changeType === 'positive',
              'text-red-600': changeType === 'negative',
              'text-gray-500': changeType === 'neutral',
            })}>
              {change}
            </p>
          )}
        </div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
    </div>
  );
}