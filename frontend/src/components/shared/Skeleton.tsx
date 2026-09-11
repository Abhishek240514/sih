import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-shimmer rounded-lg', className)} />;
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-8" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, colIdx) => (
            <Skeleton key={`${rowIdx}-${colIdx}`} className="h-10" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-card p-5 space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="glass-card p-5">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
