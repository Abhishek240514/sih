import { useState } from 'react';
import { Sliders, ArrowRight } from 'lucide-react';

interface StakingCalculatorProps {
  onStartInvestigation?: () => void;
}

export function StakingCalculator({ onStartInvestigation }: StakingCalculatorProps) {
  const [velocity, setVelocity] = useState(28); // tx / hr
  const [fanOut, setFanOut] = useState(14); // destinations
  const [mixerHops, setMixerHops] = useState(2); // hops
  const [timeDelta, setTimeDelta] = useState(6); // minutes

  // Calculate hybrid risk score
  // ML (30%) + Graph (20%) + Temporal (20%) + Network (15%) + Behavioral (15%)
  const mlScore = Math.min(100, (velocity / 50) * 100);
  const graphScore = Math.min(100, (fanOut / 35) * 100);
  const mixerScore = Math.max(0, 100 - (mixerHops - 1) * 30);
  const temporalScore = Math.min(100, ((30 - timeDelta) / 30) * 100);

  const rawScore =
    0.3 * mlScore +
    0.2 * graphScore +
    0.2 * temporalScore +
    0.15 * mixerScore +
    0.15 * ((mlScore + graphScore) / 2);

  const riskScore = Math.min(99.4, Math.max(8.5, Math.round(rawScore * 10) / 10));

  let riskLevel = 'LOW';
  let riskColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
  if (riskScore >= 75) {
    riskLevel = 'CRITICAL';
    riskColor = 'text-rose-700 bg-rose-50 border-rose-200';
  } else if (riskScore >= 55) {
    riskLevel = 'HIGH';
    riskColor = 'text-orange-700 bg-orange-50 border-orange-200';
  } else if (riskScore >= 35) {
    riskLevel = 'MEDIUM';
    riskColor = 'text-amber-700 bg-amber-50 border-amber-200';
  }

  return (
    <section id="risk-engine" className="py-20 max-w-7xl mx-auto px-6 lg:px-8">
      <div className="relative bg-white/80 backdrop-blur-xl border border-gray-200/80 rounded-3xl p-8 sm:p-12 lg:p-16 shadow-xl overflow-hidden">
        {/* Subtle decorative gold ambient highlight */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Sliders */}
          <div className="lg:col-span-7 space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold uppercase tracking-wider mb-4">
                <Sliders className="w-3.5 h-3.5" />
                <span>Interactive Forensics Simulator</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight mb-3">
                Hybrid Risk & Anomaly Simulator
              </h2>
              <p className="text-sm sm:text-base text-[#64748B] leading-relaxed">
                Adjust behavioral parameters to simulate how our hybrid Isolation Forest and heuristic graph engine ranks incoming investigative leads.
              </p>
            </div>

            {/* Sliders Container */}
            <div className="space-y-6 bg-[#FAFAFA] border border-gray-200/80 rounded-2xl p-6">
              {/* Slider 1: Transaction Velocity */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-[#0F172A]">
                  <span>Transaction Burst Velocity</span>
                  <span className="font-mono text-[#D4AF37]">{velocity} tx / hr</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={velocity}
                  onChange={e => setVelocity(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
                />
                <div className="flex justify-between text-[10px] text-[#64748B] font-mono">
                  <span>1 (Normal Retail)</span>
                  <span>50 (High-Speed Bot)</span>
                </div>
              </div>

              {/* Slider 2: Counterparty Fan-Out */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-[#0F172A]">
                  <span>Counterparty Fan-Out Factor</span>
                  <span className="font-mono text-[#D4AF37]">{fanOut} addresses</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="35"
                  value={fanOut}
                  onChange={e => setFanOut(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
                />
                <div className="flex justify-between text-[10px] text-[#64748B] font-mono">
                  <span>1 (Direct Transfer)</span>
                  <span>35 (Layering Tree)</span>
                </div>
              </div>

              {/* Slider 3: Mixer Proximity */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-[#0F172A]">
                  <span>Mixer / Tumbler Proximity</span>
                  <span className="font-mono text-[#D4AF37]">{mixerHops} Hop{mixerHops > 1 ? 's' : ''} Away</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="4"
                  value={mixerHops}
                  onChange={e => setMixerHops(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
                />
                <div className="flex justify-between text-[10px] text-[#64748B] font-mono">
                  <span>1 (Direct Deposit)</span>
                  <span>4 (Deeply Obfuscated)</span>
                </div>
              </div>

              {/* Slider 4: Time Delta */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-[#0F172A]">
                  <span>Rapid Structuring Window</span>
                  <span className="font-mono text-[#D4AF37]">{timeDelta} Minutes</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={timeDelta}
                  onChange={e => setTimeDelta(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
                />
                <div className="flex justify-between text-[10px] text-[#64748B] font-mono">
                  <span>1 min (Automated Peel)</span>
                  <span>30 min (Human Behavior)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Score Gauge & Output Card */}
          <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl p-8 shadow-lg flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider text-[#64748B] uppercase">
                  Calculated Risk Score
                </span>
                <span className={`text-xs font-bold font-mono px-3 py-1 rounded-full border ${riskColor}`}>
                  {riskLevel} RISK
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-extrabold font-mono text-[#0F172A] tracking-tight">
                  {riskScore}
                </span>
                <span className="text-xl font-medium text-[#64748B]">/ 100</span>
              </div>

              <p className="text-xs text-[#64748B] leading-relaxed">
                Hybrid aggregation of Isolation Forest score, graph heuristic co-spending weight, and P2P mempool latency delta.
              </p>
            </div>

            {/* Explainable Signals List */}
            <div className="space-y-3 pt-4 border-t border-gray-100">
              <div className="text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
                Explainable Signals
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200/60">
                  <span className="text-[#0F172A] font-medium">Peel Chain Layering Probability</span>
                  <span className="font-mono font-bold text-[#D4AF37]">{Math.round(graphScore)}%</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200/60">
                  <span className="text-[#0F172A] font-medium">Temporal Velocity Anomaly</span>
                  <span className="font-mono font-bold text-rose-600">{Math.round(mlScore)}%</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200/60">
                  <span className="text-[#0F172A] font-medium">Mixer Proximity Influence</span>
                  <span className="font-mono font-bold text-blue-600">{Math.round(mixerScore)}%</span>
                </div>
              </div>
            </div>

            {/* Launch Action */}
            <button
              type="button"
              onClick={onStartInvestigation}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-semibold text-white bg-gradient-to-r from-[#D4AF37] to-[#c58528] hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span>Initialize Lead Investigation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
