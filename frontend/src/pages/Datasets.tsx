import { useState, useRef, useCallback } from 'react';
import { useDatasets, useUploadDataset, useProcessDataset, useDeleteDataset } from '@/hooks/useDatasets';
import { useDataset } from '@/context/DatasetContext';
import { TableSkeleton } from '@/components/shared/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatTimestamp, cn, datasetStatusConfig } from '@/lib/utils';
import {
  Upload, Trash2, Play, X, Database, FileText,
  AlertTriangle, CheckCircle2, Loader2, HardDrive,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Datasets() {
  const datasetsQuery = useDatasets();
  const uploadMutation = useUploadDataset();
  const processMutation = useProcessDataset();
  const deleteMutation = useDeleteDataset();
  const { setActiveDatasetId = () => {}, activeDatasetId, refreshDatasets = () => {} } = useDataset();

  const [showUpload, setShowUpload] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const datasets = datasetsQuery.data || [];

  const handleFileUpload = async (file: File) => {
    try {
      const name = uploadName.trim() || file.name.replace(/\.[^.]+$/, '');
      await uploadMutation.mutateAsync({ file, name });
      toast.success('Dataset uploaded successfully');
      setShowUpload(false);
      setUploadName('');
      refreshDatasets();
    } catch (err) {
      toast.error('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleProcess = async (datasetId: string) => {
    try {
      await processMutation.mutateAsync(datasetId);
      toast.success('Dataset processed successfully');
      refreshDatasets();
    } catch (err) {
      toast.error('Processing failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDelete = async (datasetId: string) => {
    try {
      await deleteMutation.mutateAsync(datasetId);
      toast.success('Dataset deleted');
      setDeleteConfirm(null);
      refreshDatasets();
    } catch (err) {
      toast.error('Delete failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [uploadName]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Datasets</h1>
          <p className="text-sm text-slate-500 mt-1">Upload and manage forensic datasets</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload Dataset
        </button>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowUpload(false)}>
          <div className="glass-card w-full max-w-lg p-6 m-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Upload Dataset</h2>
              <button onClick={() => setShowUpload(false)} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Dataset Name</label>
                <input
                  type="text"
                  placeholder="e.g., BTC Transactions Q4 2024"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/50 border border-[var(--border-color)] focus:border-blue-500/30 focus:outline-none text-sm text-slate-300 placeholder:text-slate-600"
                />
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
                  dragOver ? 'border-blue-500 bg-blue-500/5' : 'border-[var(--border-color)] hover:border-[var(--border-hover)]'
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-300 mb-1">
                  {uploadMutation.isPending ? 'Uploading...' : 'Drop your file here or click to browse'}
                </p>
                <p className="text-xs text-slate-500">Supports CSV, JSON, XML</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,.xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
              </div>

              {uploadMutation.isPending && (
                <div className="flex items-center gap-2 text-sm text-blue-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setDeleteConfirm(null)}>
          <div className="glass-card w-full max-w-sm p-6 m-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Delete Dataset</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6">This action cannot be undone. All associated data will be permanently removed.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg border border-[var(--border-color)] text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Datasets Table */}
      {datasetsQuery.isLoading ? (
        <div className="glass-card p-4"><TableSkeleton rows={5} cols={7} /></div>
      ) : datasetsQuery.isError ? (
        <ErrorState message="Failed to load datasets" onRetry={() => datasetsQuery.refetch()} />
      ) : datasets.length === 0 ? (
        <EmptyState
          icon={<Database className="w-12 h-12" />}
          title="No Datasets"
          description="Upload your first forensic dataset to get started."
          action={
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              Upload Dataset
            </button>
          }
        />
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Format</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Valid</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Invalid</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((ds) => {
                  const statusConf = datasetStatusConfig[ds.status] || datasetStatusConfig.uploaded;
                  const isActive = ds.id === activeDatasetId;
                  return (
                    <tr key={ds.id} className={cn(
                      'border-b border-[var(--border-color)] transition-colors',
                      isActive ? 'bg-blue-500/5' : 'hover:bg-[var(--bg-card-hover)]'
                    )}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                          <span className="text-slate-300 font-medium">{ds.name}</span>
                          {isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 uppercase font-semibold">Active</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-800/50 text-slate-400 uppercase">{ds.format}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border', (statusConf as any)?.class || (statusConf as any)?.color)}>
                          {String(ds.status).toLowerCase() === 'processing' && <Loader2 className="w-3 h-3 animate-spin" />}
                          {String(ds.status).toLowerCase() === 'processed' && <CheckCircle2 className="w-3 h-3" />}
                          {String(ds.status).toLowerCase() === 'failed' && <AlertTriangle className="w-3 h-3" />}
                          {statusConf?.label || ds.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-slate-300">{((ds as any).total_records ?? ds.records_count ?? 0).toLocaleString()}</td>
                      <td className="px-5 py-3 text-right text-emerald-400">{((ds as any).valid_records ?? ds.valid_tx_count ?? 0).toLocaleString()}</td>
                      <td className="px-5 py-3 text-right text-red-400">{((ds as any).invalid_records ?? ds.anomaly_count ?? 0).toLocaleString()}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">{formatTimestamp((ds as any).created_at ?? ds.uploaded_at)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {String(ds.status).toLowerCase() === 'uploaded' && (
                            <button
                              onClick={() => handleProcess(ds.id)}
                              disabled={processMutation.isPending}
                              className="p-1.5 rounded-md hover:bg-emerald-500/10 text-emerald-400 transition-colors"
                              title="Process"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          {String(ds.status).toLowerCase() === 'processed' && !isActive && (
                            <button
                              onClick={() => setActiveDatasetId(ds.id)}
                              className="p-1.5 rounded-md hover:bg-blue-500/10 text-blue-400 transition-colors"
                              title="Set Active"
                            >
                              <HardDrive className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteConfirm(ds.id)}
                            className="p-1.5 rounded-md hover:bg-red-500/10 text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
