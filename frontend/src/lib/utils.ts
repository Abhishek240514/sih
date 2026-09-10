import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { RiskLevel } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const BTC_USD_RATE = 64280.5;

export function formatBTC(amount: number | null | undefined, precision = 4): string {
  if (amount == null || isNaN(amount)) return '0.0000 BTC';
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })} BTC`;
}

export function formatUSD(amountBtc: number | null | undefined, rate = BTC_USD_RATE): string {
  if (amountBtc == null || isNaN(amountBtc)) return '$0.00';
  const usd = amountBtc * rate;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(usd);
}

export function formatCurrency(usdAmount: number | null | undefined): string {
  if (usdAmount == null || isNaN(usdAmount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(usdAmount);
}

export function formatNumber(num: number | null | undefined): string {
  if (num == null || isNaN(num)) return '0';
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatSatoshis(sats: number | null | undefined): string {
  if (sats == null || isNaN(sats)) return '0 sats';
  return `${new Intl.NumberFormat('en-US').format(sats)} sats`;
}

export function truncateAddress(address: string | null | undefined, lead = 8, tail = 6): string {
  if (!address) return '';
  if (address.length <= lead + tail) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

export function truncateTxid(txid: string | null | undefined, lead = 10, tail = 8): string {
  if (!txid) return '';
  if (txid.length <= lead + tail) return txid;
  return `${txid.slice(0, lead)}…${txid.slice(-tail)}`;
}

export function formatTimestamp(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  } catch {
    return dateStr;
  }
}

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return dateStr;
  }
}

export function formatRiskScore(score: number | null | undefined): string {
  if (score == null || isNaN(score)) return '0/100';
  return `${Math.round(score)}/100`;
}

export function getRiskColor(level: RiskLevel | string): string {
  switch (level?.toUpperCase()) {
    case 'CRITICAL':
      return '#DC2626';
    case 'HIGH':
      return '#EA580C';
    case 'MEDIUM':
      return '#D97706';
    case 'LOW':
      return '#16A34A';
    case 'BENIGN':
    default:
      return '#64748B';
  }
}

export function getRiskBgColor(level: RiskLevel | string): string {
  switch (level?.toUpperCase()) {
    case 'CRITICAL':
      return 'bg-red-950/40 border-red-800/60 text-red-300';
    case 'HIGH':
      return 'bg-amber-950/40 border-amber-800/60 text-amber-300';
    case 'MEDIUM':
      return 'bg-yellow-950/40 border-yellow-800/60 text-yellow-300';
    case 'LOW':
      return 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300';
    case 'BENIGN':
    default:
      return 'bg-slate-800/40 border-slate-700/60 text-slate-300';
  }
}

export function getRiskLevelColor(level: RiskLevel | string): string {
  return getRiskColor(level);
}

export function getRiskLevelIcon(level: RiskLevel | string): string {
  switch (level?.toUpperCase()) {
    case 'CRITICAL':
      return '🚨';
    case 'HIGH':
      return '⚠️';
    case 'MEDIUM':
      return '🟡';
    case 'LOW':
      return '🟢';
    default:
      return '⚪';
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const csvContent = [
    headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map(row =>
      row.map(val => (val == null ? '""' : `"${String(val).replace(/"/g, '""')}"`)).join(',')
    ),
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function toCSV<T extends Record<string, any>>(data: T[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => headers.map(header => JSON.stringify(obj[header] ?? '')).join(','));
  return [headers.join(','), ...rows].join('\n');
}

export function downloadFile(content: string, filename: string, type = 'text/csv'): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const datasetStatusConfig: Record<string, { label: string; class: string }> = {
  READY: { label: 'Ready', class: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50' },
  PARSING: { label: 'Parsing', class: 'text-blue-400 bg-blue-950/40 border-blue-800/50' },
  ERROR: { label: 'Failed', class: 'text-red-400 bg-red-950/40 border-red-800/50' },
  UNPROCESSED: { label: 'Pending', class: 'text-slate-400 bg-slate-800/40 border-slate-700/50' },
};

export const evidenceTypeConfig: Record<string, { label: string; class: string }> = {
  observed: { label: 'Direct Observed', class: 'text-blue-400 border-blue-800/50 bg-blue-950/30' },
  heuristic: { label: 'Heuristic Match', class: 'text-amber-400 border-amber-800/50 bg-amber-950/30' },
  model_derived: { label: 'Cluster Inferred', class: 'text-purple-400 border-purple-800/50 bg-purple-950/30' },
  correlation: { label: 'IP/Net Correlation', class: 'text-emerald-400 border-emerald-800/50 bg-emerald-950/30' },
};
