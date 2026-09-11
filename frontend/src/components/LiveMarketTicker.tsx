import { ShieldAlert, TrendingUp, Cpu, Network, Lock, Flame } from 'lucide-react';

interface LiveMarketTickerProps {
  onSelectMetric?: (metricId: string) => void;
}

export function LiveMarketTicker({ onSelectMetric }: LiveMarketTickerProps) {
  const telemetryItems = [
    {
      id: 'illicit-flow',
      label: 'FLAGGED ILLICIT FLOW (30D)',
      value: '2,490.80 BTC',
      sub: '$160.2M USD',
      trend: '+12.4%',
      icon: Flame,
      color: 'text-amber-600',
    },
    {
      id: 'sanctioned-clusters',
      label: 'SANCTIONED WALLET TARGETS',
      value: '1,482 CLUSTERS',
      sub: 'SDN Designated',
      trend: 'ACTIVE',
      icon: ShieldAlert,
      color: 'text-rose-600',
    },
    {
      id: 'active-peel-chains',
      label: 'ACTIVE PEEL CHAINS',
      value: '342 CHAINS',
      sub: 'Avg 8.4 hops/chain',
      trend: '+4.1%',
      icon: Network,
      color: 'text-[#D4AF37]',
    },
    {
      id: 'tumbler-inflow',
      label: 'MIXER / TUMBLER INFLOWS',
      value: '1,280.45 BTC',
      sub: 'ChipMixer & Wasabi',
      trend: 'EVALUATED',
      icon: TrendingUp,
      color: 'text-blue-600',
    },
    {
      id: 'ml-outliers',
      label: 'ISOLATION FOREST OUTLIERS',
      value: '3.82% ANOMALY',
      sub: '22-Dim Vectors',
      trend: 'CALIBRATED',
      icon: Cpu,
      color: 'text-purple-600',
    },
    {
      id: 'seized-escrow',
      label: 'JUDICIALLY SECURED ASSETS',
      value: '245.82 BTC',
      sub: '$15.8M Escrowed',
      trend: '64.8% RECOVERY',
      icon: Lock,
      color: 'text-emerald-600',
    },
  ];

  const displayItems = [...telemetryItems, ...telemetryItems];

  return (
    <div className="relative w-full bg-white/90 backdrop-blur-md border-y border-gray-200/80 overflow-hidden py-3 select-none">
      <div className="flex animate-ticker whitespace-nowrap">
        {displayItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              onClick={() => onSelectMetric?.(item.id)}
              className="inline-flex items-center gap-3.5 px-6 cursor-pointer group transition-opacity hover:opacity-80 border-r border-gray-200/60"
            >
              <div className="w-8 h-8 rounded-full bg-[#FAFAFA] border border-gray-200/80 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                <Icon className={`w-3.5 h-3.5 ${item.color}`} />
              </div>
              <div className="text-left leading-tight">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-[#64748B]">
                    {item.label}
                  </span>
                  <span className="text-[10px] font-mono tabular-nums font-bold px-1.5 py-0.5 rounded bg-amber-50 text-[#D4AF37] border border-[#D4AF37]/20">
                    {item.trend}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs sm:text-sm font-semibold font-mono tabular-nums text-[#0F172A]">
                    {item.value}
                  </span>
                  <span className="text-[11px] text-[#64748B] font-mono tabular-nums">
                    {item.sub}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
