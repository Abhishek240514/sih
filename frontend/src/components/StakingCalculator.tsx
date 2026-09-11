import { useState, useRef, useEffect } from 'react';
import { Sliders, ArrowRight, FileCheck } from 'lucide-react';
import { initScrollReveal } from '@/lib/animation';

interface StakingCalculatorProps {
  onStartInvestigation?: () => void;
}

export function StakingCalculator({ onStartInvestigation }: StakingCalculatorProps) {
  const containerRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [velocity, setVelocity] = useState(32); // tx / hr
  const [fanOut, setFanOut] = useState(16); // destinations
  const [mixerHops, setMixerHops] = useState(2); // hops
  const [timeDelta, setTimeDelta] = useState(5); // minutes
  const [activePreset, setActivePreset] = useState<string>('ransomware');

  useEffect(() => {
    if (cardRef.current) {
      initScrollReveal(cardRef.current, undefined, { y: 24, duration: 0.65 });
    }
  }, []);

  const applyPreset = (preset: 'ransomware' | 'coinjoin' | 'structuring' | 'benign') => {
    setActivePreset(preset);
    if (preset === 'ransomware') {
      setVelocity(38);
      setFanOut(18);
      setMixerHops(2);
      setTimeDelta(3);
    } else if (preset === 'coinjoin') {
      setVelocity(16);
      setFanOut(32);
      setMixerHops(1);
      setTimeDelta(8);
    } else if (preset === 'structuring') {
      setVelocity(26);
      setFanOut(10);
      setMixerHops(3);
      setTimeDelta(12);
    } else if (preset === 'benign') {
      setVelocity(3);
      setFanOut(2);
      setMixerHops(4);
      setTimeDelta(26);
    }
  };

  // Calculate hybrid risk score
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
  let riskBadgeStyle = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  let recommendedAction = 'Routine Passive Monitoring. No immediate judicial subpoena required.';

  if (riskScore >= 75) {
    riskLevel = 'CRITICAL';
    riskBadgeStyle = 'text-rose-700 bg-rose-50 border-rose-200';
    recommendedAction = 'Immediate Asset Seizure Dossier under Title 18 U.S.C. § 981 recommended.';
  } else if (riskScore >= 55) {
    riskLevel = 'HIGH';
    riskBadgeStyle = 'text-amber-700 bg-amber-50 border-amber-200';
    recommendedAction = 'Dispatch 18 U.S.C. § 2703(d) order to receiving VASP exchange compliance.';
  } else if (riskScore >= 35) {
    riskLevel = 'MEDIUM';
    riskBadgeStyle = 'text-blue-700 bg-blue-50 border-blue-200';
    recommendedAction = 'Flag wallet cluster for 30-day automated mempool surveillance.';
  }

  return (
    <section
      ref={containerRef}
      id="risk-engine"
      className="py-20 max-w-7xl mx-auto px-6 lg:px-8 select-none"
    >
      <div
        ref={cardRef}
        className="relative bg-white/90 backdrop-blur-xl border border-gray-200/90 rounded-3xl p-8 sm:p-12 lg:p-14 shadow-sm overflow-hidden"
      >
        {/* Subtle decorative gold ambient glow */}
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left Column: Sliders & Controls */}
          <div className="lg:col-span-7 space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-semibold uppercase tracking-wider mb-4">
                <Sliders className="w-3.5 h-3.5" />
                <span>Forensic Signal Laboratory</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#0F172A] tracking-tight mb-3">
                Hybrid Risk & Anomaly Simulator
              </h2>
              <p className="text-sm sm:text-base text-[#64748B] leading-relaxed">
                Fine-tune investigative parameters to test how the unsupervised Isolation Forest and multi-hop heuristic engine evaluate anomalous Bitcoin transactions in real time.
              </p>
            </div>

            {/* Investigative Presets */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">
                Investigative Scenario Presets
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'ransomware', label: 'DarkSide Ransomware Peel' },
                  { id: 'coinjoin', label: 'Wasabi CoinJoin Round' },
                  { id: 'structuring', label: 'Rapid Smurfing / Structuring' },
                  { id: 'benign', label: 'Retail Institutional Cold Vault' },
                ].map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id as any)}
                    className={`text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                      activePreset === preset.id
                        ? 'bg-[#0F172A] text-white border-[#0F172A]'
                        : 'bg-gray-50 text-[#64748B] border-gray-200 hover:bg-white hover:text-[#0F172A]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tactile Sliders */}
            <div className="space-y-6 bg-[#FAFAFA] border border-gray-200/80 rounded-2xl p-6">
              {/* Slider 1: Transaction Velocity */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-[#0F172A]">
                  <span>Transaction Burst Velocity</span>
                  <span className="font-mono tabular-nums text-[#D4AF37] font-bold">{velocity} tx / hr</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={velocity}
                  onChange={e => {
                    setVelocity(Number(e.target.value));
                    setActivePreset('');
                  }}
                  className="w-full gold-slider"
                />
                <div className="flex justify-between text-[10px] text-[#64748B] font-mono">
                  <span>1 (Normal Wallet)</span>
                  <span>50 (High-Speed Automated Script)</span>
                </div>
              </div>

              {/* Slider 2: Fan-Out */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-[#0F172A]">
                  <span>Counterparty Fan-Out Dispersion</span>
                  <span className="font-mono tabular-nums text-[#D4AF37] font-bold">{fanOut} Outputs</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="35"
                  value={fanOut}
                  onChange={e => {
                    setFanOut(Number(e.target.value));
                    setActivePreset('');
                  }}
                  className="w-full gold-slider"
                />
                <div className="flex justify-between text-[10px] text-[#64748B] font-mono">
                  <span>1 (Direct P2P Transfer)</span>
                  <span>35 (Rapid Layering Fan-Out)</span>
                </div>
              </div>

              {/* Slider 3: Mixer Hops */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-[#0F172A]">
                  <span>Mixer / Tumbler Proximity</span>
                  <span className="font-mono tabular-nums text-[#D4AF37] font-bold">
                    {mixerHops} Hop{mixerHops > 1 ? 's' : ''} Distance
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="4"
                  value={mixerHops}
                  onChange={e => {
                    setMixerHops(Number(e.target.value));
                    setActivePreset('');
                  }}
                  className="w-full gold-slider"
                />
                <div className="flex justify-between text-[10px] text-[#64748B] font-mono">
                  <span>1 Hop (Direct Tumbler Deposit)</span>
                  <span>4 Hops (Multi-Layer Cleaned)</span>
                </div>
              </div>

              {/* Slider 4: Time Delta */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-[#0F172A]">
                  <span>Mempool Re-broadcast Delta</span>
                  <span className="font-mono tabular-nums text-[#D4AF37] font-bold">{timeDelta} Minutes</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={timeDelta}
                  onChange={e => {
                    setTimeDelta(Number(e.target.value));
                    setActivePreset('');
                  }}
                  className="w-full gold-slider"
                />
                <div className="flex justify-between text-[10px] text-[#64748B] font-mono">
                  <span>1 min (Automated Peel Chain)</span>
                  <span>30 min (Human Interaction)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Score Dossier & Signal Decomposition */}
          <div className="lg:col-span-5 bg-white border border-gray-200/90 rounded-2xl p-7 shadow-sm space-y-6">
            {/* Header / Score Gauge */}
            <div className="space-y-3 pb-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wider text-[#64748B] uppercase">
                  Hybrid Triage Score
                </span>
                <span className={`text-xs font-bold font-mono tabular-nums px-2.5 py-1 rounded-full border ${riskBadgeStyle}`}>
                  {riskLevel} RISK
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-5xl sm:text-6xl font-extrabold font-mono tabular-nums text-[#0F172A] tracking-tight">
                  {riskScore}
                </span>
                <span className="text-lg font-medium text-[#64748B]">/ 100</span>
              </div>

              <p className="text-xs text-[#64748B] leading-relaxed">
                Deterministic Bayesian weighting of Isolation Forest anomaly score and graph peel heuristics.
              </p>
            </div>

            {/* Explainable AI Signal Decomposition */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-[#0F172A]">
                <span>Explainable Signal Breakdown</span>
                <span className="text-[10px] text-[#64748B]">WEIGHT RATIO</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] text-[#64748B] mb-1">
                    <span>Isolation Forest Outlier Tree</span>
                    <span className="font-mono tabular-nums font-semibold text-[#0F172A]">{Math.round(mlScore)}/100 (30%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full transition-all duration-300" style={{ width: `${mlScore}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-[#64748B] mb-1">
                    <span>Peel Chain Graph Entropy</span>
                    <span className="font-mono tabular-nums font-semibold text-[#0F172A]">{Math.round(graphScore)}/100 (20%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${graphScore}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-[#64748B] mb-1">
                    <span>Mempool Broadcast Velocity</span>
                    <span className="font-mono tabular-nums font-semibold text-[#0F172A]">{Math.round(temporalScore)}/100 (20%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#D4AF37] rounded-full transition-all duration-300" style={{ width: `${temporalScore}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-[#64748B] mb-1">
                    <span>Mixer Proximity Penalty</span>
                    <span className="font-mono tabular-nums font-semibold text-[#0F172A]">{Math.round(mixerScore)}/100 (15%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full transition-all duration-300" style={{ width: `${mixerScore}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Procedural Recommendation Box */}
            <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-[#0F172A]">
                <FileCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>Procedural Recommendation</span>
              </div>
              <p className="text-[#64748B] leading-relaxed text-[11px]">
                {recommendedAction}
              </p>
            </div>

            {/* Action Trigger */}
            <button
              type="button"
              onClick={onStartInvestigation}
              className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Initiate Case from Simulation</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
