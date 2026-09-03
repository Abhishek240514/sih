import { useState } from 'react';
import { useGetMLStatusQuery, useTrainModelMutation, usePredictAnomaliesMutation, useListModelsQuery } from '@/lib/api';
import { DataTable } from '@/components/ui/DataTable';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { formatNumber, truncateAddress } from '@/lib/utils';
import { useDataset } from '@/context/DatasetContext';

export function MLPage() {
  const { datasetId } = useDataset();
  const [trainParams, setTrainParams] = useState({ contamination: 0.1, n_estimators: 100 });

  const { data: status, isLoading: statusLoading } = useGetMLStatusQuery();
  const trainMutation = useTrainModelMutation();
  const predictMutation = usePredictAnomaliesMutation();
  const { data: models } = useListModelsQuery();

  const handleTrain = async () => {
    if (!datasetId) return;
    try {
      await trainMutation.mutateAsync({ dataset_id: datasetId, model_type: 'isolation_forest', parameters: trainParams });
    } catch (err) {
      console.error(err);
      alert('Training failed');
    }
  };

  const handlePredict = async () => {
    if (!datasetId) return;
    try {
      await predictMutation.mutateAsync({ dataset_id: datasetId });
    } catch (err) {
      console.error(err);
      alert('Prediction failed');
    }
  };

  if (!datasetId) return <div className="p-8 text-center text-gray-500">Select a dataset</div>;

  return (
    <>
      <h1 className="text-2xl font-bold text-gray-900">ML Model Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Status</h3>
          {statusLoading ? (
            <div className="skeleton-card" style={{ height: '200px' }} />
          ) : status ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status</span>
                <span className={`font-semibold ${status.trained ? 'text-green-600' : 'text-gray-600'}`}>
                  {status.trained ? 'Trained' : 'Not Trained'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Model Type</span>
                <span className="font-mono">{status.model_type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Version</span>
                <span className="font-mono">{status.model_version}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Features</span>
                <span className="font-mono">{status.feature_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Dataset</span>
                <span className="font-mono truncate max-w-[200px]">{status.dataset_used || 'N/A'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Trained At</span>
                <span>{status.training_timestamp ? new Date(status.training_timestamp).toLocaleString() : 'Never'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Parameters</span>
                <span className="font-mono text-xs">{JSON.stringify(status.parameters)}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Unable to load model status</p>
          )}
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Train New Model</h3>
          {datasetId ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contamination</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="0.5"
                  value={trainParams.contamination}
                  onChange={e => setTrainParams({ ...trainParams, contamination: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">N Estimators</label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={trainParams.n_estimators}
                  onChange={e => setTrainParams({ ...trainParams, n_estimators: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
              <button
                onClick={handleTrain}
                disabled={trainMutation.isPending}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
              >
                {trainMutation.isPending ? 'Training...' : 'Train Model'}
              </button>
            </div>
          ) : (
            <p className="text-gray-500">Select a dataset to enable training</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Run Inference</h3>
        <div className="space-y-4">
          {datasetId ? (
            <div>
              <button
                onClick={handlePredict}
                disabled={predictMutation.isPending}
                className="w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
              >
                {predictMutation.isPending ? 'Running Inference...' : 'Run Anomaly Detection'}
              </button>
              {predictMutation.isSuccess && predictMutation.data && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="font-medium text-green-800 mb-2">Inference Complete</p>
                  <p className="text-sm text-green-700">
                    Total: {predictMutation.data.total} | Anomalies: {predictMutation.data.anomalies_detected} ({(predictMutation.data.anomalies_detected / predictMutation.data.total * 100).toFixed(1)}%)
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500">Select a dataset to run inference</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6 lg:col-span-2">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Registry</h3>
        <DataTable
          data={models || []}
          columns={[
            { key: 'id', header: 'ID', render: (_, v: string) => <span className="font-mono text-xs">{truncateAddress(v, 6)}</span> },
            { key: 'model_type', header: 'Type' },
            { key: 'version', header: 'Version' },
            { key: 'trained_at', header: 'Trained', render: (_, v: string) => <span>{new Date(v).toLocaleString()}</span> },
            { key: 'dataset_id', header: 'Dataset', render: (_, v: string) => v ? <span className="font-mono text-xs truncate max-w-[150px]">{truncateAddress(v, 8)}</span> : '-' },
            { key: 'feature_count', header: 'Features', render: (_, v: number) => <span className="font-mono">{v}</span> },
            { key: 'is_active', header: 'Active', render: (_, v: number) => v === 1 ? <span className="text-green-600">Yes</span> : <span className="text-gray-500">No</span> },
          ]}
          keyExtractor={m => m.id}
          emptyMessage="No trained models"
          showPagination={false}
        />
      </div>
    </>
  );
}