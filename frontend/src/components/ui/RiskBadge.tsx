import { cn } from '@/lib/utils';

interface RiskBadgeProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function RiskBadge({ level, size = 'md', showIcon = true }: RiskBadgeProps) {
  const baseStyles = 'inline-flex items-center gap-1 font-medium rounded-full border';
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  const icons = {
    LOW: '🟢',
    MEDIUM: '🟡',
    HIGH: '🟠',
    CRITICAL: '🔴',
  };

  const colors = {
    LOW: 'bg-green-100 text-green-800 border-green-200',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
    CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <span className={cn(baseStyles, sizeStyles[size], colors[level])}>
      {showIcon && <span>{icons[level]}</span>}
      {level}
    </span>
  );
}