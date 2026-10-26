'use client';

import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { ScrollText, Filter, RefreshCw, FileSpreadsheet, Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { getAuditLogs, exportAuditCsv, getPatients } from '@/lib/api';
import type { AuditLog, Patient } from '@/types';
import { Button, Input, Select, Card, Badge, Table, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

const ACTIONS = [
  { value: '', label: 'Semua Aksi' },
  { value: 'LOGIN_SUCCESS', label: 'LOGIN_SUCCESS' },
  { value: 'LOGIN_FAILED', label: 'LOGIN_FAILED' },
  { value: 'LOGIN_FAILED_MFA', label: 'LOGIN_FAILED_MFA' },
  { value: 'LOGOUT', label: 'LOGOUT' },
  { value: 'PATIENT_CREATED', label: 'PATIENT_CREATED' },
  { value: 'PATIENT_VIEWED', label: 'PATIENT_VIEWED' },
  { value: 'PATIENT_UPDATED', label: 'PATIENT_UPDATED' },
  { value: 'DOCUMENT_UPLOAD', label: 'DOCUMENT_UPLOAD' },
  { value: 'DOCUMENT_DOWNLOAD', label: 'DOCUMENT_DOWNLOAD' },
  { value: 'DOCUMENT_PREVIEW', label: 'DOCUMENT_PREVIEW' },
  { value: 'DOCUMENT_DELETE', label: 'DOCUMENT_DELETE' },
];

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [patientQuery, setPatientQuery] = useState('');
  const [patientOptions, setPatientOptions] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [filters, setFilters] = useState({
    action: '',
    date_from: '',
    date_to: '',
  });
  const [sortBy, setSortBy] = useState<string>('event_time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadLogs();
  }, [page, filters, selectedPatient, sortBy, sortOrder]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await getAuditLogs({
        page,
        page_size: 20,
        action: filters.action || undefined,
        date_from: filters.date_from ? new Date(filters.date_from).toISOString() : undefined,
        date_to: filters.date_to ? new Date(filters.date_to + 'T23:59:59').toISOString() : undefined,
        patient_id: selectedPatient?.id,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setLogs(res.items);
      setTotal(res.total);
    } catch (err) {
      toast.error('Gagal memuat audit log');
    } finally {
      setLoading(false);
    }
  };

  const searchPatients = async (q: string) => {
    setPatientQuery(q);
    if (q.trim().length < 3) {
      setPatientOptions([]);
      return;
    }
    try {
      const res = await getPatients({ search: q, page_size: 5 });
      setPatientOptions(res.items);
    } catch {
      setPatientOptions([]);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportAuditCsv({
        action: filters.action || undefined,
        date_from: filters.date_from ? new Date(filters.date_from).toISOString() : undefined,
        date_to: filters.date_to ? new Date(filters.date_to + 'T23:59:59').toISOString() : undefined,
        patient_id: selectedPatient?.id,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-medstore-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Audit log berhasil diekspor');
    } catch {
      toast.error('Gagal mengekspor audit log');
    } finally {
      setExporting(false);
    }
  };

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  const resultVariant = (result: string) => {
    if (result === 'SUCCESS') return 'success' as const;
    if (result === 'DENIED') return 'danger' as const;
    return 'warning' as const;
  };

  const formatServerTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).replace(/\./g, ':');
  };

  const columns = useMemo(() => [
    {
      key: 'timestamp',
      header: 'Waktu (Server)',
      width: '200px',
      sortable: true,
      render: (l: AuditLog) => (
        <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400" title={l.timestamp}>
          {formatServerTime(l.timestamp)}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'Pengguna',
      width: '220px',
      sortable: true,
      render: (l: AuditLog) => (
        <div className="text-xs">
          <span className="font-medium text-neutral-900 dark:text-white">{l.user_full_name || l.user_email || '-'}</span>
          {l.user_email && l.user_full_name && l.user_email !== l.user_full_name && (
            <span className="text-neutral-500 dark:text-neutral-400 ml-1">({l.user_email})</span>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Aksi',
      width: '200px',
      sortable: true,
      render: (l: AuditLog) => (
        <span className="font-mono text-xs font-semibold text-neutral-700 dark:text-neutral-300 px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300">
          {l.action}
        </span>
      ),
    },
    {
      key: 'result',
      header: 'Hasil',
      width: '100px',
      sortable: true,
      render: (l: AuditLog) => (
        <Badge variant={resultVariant(l.result)} size="sm" dot>
          {l.result}
        </Badge>
      ),
    },
    {
      key: 'patient',
      header: 'Pasien',
      width: '150px',
      render: (l: AuditLog) =>
        l.patient_name ? (
          <span className="text-xs text-neutral-700 dark:text-neutral-300" title={l.patient_name}>
            {l.patient_name}
          </span>
        ) : l.patient_id ? (
          <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">{l.patient_id.substring(0, 8)}…</span>
        ) : (
          <span className="text-xs text-neutral-400 dark:text-neutral-500">-</span>
        ),
    },
    {
      key: 'detail',
      header: 'Detail',
      sortable: true,
      render: (l: AuditLog) => (
        <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-[280px] inline-block" title={l.details || ''}>
          {l.details || '-'}
        </span>
      ),
    },
  ], []);

  const hasFilters = filters.action || filters.date_from || filters.date_to || selectedPatient;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-primary-600" />
            Audit Log Akses
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Log append-only — tidak dapat diubah atau dihapus (UU PDP & Permenkes 24/2022).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadLogs} loading={loading} iconLeft={<RefreshCw className="w-4 h-4" />}>
            Muat Ulang
          </Button>
          <Button variant="primary" onClick={handleExport} loading={exporting} iconLeft={<FileSpreadsheet className="w-4 h-4" />}>
            Ekspor CSV
          </Button>
        </div>
      </div>

      {/* Filter Panel - Modern */}
      <Card className="border-neutral-200 dark:border-neutral-700 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            <Filter className="w-4 h-4 text-primary-600" />
            Filter Log
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setFilters({ action: '', date_from: '', date_to: '' }); setSelectedPatient(null); setPatientQuery(''); setPage(1); }} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
              <X className="h-4 w-4 mr-1" />
              Hapus Semua Filter
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Input
              label="Pasien (No. RM / Nama)"
              placeholder="Ketik minimal 3 karakter..."
              value={selectedPatient ? `${selectedPatient.medical_record_number} — ${selectedPatient.full_name}` : patientQuery}
              onChange={(e) => {
                setSelectedPatient(null);
                searchPatients(e.target.value);
              }}
              iconLeft={<Search className="h-4 w-4 text-neutral-400" />}
            />
            {patientOptions.length > 0 && !selectedPatient && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {patientOptions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedPatient(p);
                      setPatientOptions([]);
                      setPage(1);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-primary-50 dark:hover:bg-primary-900/20 border-b border-neutral-100 dark:border-neutral-800 last:border-0"
                  >
                    <span className="font-mono font-semibold text-primary-700 dark:text-primary-300">{p.medical_record_number}</span>
                    <span className="ml-2 text-neutral-700 dark:text-neutral-300">{p.full_name}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedPatient && (
              <button
                type="button"
                onClick={() => {
                  setSelectedPatient(null);
                  setPatientQuery('');
                  setPage(1);
                }}
                className="mt-1 text-xs text-danger-600 hover:underline flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Hapus filter pasien
              </button>
            )}
          </div>

          <Select
            label="Tipe Aksi"
            value={filters.action}
            onChange={(e) => { setFilters(prev => ({ ...prev, action: e.target.value })); setPage(1); }}
            options={ACTIONS}
            className="w-full"
          />

          <Input
            label="Dari Tanggal"
            type="date"
            value={filters.date_from}
            onChange={(e) => { setFilters(prev => ({ ...prev, date_from: e.target.value })); setPage(1); }}
            className="w-full"
          />

          <Input
            label="Sampai Tanggal"
            type="date"
            value={filters.date_to}
            onChange={(e) => { setFilters(prev => ({ ...prev, date_to: e.target.value })); setPage(1); }}
            className="w-full"
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="border-neutral-200 dark:border-neutral-700 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm overflow-hidden">
        <Table
          columns={columns}
          data={logs}
          loading={loading}
          keyExtractor={(l) => l.id}
          pagination={{
            page: page,
            pageSize: 20,
            total: total,
            onPageChange: setPage,
            onPageSizeChange: (size) => {},
          }}
          sortColumn={sortBy}
          sortDirection={sortOrder}
          onSort={handleSort}
          emptyMessage="Tidak ada log yang sesuai filter."
          striped
          hoverable
          compact
        />
      </Card>
    </div>
  );
}