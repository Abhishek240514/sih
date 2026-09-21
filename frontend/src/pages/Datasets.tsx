import { useState, useRef, useCallback } from 'react';
import { useDatasets, useUploadDataset, useProcessDataset, useDeleteDataset } from '@/hooks/useDatasets';
import { useDataset } from '@/context/DatasetContext';
import { TableSkeleton } from '@/components/shared/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { formatTimestamp } from '@/lib/utils';
import {
  Upload, Trash2, Play, X, Database, FileText,
  AlertTriangle, CheckCircle2, Loader2, HardDrive, CloudUpload,
} from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  uploaded: { label: 'Uploaded', color: '#3b7cf9', bg: 'rgba(59,124,249,0.1)', border: 'rgba(59,124,249,0.2)' },
  processing: { label: 'Processing', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
  processed: { label: 'Processed', color: '#10d98a', bg: 'rgba(16,217,138,0.1)', border: 'rgba(16,217,138,0.2)' },
  failed: { label: 'Failed', color: '#ff3d55', bg: 'rgba(255,61,85,0.1)', border: 'rgba(255,61,85,0.2)' },
  READY: { label: 'Ready', color: '#10d98a', bg: 'rgba(16,217,138,0.1)', border: 'rgba(16,217,138,0.2)' },
};

function getStatusConf(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG[status.toLowerCase()] || {
    label: status,
    color: 'var(--text-muted)',
    bg: 'rgba(99,155,255,0.07)',
    border: 'var(--border-color)',
  };
}

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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [uploadName],
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Datasets</h1>
          <p className="page-subtitle">Upload and manage Bitcoin forensic datasets</p>
        </div>
        <button className="btn-primary" onClick={() => setShowUpload(true)}>
          <Upload style={{ width: 14, height: 14 }} />
          Upload Dataset
        </button>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="modal-backdrop" onClick={() => setShowUpload(false)}>
          <div
            className="glass-card animate-fade-in"
            style={{ width: '100%', maxWidth: 480, padding: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Upload Dataset
                </h2>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                  Import forensic data for analysis
                </p>
              </div>
              <button className="btn-icon" onClick={() => setShowUpload(false)}>
                <X style={{ width: 15, height: 15 }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Dataset Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., BTC Transactions Q4 2024"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  File
                </label>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? 'rgba(59, 124, 249, 0.5)' : 'rgba(99, 155, 255, 0.15)'}`,
                    borderRadius: 12,
                    padding: '32px 24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: dragOver ? 'rgba(59, 124, 249, 0.05)' : 'rgba(99, 155, 255, 0.02)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <CloudUpload
                    style={{ width: 36, height: 36, color: dragOver ? 'var(--accent-blue)' : 'var(--text-muted)', margin: '0 auto 12px' }}
                  />
                  <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 500 }}>
                    {uploadMutation.isPending ? 'Uploading...' : 'Drop file here or click to browse'}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Supports CSV, JSON, XML
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json,.xml"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                </div>
              </div>

              {uploadMutation.isPending && (
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'rgba(59, 124, 249, 0.08)',
                    border: '1px solid rgba(59, 124, 249, 0.15)',
                  }}
                >
                  <Loader2 style={{ width: 15, height: 15, color: 'var(--accent-blue)', animation: 'spin 1s linear infinite' }} />
                  <span style={{ fontSize: 13, color: 'var(--accent-blue)', fontWeight: 500 }}>
                    Uploading dataset...
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div
            className="glass-card animate-fade-in"
            style={{ width: '100%', maxWidth: 380, padding: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,61,85,0.1)', border: '1px solid rgba(255,61,85,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle style={{ width: 22, height: 22, color: '#ff3d55' }} />
              </div>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Delete Dataset</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>This cannot be undone</p>
              </div>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 22, lineHeight: 1.6 }}>
              All associated wallets, transactions, alerts, and graph data will be permanently deleted.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <><Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} /> Deleting...</>
                ) : (
                  <><Trash2 style={{ width: 14, height: 14 }} /> Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Datasets Table */}
      {datasetsQuery.isLoading ? (
        <div className="glass-card" style={{ padding: 20 }}>
          <TableSkeleton rows={5} cols={7} />
        </div>
      ) : datasetsQuery.isError ? (
        <ErrorState message="Failed to load datasets" onRetry={() => datasetsQuery.refetch()} />
      ) : datasets.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={<Database style={{ width: 30, height: 30 }} />}
            title="No Datasets"
            description="Upload your first forensic dataset to begin analysis."
            action={
              <button className="btn-primary" onClick={() => setShowUpload(true)}>
                <Upload style={{ width: 14, height: 14 }} />
                Upload Dataset
              </button>
            }
          />
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Format</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Total Records</th>
                  <th style={{ textAlign: 'right' }}>Valid</th>
                  <th style={{ textAlign: 'right' }}>Invalid</th>
                  <th>Created</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((ds: any) => {
                  const statusStr = String(ds.status).toLowerCase();
                  const conf = getStatusConf(statusStr) || getStatusConf(ds.status);
                  const isActive = ds.id === activeDatasetId;

                  return (
                    <tr key={ds.id} style={isActive ? { background: 'rgba(59, 124, 249, 0.04)' } : {}}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,155,255,0.08)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <FileText style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
                          </div>
                          <div>
                            <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 13.5 }}>{ds.name}</p>
                            {isActive && (
                              <span style={{ fontSize: 9.5, padding: '1px 7px', borderRadius: 999, background: 'rgba(59,124,249,0.15)', color: 'var(--accent-blue)', fontWeight: 700, letterSpacing: '0.08em' }}>
                                ACTIVE
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'rgba(99,155,255,0.08)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          {ds.format}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: conf.bg, color: conf.color, border: `1px solid ${conf.border}` }}>
                          {statusStr === 'processing' && <Loader2 style={{ width: 11, height: 11, animation: 'spin 1s linear infinite' }} />}
                          {statusStr === 'processed' || ds.status === 'READY' ? <CheckCircle2 style={{ width: 11, height: 11 }} /> : null}
                          {statusStr === 'failed' && <AlertTriangle style={{ width: 11, height: 11 }} />}
                          {conf.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-secondary)', fontSize: 13 }}>
                        {((ds as any).total_records ?? ds.records_count ?? 0).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', color: '#10d98a', fontSize: 13, fontWeight: 600 }}>
                        {((ds as any).valid_records ?? ds.valid_tx_count ?? 0).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'right', color: '#ff3d55', fontSize: 13, fontWeight: 600 }}>
                        {((ds as any).invalid_records ?? ds.anomaly_count ?? 0).toLocaleString()}
                      </td>
                      <td style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                        {formatTimestamp((ds as any).created_at ?? ds.uploaded_at)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                          {statusStr === 'uploaded' && (
                            <button
                              onClick={() => handleProcess(ds.id)}
                              disabled={processMutation.isPending}
                              className="btn-icon"
                              title="Process Dataset"
                              style={{ color: '#10d98a', borderColor: 'rgba(16,217,138,0.2)', background: 'rgba(16,217,138,0.06)' }}
                            >
                              <Play style={{ width: 13, height: 13 }} />
                            </button>
                          )}
                          {(statusStr === 'processed' || ds.status === 'READY') && !isActive && (
                            <button
                              onClick={() => setActiveDatasetId(ds.id)}
                              className="btn-icon"
                              title="Set as Active"
                              style={{ color: 'var(--accent-blue)', borderColor: 'rgba(59,124,249,0.2)', background: 'rgba(59,124,249,0.07)' }}
                            >
                              <HardDrive style={{ width: 13, height: 13 }} />
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteConfirm(ds.id)}
                            className="btn-icon"
                            title="Delete"
                            style={{ color: '#ff3d55', borderColor: 'rgba(255,61,85,0.2)', background: 'rgba(255,61,85,0.06)' }}
                          >
                            <Trash2 style={{ width: 13, height: 13 }} />
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
