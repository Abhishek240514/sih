import { useState } from 'react';
import {
  useMLStatus, useModelFeatures, useListModels,
  useTrainModel, usePredictAnomalies, useLoadModel,
} from '@/hooks/useML';
import { useDataset } from '@/context/DatasetContext';
import { CardSkeleton, TableSkeleton } from '@/components/shared/Skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatTimestamp } from '@/lib/utils';
import {
  Brain, Zap, Activity, Database, CheckCircle2, XCircle,
  Play, Loader2, X, BarChart3, Settings, Cpu,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { toast } from 'sonner';

const CHART_STYLE = {
  background: '#060e1e',
  border: '1px solid rgba(99, 155, 255, 0.1)',
  borderRadius: '10px',
  fontSize: '12px',
  color: '#f0f6ff',
  padding: '8px 12px',
};

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
  const processedDatasets = (datasets || []).filter(
    (d: any) => d.status === 'processed' || d.status === 'READY',
  );

  const rawFeatures: any = featuresQuery.data;
  const featuresData =
    rawFeatures && typeof rawFeatures === 'object' && !Array.isArray(rawFeatures)
      ? Object.entries(rawFeatures as Record<string, number>)
          .map(([name, importance]) => ({
            name: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            value: typeof importance === 'number' ? importance : 0,
            shortName: name.length > 22 ? name.slice(0, 20) + '…' : name.replace(/_/g, ' '),
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 20)
      : [];

  const handleTrain = async () => {
    if (!trainDatasetId) return;
    try {
      const result: any = await trainMutation.mutateAsync({
        dataset_id: trainDatasetId,
        model_type: 'isolation_forest',
        parameters: { contamination, n_estimators: nEstimators },
      });
      toast.success(`Model trained! Version: ${result?.version || 'latest'}`);
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
      toast.success('Model loaded');
    } catch (err) {
      toast.error('Load failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">ML Models</h1>
          <p className="page-subtitle">Anomaly detection model training and management</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={() => setShowTrain(true)}>
            <Brain style={{ width: 14, height: 14 }} />
            Train Model
          </button>
          <button
            className="btn-primary"
            onClick={handlePredict}
            disabled={!activeDatasetId || !status?.trained || predictMutation.isPending}
          >
            {predictMutation.isPending
              ? <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Running...</>
              : <><Zap style={{ width: 14, height: 14 }} /> Run Predictions</>
            }
          </button>
        </div>
      </div>

      {/* Model Status */}
      {statusQuery.isLoading ? (
        <CardSkeleton />
      ) : statusQuery.isError ? (
        <ErrorState message="Failed to load model status" onRetry={() => statusQuery.refetch()} />
      ) : status ? (
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 50, height: 50, borderRadius: 14,
                  background: 'rgba(155, 92, 246, 0.1)',
                  border: '1px solid rgba(155, 92, 246, 0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Brain style={{ width: 24, height: 24, color: '#9b5cf6' }} />
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  {status.model_type || 'Isolation Forest'}
                </h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>
                  Anomaly Detection Engine
                </p>
              </div>
            </div>
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '6px 14px', borderRadius: 999,
                fontSize: 12, fontWeight: 600,
                background: status.trained ? 'rgba(16,217,138,0.08)' : 'rgba(255,61,85,0.08)',
                color: status.trained ? '#10d98a' : '#ff3d55',
                border: `1px solid ${status.trained ? 'rgba(16,217,138,0.2)' : 'rgba(255,61,85,0.2)'}`,
              }}
            >
              {status.trained ? <CheckCircle2 style={{ width: 13, height: 13 }} /> : <XCircle style={{ width: 13, height: 13 }} />}
              {status.trained ? 'Trained' : 'Not Trained'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { icon: <Activity style={{ width: 15, height: 15 }} />, label: 'Features', value: String(status.feature_count || '—'), color: 'var(--accent-blue)' },
              { icon: <Database style={{ width: 15, height: 15 }} />, label: 'Dataset', value: status.dataset_used ? status.dataset_used.slice(0, 8) + '…' : '—', color: '#9b5cf6' },
              { icon: <Settings style={{ width: 15, height: 15 }} />, label: 'Version', value: status.model_version || '—', color: '#f59e0b' },
              { icon: <BarChart3 style={{ width: 15, height: 15 }} />, label: 'Trained At', value: formatTimestamp(status.training_timestamp), color: '#10d98a' },
            ].map((m) => (
              <div key={m.label} style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(99,155,255,0.04)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                  <span style={{ color: m.color }}>{m.icon}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' }}>{m.label}</span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{m.value}</p>
              </div>
            ))}
          </div>

          {Object.keys(status.parameters || {}).length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Hyperparameters
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(status.parameters).map(([k, v]) => (
                  <span key={k} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, background: 'rgba(99,155,255,0.06)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    {k}: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{String(v)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Feature Importance */}
      {featuresData.length > 0 && (
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Feature Importance</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>Top {featuresData.length} most influential features</p>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(280, featuresData.length * 22)}>
            <BarChart data={featuresData} layout="vertical" margin={{ left: 140, right: 30, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,155,255,0.06)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#4a6280' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="shortName" type="category" tick={{ fontSize: 11, fill: '#8ba3c7' }} width={130} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={CHART_STYLE} />
              <Bar dataKey="value" radius={[0, 5, 5, 0]}>
                {featuresData.map((_, idx) => (
                  <Cell
                    key={idx}
                    fill={`hsl(${260 - idx * 4}, 85%, ${65 - idx * 1.5}%)`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Model Registry */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Cpu style={{ width: 15, height: 15, color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Model Registry</h3>
        </div>
        {modelsQuery.isLoading ? (
          <div style={{ padding: 20 }}><TableSkeleton rows={3} cols={5} /></div>
        ) : modelsQuery.data && Array.isArray(modelsQuery.data) && (modelsQuery.data as any[]).length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Model ID</th>
                  <th>Type</th>
                  <th>Version</th>
                  <th>Trained At</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {(modelsQuery.data as any[]).map((model: any) => (
                  <tr key={model.model_id || model.id}>
                    <td>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, color: 'var(--accent-cyan)' }}>
                        {model.model_id || model.id}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{model.model_type || model.type}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{model.version || '—'}</td>
                    <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{formatTimestamp(model.trained_at)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => handleLoadModel(model.model_id || model.id)}
                        disabled={loadMutation.isPending}
                        style={{ padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(59,124,249,0.25)', background: 'rgba(59,124,249,0.08)', color: 'var(--accent-blue)', transition: 'all 0.2s', opacity: loadMutation.isPending ? 0.5 : 1 }}
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
          <p style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            No models in registry. Train your first model to get started.
          </p>
        )}
      </div>

      {/* Train Modal */}
      {showTrain && (
        <div className="modal-backdrop" onClick={() => setShowTrain(false)}>
          <div
            className="glass-card animate-fade-in"
            style={{ width: '100%', maxWidth: 440, padding: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(155,92,246,0.1)', border: '1px solid rgba(155,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Brain style={{ width: 20, height: 20, color: '#9b5cf6' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Train Model</h2>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Isolation Forest</p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setShowTrain(false)}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Dataset</label>
                <select
                  value={trainDatasetId}
                  onChange={(e) => setTrainDatasetId(e.target.value)}
                  className="input-field"
                >
                  <option value="">Select dataset...</option>
                  {processedDatasets.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Contamination: <span style={{ color: 'var(--accent-blue)' }}>{contamination}</span>
                </label>
                <input
                  type="range" min={0.01} max={0.5} step={0.01}
                  value={contamination}
                  onChange={(e) => setContamination(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  <span>0.01</span><span>0.5</span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>N-Estimators</label>
                <input
                  type="number" min={50} max={500}
                  value={nEstimators}
                  onChange={(e) => setNEstimators(Number(e.target.value))}
                  className="input-field"
                />
              </div>

              <button
                className="btn-primary"
                onClick={handleTrain}
                disabled={!trainDatasetId || trainMutation.isPending}
                style={{ width: '100%', justifyContent: 'center', padding: '11px 20px' }}
              >
                {trainMutation.isPending ? (
                  <><Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} /> Training in progress...</>
                ) : (
                  <><Play style={{ width: 15, height: 15 }} /> Start Training</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Predictions Modal */}
      {showPredictions && predictions && (
        <div className="modal-backdrop" onClick={() => setShowPredictions(false)}>
          <div
            className="glass-card animate-fade-in"
            style={{ width: '100%', maxWidth: 640, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Prediction Results</h2>
              <button className="btn-icon" onClick={() => setShowPredictions(false)}>
                <X style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div style={{ overflow: 'auto', padding: 20, flex: 1 }}>
              <pre style={{ fontSize: 11.5, color: 'var(--text-secondary)', background: 'rgba(6, 14, 30, 0.8)', padding: 16, borderRadius: 10, border: '1px solid var(--border-color)', overflowX: 'auto', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6 }}>
                {JSON.stringify(predictions, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
