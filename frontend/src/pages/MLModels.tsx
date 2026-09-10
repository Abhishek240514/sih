import { useState } from 'react';
import { useMLStatus, useModelFeatures, useListModels, useTrainModel, usePredictAnomalies, useLoadModel } from '@/hooks/useML';
import { useDataset } from '@/context/DatasetContext';
import { CardSkeleton, TableSkeleton } from '@/components/shared/Skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatTimestamp, cn } from '@/lib/utils';
import {
  Brain, Zap, Activity, Database, CheckCircle2, XCircle,
  Play, Loader2, X, BarChart3, Settings,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';

export default function MLModels() {
  const { activeDatasetId, datasets = [] } = useDataset();
  const statusQuery = useMLStatus();
  const featuresQuery = useModelFeatures();
  const modelsQuery = useListModels();
  const trainMutation = useTrainModel();
  const predictMutation = usePredictAnomalies();
  const loadMutation = useLoadModel();

  const [showTrain, setShowTrain] = useState(false);
  const [trainDatasetId, setTrainDatasetId] = useState(activeDatasetId || '');
  const [contamination, setContamination] = useState(0.1);
  const [nEstimators, setNEstimators] = useState(100);
  const [showPredictions, setShowPredictions] = useState(false);
  const [predictions, setPredictions] = useState<any>(null);

  const status: any = statusQuery.data;
  const processedDatasets = (datasets || []).filter((d: any) => d.status === 'processed' || d.status === 'READY');

  // Prepare features data for chart
  const rawFeatures: any = featuresQuery.data;
  const featuresData = rawFeatures && typeof rawFeatures === 'object' && !Array.isArray(rawFeatures)
    ? Object.entries(rawFeatures as Record<string, number>)
        .map(([name, importance]) => ({
          name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          value: typeof importance === 'number' ? importance : 0,
          shortName: name.length > 20 ? name.slice(0, 18) + '...' : name.replace(/_/g, ' '),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 23)
    : [];

  const handleTrain = async () => {
    if (!trainDatasetId) return;
    try {
      const result: any = await trainMutation.mutateAsync({
        dataset_id: trainDatasetId,
        model_type: 'isolation_forest',
        parameters: {
          contamination,
          n_estimators: nEstimators,
        },
      });
      toast.success(`Model trained successfully! Version: ${result?.version || 'v2'}`);
      setShowTrain(false);
    } catch (err) {
      toast.error('Training failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handlePredict = async () => {
    if (!activeDatasetId) return;
    try {
      const result = await predictMutation.mutateAsync(activeDatasetId);
      setPredictions(result);
      setShowPredictions(true);
      toast.success('Predictions generated');
    } catch (err) {
      toast.error('Prediction failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleLoadModel = async (modelId: string) => {
    try {
      await loadMutation.mutateAsync(modelId);
      toast.success('Model loaded successfully');
    } catch (err) {
      toast.error('Load failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">ML Models</h1>
          <p className="text-sm text-slate-500 mt-1">Anomaly detection model management</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTrain(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
          >
            <Brain className="w-4 h-4" />
            Train Model
          </button>
          <button
            onClick={handlePredict}
            disabled={!activeDatasetId || !status?.trained || predictMutation.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {predictMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Run Predictions
          </button>
        </div>
      </div>

      {/* Model Status Card */}
      {statusQuery.isLoading ? (
        <CardSkeleton />
      ) : statusQuery.isError ? (
        <ErrorState message="Failed to load model status" onRetry={() => statusQuery.refetch()} />
      ) : status ? (
        <div className="glass-card p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-500/10">
                <Brain className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{status.model_type}</h3>
                <p className="text-xs text-slate-500">Anomaly Detection Engine</p>
              </div>
            </div>
            <span className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border',
              status.trained
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            )}>
              {status.trained ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {status.trained ? 'Trained' : 'Not Trained'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricBox icon={<Activity className="w-4 h-4 text-blue-400" />} label="Features" value={String(status.feature_count)} />
            <MetricBox icon={<Database className="w-4 h-4 text-purple-400" />} label="Dataset" value={status.dataset_used ? status.dataset_used.slice(0, 8) + '...' : '—'} />
            <MetricBox icon={<Settings className="w-4 h-4 text-amber-400" />} label="Version" value={status.model_version || '—'} />
            <MetricBox icon={<BarChart3 className="w-4 h-4 text-emerald-400" />} label="Trained At" value={formatTimestamp(status.training_timestamp)} />
          </div>

          {Object.keys(status.parameters).length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
              <h4 className="text-xs text-slate-500 uppercase tracking-wider mb-2">Parameters</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(status.parameters).map(([k, v]) => (
                  <span key={k} className="px-2.5 py-1 rounded-lg bg-slate-900/50 border border-[var(--border-color)] text-xs text-slate-400">
                    {k}: <span className="text-white">{String(v)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Feature Importance Chart */}
      {featuresData.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Feature Importance</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={featuresData} layout="vertical" margin={{ left: 120 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis
                dataKey="shortName"
                type="category"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                width={110}
              />
              <Tooltip
                contentStyle={{
                  background: '#1a1f2e',
                  border: '1px solid #2a3041',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#f1f5f9',
                }}
              />
              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Model Registry */}
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-color)]">
          <h3 className="text-sm font-semibold text-slate-300">Model Registry</h3>
        </div>
        {modelsQuery.isLoading ? (
          <div className="p-4"><TableSkeleton rows={3} cols={4} /></div>
        ) : modelsQuery.data && Array.isArray(modelsQuery.data) && (modelsQuery.data as any[]).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Model ID</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Version</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase">Trained At</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(modelsQuery.data as any[]).map((model: any) => (
                  <tr key={model.model_id || model.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-card-hover)] transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-slate-300">{model.model_id || model.id}</td>
                    <td className="px-5 py-3 text-slate-400">{model.model_type || model.type}</td>
                    <td className="px-5 py-3 text-slate-400">{model.version || '—'}</td>
                    <td className="px-5 py-3 text-xs text-slate-500">{formatTimestamp(model.trained_at)}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleLoadModel(model.model_id || model.id)}
                        disabled={loadMutation.isPending}
                        className="px-3 py-1.5 rounded-md bg-blue-600/20 text-blue-400 text-xs font-medium hover:bg-blue-600/30 transition-colors disabled:opacity-50"
                      >
                        Load
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500">No models in registry</div>
        )}
      </div>

      {/* Train Modal */}
      {showTrain && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowTrain(false)}>
          <div className="glass-card w-full max-w-md p-6 m-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Train Model</h2>
              <button onClick={() => setShowTrain(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Dataset</label>
                <select
                  value={trainDatasetId}
                  onChange={(e) => setTrainDatasetId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/50 border border-[var(--border-color)] text-sm text-slate-300"
                >
                  <option value="">Select dataset...</option>
                  {processedDatasets.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Contamination: {contamination}</label>
                <input
                  type="range"
                  min={0.01}
                  max={0.5}
                  step={0.01}
                  value={contamination}
                  onChange={(e) => setContamination(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">N-Estimators</label>
                <input
                  type="number"
                  min={50}
                  max={500}
                  value={nEstimators}
                  onChange={(e) => setNEstimators(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/50 border border-[var(--border-color)] text-sm text-slate-300"
                />
              </div>

              <button
                onClick={handleTrain}
                disabled={!trainDatasetId || trainMutation.isPending}
                className="w-full px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {trainMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Training...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Start Training
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Predictions Modal */}
      {showPredictions && predictions && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowPredictions(false)}>
          <div className="glass-card w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 m-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Prediction Results</h2>
              <button onClick={() => setShowPredictions(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <pre className="text-xs text-slate-400 bg-slate-900/50 p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(predictions, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-slate-900/30">
      <div className="flex items-center gap-2 text-slate-500 mb-1">
        {icon}
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-medium text-white truncate">{value}</p>
    </div>
  );
}
