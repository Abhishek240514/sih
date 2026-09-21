import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-shimmer rounded-lg', className)} style={{ minHeight: 12 }} />;
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-7" style={{ opacity: 0.6 }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Skeleton key={`${rowIdx}-${colIdx}`} className="h-9" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Skeleton className="h-3" style={{ width: 80 }} />
      <Skeleton className="h-8" style={{ width: 130 }} />
      <Skeleton className="h-3" style={{ width: 100 }} />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="glass-card" style={{ padding: 20 }}>
      <Skeleton className="h-4" style={{ width: 120, marginBottom: 16 }} />
      <Skeleton className="h-44 w-full" />
    </div>
  );
}
