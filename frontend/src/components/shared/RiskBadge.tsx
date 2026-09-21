import { cn, getRiskBgColor } from '@/lib/utils';
import type { RiskLevel } from '@/lib/types';

interface RiskBadgeProps {
  level: RiskLevel | string;
  className?: string;
}

const RISK_CONFIG: Record<string, { bg: string; color: string; dot: string; border: string }> = {
  CRITICAL: {
    bg: 'rgba(255, 61, 85, 0.10)',
    color: '#ff3d55',
    dot: '#ff3d55',
    border: 'rgba(255, 61, 85, 0.25)',
  },
  HIGH: {
    bg: 'rgba(255, 140, 0, 0.10)',
    color: '#ff8c00',
    dot: '#ff8c00',
    border: 'rgba(255, 140, 0, 0.25)',
  },
  MEDIUM: {
    bg: 'rgba(251, 191, 36, 0.10)',
    color: '#fbbf24',
    dot: '#fbbf24',
    border: 'rgba(251, 191, 36, 0.25)',
  },
  LOW: {
    bg: 'rgba(16, 217, 138, 0.08)',
    color: '#10d98a',
    dot: '#10d98a',
    border: 'rgba(16, 217, 138, 0.22)',
  },
};

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const lvl = String(level || '').toUpperCase();
  const config = RISK_CONFIG[lvl] || {
    bg: 'rgba(99, 155, 255, 0.07)',
    color: 'var(--text-muted)',
    dot: 'var(--text-muted)',
    border: 'var(--border-color)',
  };

  return (
    <span
      className={cn('risk-badge', className)}
      style={{
        background: config.bg,
        color: config.color,
        borderColor: config.border,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: config.color,
          display: 'inline-block',
          flexShrink: 0,
          boxShadow: `0 0 6px ${config.color}`,
        }}
      />
      {level}
    </span>
  );
}
