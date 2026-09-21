import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${className || ''}`}
      style={{ padding: '64px 24px' }}
    >
      <div
        className="flex items-center justify-center rounded-2xl mb-5"
        style={{
          width: 72,
          height: 72,
          background: 'rgba(99, 155, 255, 0.06)',
          border: '1px solid rgba(99, 155, 255, 0.12)',
          color: 'var(--text-muted)',
        }}
      >
        {icon}
      </div>
      <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.01em' }}>
        {title}
      </h3>
      <p style={{ fontSize: 13.5, color: 'var(--text-muted)', maxWidth: 380, lineHeight: 1.6, marginBottom: action ? 20 : 0 }}>
        {description}
      </p>
      {action}
    </div>
  );
}
