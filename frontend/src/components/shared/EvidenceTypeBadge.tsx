import { cn, evidenceTypeConfig } from '@/lib/utils';
import type { EvidenceType } from '@/lib/types';

interface EvidenceTypeBadgeProps {
  type: EvidenceType;
  className?: string;
}

export function EvidenceTypeBadge({ type, className }: EvidenceTypeBadgeProps) {
  const config = evidenceTypeConfig[type] || evidenceTypeConfig.observed;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', config.class, className)}>
      <span>{config.label}</span>
    </span>
  );
}
