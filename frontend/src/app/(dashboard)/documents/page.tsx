'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Download, Eye, MoreVertical, FileText, ChevronDown, Loader2, Users, Check, CheckSquare, MinusSquare, Trash2, Archive, Upload, X } from 'lucide-react';
import Link from 'next/link';
import { Button, Input, Card, Badge, Table, Skeleton, SkeletonCard, Avatar, Select, Dropdown } from '@/components/ui';
import { getAllDocuments, deleteDocument, batchDeleteDocuments, batchDownloadDocuments } from '@/lib/api';
import type { Document } from '@/types';
import type { Column } from '@/components/ui/Table';
import { formatDate, formatBytes } from '@/lib/utils';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [storageFilter, setStorageFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [selectedDocForDropdown, setSelectedDocForDropdown] = useState<Document | null>(null);

  // Batch operations state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchActionLoading, setBatchActionLoading] = useState<string | null>(null);

  const isAllSelected = documents.length > 0 && selectedIds.size === documents.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < documents.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documents.map(d => d.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Hapus ${selectedIds.size} dokumen yang dipilih? Tindakan ini tidak dapat dibatalkan.`)) return;
    
    setBatchActionLoading('delete');
    try {
      const result = await batchDeleteDocuments(Array.from(selectedIds));
      if (result.deleted.length > 0) {
        toast.success(`${result.deleted.length} dokumen berhasil dihapus`);
        setSelectedIds(new Set());
        fetchDocuments();
      }
      if (result.failed.length > 0) {
        toast.error(`${result.failed.length} dokumen gagal dihapus`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Gagal menghapus dokumen');
    } finally {
      setBatchActionLoading(null);
    }
  };

  const handleBatchDownload = async () => {
    if (selectedIds.size === 0) return;
    
    setBatchActionLoading('download');
    try {
      const blob = await batchDownloadDocuments(Array.from(selectedIds));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medstore-documents-${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Unduhan batch selesai');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Gagal mengunduh dokumen batch');
    } finally {
      setBatchActionLoading(null);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [search, storageFilter, page]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const data = await getAllDocuments({
        q: search || undefined,
        storage_backend: storageFilter === 'all' ? undefined : storageFilter,
        page,
        page_size: 20,
      });
      setDocuments(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Gagal memuat dokumen');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus dokumen ini? Tindakan ini tidak dapat dibatalkan.')) return;
    try {
      await deleteDocument(id);
      toast.success('Dokumen dihapus');
      fetchDocuments();
      setSelectedDocForDropdown(null);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Gagal menghapus dokumen');
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const blob = await fetch(`/api/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
      }).then(r => r.blob());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.title;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Gagal mengunduh dokumen');
    }
  };

  const columns: Column<Document>[] = React.useMemo<Column<Document>[]>(() => [
    {
      key: 'select',
      header: '',
      render: (doc, index) => {
        if (index === 0) {
          return (
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-primary-600 focus:ring-primary-500"
              aria-label="Pilih semua"
            />
          );
        }
        return (
          <input
            type="checkbox"
            checked={selectedIds.has(doc.id)}
            onChange={() => toggleSelect(doc.id)}
            className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-primary-600 focus:ring-primary-500"
            aria-label={`Pilih ${doc.title}`}
          />
        );
      },
      width: '50px',
      align: 'center',
    },
    {
      key: 'document',
      header: 'Dokumen',
      render: (doc) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-neutral-900 dark:text-white truncate max-w-xs">{doc.title}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">v{doc.version} · {doc.mime_type || 'Unknown'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Pasien',
      render: (doc) => doc.patient ? (
        <div className="flex items-center gap-2">
          <Avatar name={doc.patient.full_name} size="sm" variant="primary" />
          <span className="text-sm text-neutral-900 dark:text-white">{doc.patient.full_name}</span>
        </div>
      ) : (
        <span className="text-sm text-neutral-500 dark:text-neutral-400">—</span>
      ),
    },
    {
      key: 'category',
      header: 'Kategori',
      accessor: 'category',
    },
    {
      key: 'size',
      header: 'Ukuran',
      render: (doc) => <span className="text-sm text-neutral-600 dark:text-neutral-400 tabular-nums">{formatBytes(doc.size_bytes)}</span>,
    },
    {
      key: 'storage',
      header: 'Storage',
      render: (doc) => {
        const storageBadges: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline'> = {
          LOCAL: 'success',
          SMB: 'primary',
          TRUENAS: 'warning',
        };
        return (
          <Badge variant={storageBadges[doc.storage_backend || ''] || 'default'} size="sm">
            {doc.storage_backend || '—'}
          </Badge>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (doc) => {
        const statusBadges: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline'> = {
          ACTIVE: 'success',
          ARCHIVED: 'warning',
          DELETED: 'danger',
        };
        return (
          <Badge variant={statusBadges[doc.status || ''] || 'default'} size="sm" className="capitalize">
            {doc.status || '—'}
          </Badge>
        );
      },
    },
    {
      key: 'created',
      header: 'Dibuat',
      render: (doc) => <span className="text-sm text-neutral-500 dark:text-neutral-400">{formatDate(doc.created_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (doc) => (
        <div className="relative">
          <button
            onClick={() => {
              setSelectedDocForDropdown(doc);
              setDropdownOpen(doc.id);
            }}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Opsi"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {dropdownOpen === doc.id && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(null)} />
              <div className="fixed z-50 mt-1.5 min-w-[160px] bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-lg animate-in right-0">
                <div className="py-1">
                  <button
                    onClick={() => {
                      window.open(`/api/documents/${doc.id}/preview`, '_blank');
                      setDropdownOpen(null);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Lihat
                  </button>
                  <button
                    onClick={() => {
                      handleDownload(doc);
                      setDropdownOpen(null);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Unduh
                  </button>
                  <div className="border-t border-neutral-200 dark:border-neutral-700 my-1" />
                  <button
                    onClick={() => {
                      handleDelete(doc.id);
                      setDropdownOpen(null);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2 text-danger-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    Hapus
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ),
      align: 'right',
    },
  ], [selectedIds]);

  if (loading) {
    return (
      <div className="space-y-6 animate-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Dokumen</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Kelola semua dokumen klinis</p>
          </div>
          <Button variant="primary" iconLeft={<Upload className="w-4 h-4" />} disabled>Unggah Dokumen</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <SkeletonCard key={i} className="border-neutral-200 dark:border-neutral-700" />)}
        </div>
      </div>
    );
  }

  const hasFilters = storageFilter !== 'all';

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Dokumen</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Kelola semua dokumen klinis</p>
        </div>
        <Link href="/patients">
          <Button variant="primary" iconLeft={<Upload className="w-4 h-4" />}>
            Pilih Pasien &rarr; Upload
          </Button>
        </Link>
      </div>

      {/* Search & Filter */}
      <Card className="border-neutral-200 dark:border-neutral-700 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 w-5 h-5" />
            <Input
              placeholder="Cari nama file, pasien, tipe..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>
          <Select
            value={storageFilter}
            onChange={(e) => { setStorageFilter(e.target.value); setPage(1); }}
            options={[
              { value: 'all', label: 'Semua Storage' },
              { value: 'LOCAL', label: 'Local' },
              { value: 'SMB', label: 'SMB' },
              { value: 'TRUENAS', label: 'TrueNAS' },
            ]}
            placeholder="Filter Storage"
            className="w-full sm:w-48"
          />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setStorageFilter('all'); setPage(1); }} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">
              <X className="h-4 w-4 mr-1" />
              Hapus Filter
            </Button>
          )}
        </div>
      </Card>

      {/* Batch Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-primary-600" />
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                {selectedIds.size} dokumen dipilih
              </span>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-primary-600 hover:underline"
              >
                Batalkan
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                iconLeft={<Download className="w-4 h-4" />}
                onClick={handleBatchDownload}
                loading={batchActionLoading === 'download'}
              >
                Unduh ZIP
              </Button>
              <Button
                variant="danger"
                size="sm"
                iconLeft={<Trash2 className="w-4 h-4" />}
                onClick={handleBatchDelete}
                loading={batchActionLoading === 'delete'}
              >
                Hapus
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Documents Table */}
      <Card className="border-neutral-200 dark:border-neutral-700 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm overflow-hidden">
        <Table
          columns={columns}
          data={documents}
          keyExtractor={doc => doc.id}
          loading={loading}
          emptyMessage={documents.length === 0 ? 'Tidak ada dokumen ditemukan' : undefined}
        />
      </Card>

      {documents.length === 0 && !loading && (
        <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Tidak ada dokumen yang cocok dengan filter</p>
        </div>
      )}
    </div>
  );
}