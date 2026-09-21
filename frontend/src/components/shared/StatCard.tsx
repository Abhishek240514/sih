import type { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; positive: boolean };
  className?: string;
  iconColor?: string;
  iconBg?: string;
  accentColor?: string;
}

export function StatCard({
  icon,
  label,
  value,
  subtitle,
  trend,
  className,
  iconBg = 'rgba(59, 124, 249, 0.12)',
  accentColor = '#3b7cf9',
}: StatCardProps) {
  return (
    <div
      className={`glass-card animate-fade-in ${className || ''}`}
      style={{
        padding: '18px 20px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Subtle top accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
          opacity: 0.4,
        }}
      />

      <div className="flex items-start justify-between">
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 8,
            }}
          >
            {label}
          </p>
          <p
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
            className="tabular-nums"
          >
            {value}
          </p>
          {subtitle && (
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 5 }}>
              {subtitle}
            </p>
          )}
          {trend && (
            <div
              className="flex items-center gap-1"
              style={{
                marginTop: 5,
                fontSize: 11.5,
                fontWeight: 600,
                color: trend.positive ? '#10d98a' : '#ff3d55',
              }}
            >
              <span>{trend.positive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-center rounded-xl shrink-0"
          style={{
            width: 40,
            height: 40,
            background: iconBg,
            color: accentColor,
            marginLeft: 12,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
