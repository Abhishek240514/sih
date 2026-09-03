import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface TransactionVolumeChartProps {
  data: Array<{ timestamp: string; count: number; volume: number }>;
  className?: string;
  metric?: 'count' | 'volume';
}

export function TransactionVolumeChart({ data, className, metric = 'volume' }: TransactionVolumeChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No volume data available
      </div>
    );
  }

  const formattedData = data.map(d => ({
    time: new Date(d.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    count: d.count,
    volume: d.volume,
  }));

  return (
    <div className="h-64">
      <LineChart data={formattedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey="time"
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#6b7280', fontSize: 11 }}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#6b7280', fontSize: 11 }}
          tickFormatter={value => value >= 1 ? formatCurrency(value) : value.toFixed(2)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1f2937',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
          }}
          labelFormatter={(label) => label}
          formatter={(value: number, name: string) => [
            name === 'volume' ? value.toLocaleString('en-US', { style: 'currency', currency: 'BTC', minimumFractionDigits: 2 }) : value,
            name === 'volume' ? 'Volume (BTC)' : 'Transactions',
          ]}
        />
        <Legend wrapperStyle={{ paddingTop: '10px' }} />
        <Line
          type="monotone"
          dataKey={metric}
          stroke={metric === 'volume' ? '#3b82f6' : '#10b981'}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6 }}
          name={metric === 'volume' ? 'Volume (BTC)' : 'Transactions'}
        />
      </LineChart>
    </div>
  );
}