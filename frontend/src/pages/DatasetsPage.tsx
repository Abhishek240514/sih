import { useState } from 'react';
import { useGetDatasetsQuery, useUploadDatasetMutation, useProcessDatasetMutation, useDeleteDatasetMutation } from '@/lib/api';
import { DataTable } from '@/components/ui/DataTable';
import { RiskBadge } from '@/components/ui/RiskBadge';
import { formatNumber, formatRelativeTime, truncateAddress } from '@/lib/utils';
import { useDataset } from '@/context/DatasetContext';

export function DatasetsPage() {
  const { datasetId, setDatasetId } = useDataset();
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const { data: datasets, isLoading, refetch } = useGetDatasetsQuery({ skip: 0, limit: 100 });
  const uploadMutation = useUploadDatasetMutation();
  const processMutation = useProcessDatasetMutation();
  const deleteMutation = useDeleteDatasetMutation();

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const name = file.name.replace(/\.[^/.]+$/, '');
      await uploadMutation.mutateAsync({ file, name });
      setShowUpload(false);
      refetch();
    } catch (err) {
      console.error(err);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleProcess = async (id: string) => {
    try {
      await processMutation.mutateAsync({ dataset_id: id });
      refetch();
    } catch (err) {
      console.error(err);
      alert('Processing failed');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this dataset? This cannot be undone.')) return;
    try {
      await deleteMutation.mutateAsync({ dataset_id: id });
      if (datasetId === id) setDatasetId('');
      refetch();
    } catch (err) {
      console.error(err);
      alert('Delete failed');
    }
  };

  const columns = [
    { key: 'name', header: 'Name', render: (row: any) => <span className="font-medium">{row.name}</span> },
    { key: 'filename', header: 'File', render: (_, v: string) => <span className="text-gray-600 text-sm truncate max-w-[200px]">{v}</span> },
    { key: 'format', header: 'Format', render: (_, v: string) => <span className="px-2 py-0.5 text-xs bg-gray-100 rounded uppercase">{v}</span> },
    { key: 'status', header: 'Status', render: (_, v: string) => {
      const colors = { processed: 'bg-green-100 text-green-800', processing: 'bg-yellow-100 text-yellow-800', uploaded: 'bg-gray-100 text-gray-800', failed: 'bg-red-100 text-red-800' };
      return <span className={`px-2 py-0.5 text-xs rounded-full ${colors[v as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>{v}</span>;
    }},
    { key: 'total_records', header: 'Records', render: (row: any) => <span className="font-mono">{formatNumber(row.valid_records)}/{formatNumber(row.total_records)}</span> },
    { key: 'created_at', header: 'Created', render: (_, v: string) => <span className="text-gray-600">{formatRelativeTime(v)}</span> },
    { key: 'actions', header: 'Actions', render: (row: any) => {
      return (
        <div className="flex items-center gap-2">
          {datasetId === row.id && <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">Active</span>}
          {row.status === 'uploaded' && (
            <button onClick={() => handleProcess(row.id)} className="px-3 py-1 text-xs border rounded hover:bg-gray-50">Process</button>
          )}
          <button
            onClick={() => { setDatasetId(row.id); }}
            className="px-3 py-1 text-xs text-primary hover:underline"
          >
            Select
          </button>
          <button onClick={() => handleDelete(row.id)} className="px-3 py-1 text-xs text-red-600 hover:underline">Delete</button>
        </div>
      );
    }},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Datasets</h1>
        <button
          onClick={() => setShowUpload(true)}
          disabled={uploading}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload Dataset'}
        </button>
      </div>

      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Upload Dataset</h3>
            <input
              type="file"
              accept=".csv,.json,.xml"
              onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0])}
              className="w-full mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowUpload(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
              <button disabled={uploading} className="px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50">Upload</button>
            </div>
          </div>
        </div>
      )}

      <DataTable
        data={datasets || []}
        columns={columns}
        keyExtractor={d => d.id}
        loading={isLoading}
        emptyMessage="No datasets uploaded yet"
        showPagination={false}
      />
    </div>
  );
}