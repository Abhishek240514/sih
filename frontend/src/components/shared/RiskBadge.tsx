import { cn, getRiskBgColor } from '@/lib/utils';
import type { RiskLevel } from '@/lib/types';

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
        getRiskBgColor(level),
        className
      )}
    >
      {level}
    </span>
  );
}
