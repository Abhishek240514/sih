import { useState } from 'react';
import { X, ArrowRight, CheckCircle2, Shield } from 'lucide-react';
import { toast } from 'sonner';

interface GetStartedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchWorkspace?: () => void;
}

export function GetStartedModal({ isOpen, onClose, onLaunchWorkspace }: GetStartedModalProps) {
  const [selectedDataset, setSelectedDataset] = useState('colonial');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const presets = [
    {
      id: 'colonial',
      name: 'Colonial Pipeline Extortion (75.0 BTC)',
      records: '18,450 Transactions',
      peelDepth: '14 Consecutive Hops',
      sha: '8a24c57f9208a0d24e65b40cfb65bdf35a3962b80459a9307d0efb8b2dc1e76b',
    },
    {
      id: 'chipmixer',
      name: 'ChipMixer Darknet Tumbler (142.45 BTC)',
      records: '42,100 Transactions',
      peelDepth: 'ZeroLink Multi-Denom Pool',
      sha: '4f93c09b78291a45ee92019b8849204859a03982938491029384910293849102',
    },
    {
      id: 'hydra',
      name: 'Hydra Market Darknet Cashout (450.2 BTC)',
      records: '95,800 Transactions',
      peelDepth: 'High-Fan-In Layering Matrix',
      sha: '3b82940294819284928192839481928394819283948192839481928394819283',
    },
  ];

  const handleStartAnalysis = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      toast.success('Initialized forensic clustering and graph ingestion!');
      onClose();
      onLaunchWorkspace?.();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-[#0F172A]/60 backdrop-blur-xs" />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-white border border-gray-200 rounded-3xl p-8 shadow-2xl z-10 overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-50 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Initialize Forensic Investigation</h3>
              <p className="text-xs text-[#64748B]">Select a target dataset to ingest into the heuristic clustering engine</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dataset Selection */}
        <div className="space-y-3 my-6">
          <label className="block text-xs font-semibold text-[#0F172A] uppercase tracking-wider">
            Benchmark Crime Dataset Presets
          </label>

          {presets.map(p => (
            <div
              key={p.id}
              onClick={() => setSelectedDataset(p.id)}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                selectedDataset === p.id
                  ? 'border-[#D4AF37] bg-amber-50/20 shadow-xs ring-2 ring-[#D4AF37]/20'
                  : 'border-gray-200 hover:border-gray-300 bg-[#FAFAFA]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#0F172A]">{p.name}</span>
                {selectedDataset === p.id && (
                  <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                )}
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-[#64748B] mt-1.5">
                <span>{p.records}</span>
                <span>•</span>
                <span>{p.peelDepth}</span>
              </div>
              <div className="text-[10px] font-mono text-gray-400 mt-1 truncate">
                SHA-256: {p.sha}
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-xs font-semibold text-[#64748B] hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-[#D4AF37] to-[#c58528] hover:shadow-lg hover:shadow-[#D4AF37]/30 transition-all cursor-pointer"
          >
            {isProcessing ? (
              <span>Ingesting & Clusting...</span>
            ) : (
              <>
                <span>Launch Investigation Desk</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
