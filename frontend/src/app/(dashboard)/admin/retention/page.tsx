'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Clock,
  Archive,
  CheckCircle,
  FileText,
  Download,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { getRetentionDashboard } from '@/lib/api';
import { Button, Card, Badge, Table, Dropdown, Skeleton, Avatar } from '@/components/ui';
import { formatDate, formatBytes, formatRelativeTime } from '@/lib/utils';

interface RetentionItem {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_mrn: string;
  title: string;
  category: string;
  retention_expires_at: string;
  days_until_expiry: number;
  storage_backend: string;
  file_size_bytes: number;
}

interface RetentionDashboardData {
  expiring_soon: RetentionItem[];
  expiring_later: RetentionItem[];
  expired: RetentionItem[];
  total_expiring_soon: number;
  total_expiring_later: number;
  total_expired: number;
}

type TabType = 'expiring_soon' | 'expiring_later' | 'expired';

const TAB_CONFIG: Record<TabType, { label: string; icon: React.ReactNode; color: string }> = {
  expiring_soon: {
    label: 'Segera Berakhir (≤30 hari)',
    icon: <Clock className="w-4 h-4" />,
    color: 'warning',
  },
  expiring_later: {
    label: 'Akan Berakhir (31-365 hari)',
    icon: <Archive className="w-4 h-4" />,
    color: 'primary',
  },
  expired: {
    label: 'Sudah Berakhir',
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'danger',
  },
};

export default function RetentionDashboardPage() {
  const [data, setData] = useState<RetentionDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('expiring_soon');
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<RetentionItem | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getRetentionDashboard();
      setData(result);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Gagal memuat dashboard retensi');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentItems = (): RetentionItem[] => {
    if (!data) return [];
    return data[activeTab] || [];
  };

  const handleDownload = async (item: RetentionItem) => {
    try {
      const blob = await fetch(`/api/documents/${item.id}/download`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('medstore-auth') ? JSON.parse(localStorage.getItem('medstore-auth')!).state.token : ''}` }
      }).then(r => r.blob());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.title;
      a.click();
      URL.revokeObjectURL(url);
      setDropdownOpen(null);
    } catch {
      toast.error('Gagal mengunduh dokumen');
    }
  };

  const handlePreview = (item: RetentionItem) => {
    window.open(`/api/documents/${item.id}/preview`, '_blank');
    setDropdownOpen(null);
  };

  const columns = React.useMemo(() => [
    {
      key: 'document',
      header: 'Dokumen',
      render: (item: RetentionItem) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-neutral-900 dark:text-white truncate max-w-xs">{item.title}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.category}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'patient',
      header: 'Pasien',
      render: (item: RetentionItem) => (
        <div className="flex items-center gap-2">
          <Avatar name={item.patient_name} size="sm" variant="primary" />
          <div>
            <p className="text-sm font-medium text-neutral-900 dark:text-white">{item.patient_name}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">{item.patient_mrn}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'expires',
      header: 'Tanggal Berakhir',
      render: (item: RetentionItem) => {
        const isExpired = item.days_until_expiry < 0;
        const isSoon = item.days_until_expiry <= 30 && item.days_until_expiry >= 0;
        return (
          <div>
            <p className={clsx(
              'font-medium',
              isExpired && 'text-danger-600',
              isSoon && !isExpired && 'text-warning-600',
              !isExpired && !isSoon && 'text-neutral-700'
            )}>
              {formatDate(item.retention_expires_at)}
            </p>
            <p className={clsx(
              'text-xs font-mono',
              isExpired && 'text-danger-600',
              isSoon && !isExpired && 'text-warning-600',
              !isExpired && !isSoon && 'text-neutral-500'
            )}>
              {isExpired 
                ? `Terlewat ${Math.abs(item.days_until_expiry)} hari` 
                : `${item.days_until_expiry} hari lagi`}
            </p>
          </div>
        );
      },
    },
    {
      key: 'storage',
      header: 'Storage',
      render: (item: RetentionItem) => {
        const storageBadges: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'outline'> = {
          LOCAL: 'success',
          SMB: 'primary',
          TRUENAS: 'warning',
        };
        return (
          <Badge variant={storageBadges[item.storage_backend] || 'default'} size="sm">
            {item.storage_backend}
          </Badge>
        );
      },
    },
    {
      key: 'size',
      header: 'Ukuran',
      render: (item: RetentionItem) => (
        <span className="text-sm text-neutral-700 dark:text-neutral-300 font-mono tabular-nums">
          {formatBytes(item.file_size_bytes)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      render: (item: RetentionItem) => (
        <div className="relative">
          <button
            onClick={() => {
              setSelectedItem(item);
              setDropdownOpen(item.id);
            }}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Opsi"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
          {dropdownOpen === item.id && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(null)} />
              <div className="fixed z-50 mt-1.5 min-w-[180px] bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-lg animate-in right-0">
                <div className="py-1">
                  <button
                    onClick={() => handlePreview(item)}
                    className="w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Preview
                  </button>
                  <button
                    onClick={() => handleDownload(item)}
                    className="w-full px-3 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Unduh
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ),
      align: 'right' as const,
    },
  ], [activeTab]);

  const clsx = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

  if (loading) {
    return (
      <div className="space-y-6 animate-in">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Dashboard Retensi Dokumen</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Pantau dokumen yang mendekati atau melewati batas retensi</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i} variant="default" padding="lg" className="border-neutral-200 animate-pulse">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-12 w-16 mt-4" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Dashboard Retensi Dokumen</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Pantau dokumen yang mendekati atau melewati batas retensi sesuai kebijakan per kategori
          </p>
        </div>
        <Button variant="secondary" iconLeft={<Download className="w-4 h-4" />} onClick={() => {}}>
          Ekspor Laporan CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card variant="default" padding="lg" className="border-warning-200 bg-warning-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-warning-100 flex items-center justify-center text-warning-600">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-warning-700">{data?.total_expiring_soon || 0}</p>
              <p className="text-sm text-warning-600">Segera Berakhir (≤30 hari)</p>
            </div>
          </div>
        </Card>
        <Card variant="default" padding="lg" className="border-primary-200 bg-primary-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-700">{data?.total_expiring_later || 0}</p>
              <p className="text-sm text-primary-600">Akan Berakhir (31-365 hari)</p>
            </div>
          </div>
        </Card>
        <Card variant="default" padding="lg" className="border-danger-200 bg-danger-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-danger-100 flex items-center justify-center text-danger-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-danger-700">{data?.total_expired || 0}</p>
              <p className="text-sm text-danger-600">Sudah Berakhir</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-neutral-200">
        {(Object.keys(TAB_CONFIG) as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === tab
                ? `border-${TAB_CONFIG[tab].color}-500 text-${TAB_CONFIG[tab].color}-600`
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            {TAB_CONFIG[tab].icon}
            {TAB_CONFIG[tab].label}
            <Badge
              variant={activeTab === tab ? TAB_CONFIG[tab].color as any : 'outline'}
              size="sm"
              className="ml-2"
            >
              {data?.[tab]?.length || 0}
            </Badge>
          </button>
        ))}
      </div>

      {/* Table */}
      <Card variant="default" padding="none" className="border-neutral-200 overflow-hidden">
        <Table
          columns={columns}
          data={getCurrentItems()}
          loading={false}
          keyExtractor={(item) => item.id}
          emptyMessage={
            activeTab === 'expired'
              ? 'Tidak ada dokumen yang sudah melewati batas retensi. 🎉'
              : activeTab === 'expiring_soon'
              ? 'Tidak ada dokumen yang akan berakhir dalam 30 hari ke depan.'
              : 'Tidak ada dokumen yang akan berakhir dalam 31-365 hari ke depan.'
          }
          striped
          hoverable
        />
      </Card>

      {getCurrentItems().length === 0 && !loading && (
        <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium text-neutral-900 mb-1">
            {activeTab === 'expired' ? 'Semua dokumen masih dalam masa retensi' : 'Tidak ada dokumen di kategori ini'}
          </p>
        </div>
      )}
    </div>
  );
}