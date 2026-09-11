import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { cn } from '@/lib/utils';

interface RiskDistributionChartProps {
  data: Record<string, number>;
  className?: string;
}

const COLORS = {
  LOW: '#16a34a',
  MEDIUM: '#ca8a04',
  HIGH: '#ea580c',
  CRITICAL: '#dc2626',
};

const LABELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export function RiskDistributionChart({ data, className }: RiskDistributionChartProps) {
  const chartData = Object.entries(data).map(([level, count]) => ({
    level,
    count,
    label: LABELS[level as keyof typeof LABELS] || level,
    color: COLORS[level as keyof typeof COLORS] || '#6b7280',
  }));

  const total = chartData.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64 text-gray-400", className)}>
        No risk data available
      </div>
    );
  }

  return (
    <div className={cn("h-64", className)}>
      <PieChart width={320} height={256}>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={2}
          dataKey="count"
          nameKey="level"
          label={(entry: any) => entry.count > 0 ? `${entry.label} ${((entry.count / total) * 100).toFixed(1)}%` : ''}
          labelLine={false}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
          <Tooltip
            formatter={(value: any, name: any) => [Number(value || 0), LABELS[name as keyof typeof LABELS] || String(name)]}
            labelFormatter={(label: any) => LABELS[label as keyof typeof LABELS] || String(label)}
            contentStyle={{
              backgroundColor: '#1f2937',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
            }}
          />
        </Pie>
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={10}
          wrapperStyle={{ paddingTop: '20px' }}
        />
      </PieChart>
    </div>
  );
}