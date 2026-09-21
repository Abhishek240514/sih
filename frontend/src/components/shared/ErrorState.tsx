import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ message = 'Something went wrong', onRetry, className }: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${className || ''}`}
      style={{ padding: '48px 24px' }}
    >
      <div
        className="flex items-center justify-center rounded-2xl mb-4"
        style={{
          width: 60,
          height: 60,
          background: 'rgba(255, 61, 85, 0.08)',
          border: '1px solid rgba(255, 61, 85, 0.18)',
        }}
      >
        <AlertTriangle style={{ width: 26, height: 26, color: '#ff3d55' }} />
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
        Failed to Load
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 340, lineHeight: 1.6, marginBottom: onRetry ? 20 : 0 }}>
        {message}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary" style={{ fontSize: 13 }}>
          <RefreshCw style={{ width: 14, height: 14 }} />
          Retry
        </button>
      )}
    </div>
  );
}
