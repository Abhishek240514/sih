import { cn, formatRiskScore, getRiskColor } from '@/lib/utils';

interface RiskScoreGaugeProps {
  score: number; // 0-1 float
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RiskScoreGauge({ score, size = 'md', className }: RiskScoreGaugeProps) {
  const displayScore = formatRiskScore(score);
  const level = score >= 0.8 ? 'CRITICAL' : score >= 0.6 ? 'HIGH' : score >= 0.4 ? 'MEDIUM' : 'LOW';
  const color = getRiskColor(level);
  
  const sizeClasses = {
    sm: 'w-10 h-10 text-xs',
    md: 'w-14 h-14 text-sm',
    lg: 'w-20 h-20 text-lg',
  };

  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference * (1 - score);

  return (
    <div className={cn('relative inline-flex items-center justify-center', sizeClasses[size], className)}>
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-slate-800"
        />
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={cn(color, 'transition-all duration-700 ease-out')}
        />
      </svg>
      <span className={cn('font-bold relative z-10', color)}>{displayScore}</span>
    </div>
  );
}
