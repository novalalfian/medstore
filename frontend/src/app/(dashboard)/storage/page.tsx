'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getStorageStatus, createSnapshot } from '@/lib/api';
import type { StorageStatus } from '@/types';
import { Button, Card, Badge, Progress, Table, Skeleton, Modal, Select, Input } from '@/components/ui';
import { formatBytes, formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface DiskInfo {
  name: string;
  serial: string;
  model: string;
  capacity: string;
  temperature: number;
  health: number;
  status: 'online' | 'degraded' | 'offline';
  isParity?: boolean;
  activity?: boolean;
}

const mockDisks: DiskInfo[] = [
  { name: 'da0', serial: '22F0A019XCL8', model: 'Kioxia KCM61RUL 9.6TB', capacity: '9.6TB', temperature: 32, health: 99, status: 'online', activity: true },
  { name: 'da1', serial: '22F0A019XCK4', model: 'Kioxia KCM61RUL 9.6TB', capacity: '9.6TB', temperature: 33, health: 98, status: 'online', activity: false },
  { name: 'da2', serial: '22F0A019XC92', model: 'Kioxia KCM61RUL 9.6TB', capacity: '9.6TB', temperature: 34, health: 98, status: 'online', activity: true },
  { name: 'da3', serial: '22F0A019XBM1', model: 'Kioxia KCM61RUL 9.6TB', capacity: '9.6TB', temperature: 32, health: 99, status: 'online', activity: true },
  { name: 'da4', serial: '22F0A019XB07', model: 'Kioxia KCM61RUL 9.6TB', capacity: '9.6TB', temperature: 35, health: 98, status: 'online', activity: false },
  { name: 'da5', serial: '22F0A019XA44', model: 'Kioxia KCM61RUL 9.6TB', capacity: '9.6TB', temperature: 33, health: 99, status: 'online', activity: true },
  { name: 'da6', serial: '22F0A019XZ91', model: 'Kioxia KCM61RUL 9.6TB', capacity: '9.6TB', temperature: 34, health: 98, status: 'online', isParity: true, activity: false },
  { name: 'da7', serial: '22F0A019XW50', model: 'Kioxia KCM61RUL 9.6TB', capacity: '9.6TB', temperature: 32, health: 98, status: 'online', isParity: true, activity: true },
];

const mockDatasets = [
  { path: '/mnt/tank/dicom-imaging', name: 'dicom-imaging', used: '28.4 TB', quota: '40.0 TB', percent: 71, color: 'primary' },
  { path: '/mnt/tank/lab-reports', name: 'lab-reports', used: '11.2 TB', quota: '15.0 TB', percent: 74.6, color: 'tertiary' },
  { path: '/mnt/tank/emr-records', name: 'emr-records', used: '6.8 TB', quota: '10.0 TB', percent: 68, color: 'outline' },
  { path: '/mnt/tank/system-snapshots', name: 'system-snapshots', used: '2.2 TB', quota: 'Dinamis', percent: 22, color: 'outline', noQuota: true },
];

const mockSnapshots = [
  { name: 'auto-dicom-monthly-2024-11-01_00-00', dataset: 'tank/dicom-imaging', delta: '412.5 GB', referenced: '27.8 TB', created: '01 Nov 2024 00:00:02', policy: 'Monthly / 10 Thn Medis', offsite: 'Wasabi S3', syncStatus: 'synced' },
  { name: 'auto-emr-daily-2024-11-15_02-00', dataset: 'tank/emr-records', delta: '18.4 GB', referenced: '6.7 TB', created: '15 Nov 2024 02:00:15', policy: 'Daily / 30 Hari', offsite: 'B2 Backup', syncStatus: 'synced' },
  { name: 'auto-lab-daily-2024-11-15_03-00', dataset: 'tank/lab-reports', delta: '44.2 GB', referenced: '11.1 TB', created: '15 Nov 2024 03:00:09', policy: 'Daily / 30 Hari', offsite: 'Wasabi S3', syncStatus: 'synced' },
  { name: 'manual-pre-mri-update-2024-11-15_09-15', dataset: 'tank/dicom-imaging', delta: '2.1 GB', referenced: '28.3 TB', created: '15 Nov 2024 09:15:44', policy: 'Manual Admin / Ad-Hoc', offsite: 'Syncing...', syncStatus: 'syncing' },
  { name: 'auto-hourly-snapshot-2024-11-15_14-00', dataset: 'tank/system-snapshots', delta: '850 MB', referenced: '2.2 TB', created: '15 Nov 2024 14:00:00', policy: 'Hourly / 24 Jam', offsite: 'Local Only', syncStatus: 'local' },
];

export default function StoragePage() {
  const router = useRouter();
  const [data, setData] = useState<StorageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'disks' | 'datasets' | 'snapshots' | 'cloudsync'>('overview');
  const [snapshotFilter, setSnapshotFilter] = useState('');
  const [snapshotPolicyFilter, setSnapshotPolicyFilter] = useState('');

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await getStorageStatus();
      setData(res);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Gagal memuat status storage');
    } finally {
      setLoading(false);
    }
  };

  const handleSnapshot = async () => {
    setCreating(true);
    try {
      await createSnapshot();
      toast.success('Snapshot manual berhasil dibuat');
      loadStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Gagal membuat snapshot');
    } finally {
      setCreating(false);
    }
  };

  const pool = data?.pools?.[0];
  const usedPercent = pool ? Math.round((pool.used_bytes / pool.total_bytes) * 100) : 67.5;

  return (
    <div className="p-gutter-desktop flex flex-col gap-space-lg max-w-[1720px] mx-auto">
      {/* Sub-Header & Live Telemetry */}
      <div className="px-gutter-desktop py-space-md bg-surface-container-low flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-secondary text-[22px]">dns</span>
            <h1 className="font-headline-sm text-headline-sm text-on-surface tracking-tight">
              Infrastruktur Storage TrueNAS Enterprise
            </h1>
            <span className="px-2 py-0.5 rounded bg-secondary-container/20 text-secondary font-code-xs text-code-xs font-semibold uppercase tracking-wider">
              Production Cluster
            </span>
          </div>
          <div className="flex items-center gap-space-sm mt-1">
            <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
            <p className="font-code-xs text-code-xs text-on-surface-variant">
              Connected to TrueNAS API v2.0 • IP: 10.18.143.43 • Uptime: 148 Hari 14 Jam • Pool:{' '}
              <span className="text-tertiary">medstore-pool</span>
            </p>
          </div>
        </div>
        {/* Quick Action Bar */}
        <div className="flex items-center gap-space-xs flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<span className="material-symbols-outlined text-[16px] text-tertiary">cleaning_services</span>}
            onClick={() => alert('Inisiasi ZFS Scrub Pool medstore-pool...')}
          >
            Scrub Pool
          </Button>
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<span className="material-symbols-outlined text-[16px] text-on-surface-variant">cloud_sync</span>}
            onClick={() => alert('Membuka wizard konfigurasi replikasi Wasabi/B2...')}
          >
            Replikasi Offsite
          </Button>
          <Button
            variant="primary"
            size="sm"
            iconLeft={<span className="material-symbols-outlined text-[16px]">add_a_photo</span>}
            onClick={handleSnapshot}
            loading={creating}
          >
            Ambil Snapshot Manual
          </Button>
        </div>
      </div>

      {/* Sub-Navigation Navigation Tabs */}
      <div className="px-gutter-desktop bg-surface-container-low flex items-center gap-space-md overflow-x-auto shadow-sm">
        <Button
          variant={activeTab === 'overview' ? 'primary' : 'ghost'}
          size="sm"
          className="py-space-sm font-label-md text-label-md flex items-center gap-1.5 bg-surface-container-high/40 px-3 rounded-t-lg"
          onClick={() => setActiveTab('overview')}
        >
          <span className="material-symbols-outlined text-[16px]">monitor_heart</span>
          <span>Overview & Health</span>
        </Button>
        <Button
          variant={activeTab === 'snapshots' ? 'primary' : 'ghost'}
          size="sm"
          className="py-space-sm font-label-md text-label-md flex items-center gap-1.5 px-3"
          onClick={() => setActiveTab('snapshots')}
        >
          <span className="material-symbols-outlined text-[16px]">history</span>
          <span>ZFS Snapshots</span>
          <span className="px-1.5 py-0.2 rounded bg-surface-container-highest font-code-xs text-code-xs text-on-surface-variant">1.480</span>
        </Button>
        <Button
          variant={activeTab === 'cloudsync' ? 'primary' : 'ghost'}
          size="sm"
          className="py-space-sm font-label-md text-label-md flex items-center gap-1.5 px-3"
          onClick={() => setActiveTab('cloudsync')}
        >
          <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
          <span>CloudSync & S3 Backup</span>
        </Button>
        <Button
          variant={activeTab === 'disks' ? 'primary' : 'ghost'}
          size="sm"
          className="py-space-sm font-label-md text-label-md flex items-center gap-1.5 px-3"
          onClick={() => setActiveTab('disks')}
        >
          <span className="material-symbols-outlined text-[16px]">hard_drive_2</span>
          <span>Disk Array & S.M.A.R.T.</span>
        </Button>
        <Button
          variant={activeTab === 'datasets' ? 'primary' : 'ghost'}
          size="sm"
          className="py-space-sm font-label-md text-label-md flex items-center gap-1.5 px-3"
          onClick={() => setActiveTab('datasets')}
        >
          <span className="material-symbols-outlined text-[16px]">pie_chart</span>
          <span>Dataset Quotas</span>
        </Button>
      </div>

      {/* Main Content Space */}
      <div className="p-gutter-desktop flex flex-col gap-space-lg">
        {activeTab === 'overview' && (
          <>
            {/* Top Telemetry Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
              {/* Metric Card 1: Pool Health */}
              <div className="p-space-md rounded-xl bg-surface-container shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-secondary text-[20px]">check_circle</span>
                    <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">ZFS Pool Status</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary font-code-xs text-code-xs font-semibold">ONLINE</span>
                </div>
                <div className="my-space-sm">
                  <div className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">medstore-pool</div>
                  <div className="font-code-xs text-code-xs text-on-surface-variant mt-0.5">RAIDZ2 (Double Parity) • 8 Disks</div>
                </div>
                <div className="flex items-center justify-between pt-space-xs font-code-xs text-code-xs text-on-surface-variant">
                  <span className="text-secondary flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> 0 Read / Write Errs
                  </span>
                  <span className="text-on-surface">Checksum: 0 Fail</span>
                </div>
              </div>

              {/* Metric Card 2: Storage Capacity & Ratio */}
              <div className="p-space-md rounded-xl bg-surface-container shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[20px]">inventory_2</span>
                    <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Kapasitas Penyimpanan</span>
                  </div>
                  <span className="font-code-xs text-code-xs text-tertiary">ZSTD 1.42x</span>
                </div>
                <div className="my-space-sm">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">
                      {pool ? formatBytes(pool.used_bytes) : '48.6 TB'}
                    </span>
                    <span className="font-code-sm text-code-sm text-on-surface-variant">
                      / {pool ? formatBytes(pool.total_bytes) : '72.0 TB'} ({usedPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-surface-container-highest rounded-full h-2 mt-2 overflow-hidden">
                    <div className="bg-primary-container h-2 rounded-full" style={{ width: `${usedPercent}%` }}></div>
                  </div>
                </div>
                <div className="flex items-center justify-between font-code-xs text-code-xs text-on-surface-variant">
                  <span>Free: <strong className="text-on-surface">{pool ? formatBytes(pool.free_bytes) : '23.4 TB'}</strong></span>
                  <span>Hemat ZSTD: <strong className="text-secondary">~14.1 TB</strong></span>
                </div>
              </div>

              {/* Metric Card 3: Disk I/O & IOPS */}
              <div className="p-space-md rounded-xl bg-surface-container shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-tertiary text-[20px]">speed</span>
                    <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Disk I/O & Latensi</span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-tertiary font-code-xs text-code-xs">L2ARC Active</span>
                </div>
                <div className="my-space-sm flex items-center justify-between">
                  <div>
                    <div className="font-code-xs text-code-xs text-on-surface-variant">Read / Write</div>
                    <div className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">840 / 420 <span className="font-code-xs text-code-xs text-outline">MB/s</span></div>
                  </div>
                  <div className="text-right">
                    <div className="font-code-xs text-code-xs text-on-surface-variant">Latensi Rata-rata</div>
                    <div className="font-headline-lg text-headline-lg text-secondary font-semibold tracking-tight">0.8 <span className="font-code-xs text-code-xs text-outline">ms</span></div>
                  </div>
                </div>
                <div className="flex items-center justify-between font-code-xs text-code-xs text-on-surface-variant">
                  <span>ARC Hit Ratio: <strong className="text-secondary">98.4%</strong></span>
                  <span>Queue Depth: <strong className="text-on-surface">3 ops</strong></span>
                </div>
              </div>

              {/* Metric Card 4: Snapshots & CloudSync */}
              <div className="p-space-md rounded-xl bg-surface-container shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-tertiary-fixed text-[20px]">cloud_done</span>
                    <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Snapshot & Replikasi</span>
                  </div>
                  <span className="flex items-center gap-1 font-code-xs text-code-xs text-secondary">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> S3 Wasabi
                  </span>
                </div>
                <div className="my-space-sm">
                  <div className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">1.480 Snapshots</div>
                  <div className="font-code-xs text-code-xs text-on-surface-variant mt-0.5">Dual-Cloud: Wasabi S3 & Backblaze B2</div>
                </div>
                <div className="flex items-center justify-between font-code-xs text-code-xs text-on-surface-variant">
                  <span>Sinkronisasi Terakhir:</span>
                  <span className="text-on-surface font-medium">14 Menit yang lalu</span>
                </div>
              </div>
            </div>

            {/* Storage Topology & Dataset Allocation Panel */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-md">
              {/* Left Column: 8-Bay Rackmount Disk Array Viewer (8 Cols) */}
              <div className="xl:col-span-8 p-space-lg rounded-xl bg-surface-container shadow-sm flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs mb-space-md">
                  <div>
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-primary text-[20px]">rotate_90_degrees_ccw</span>
                      <h2 className="font-headline-sm text-headline-sm text-on-surface">Topologi Fisik: Rackmount Array 8-Bay U2 NVMe</h2>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Enterprise U.3 NVMe SSDs • Kontroler Kioxia / Micron Seri CM6 • Status Bus PCIe Gen4 x4</p>
                  </div>
                  <div className="flex items-center gap-space-sm font-code-xs text-code-xs">
                    <span className="flex items-center gap-1 text-secondary"><span className="w-2 h-2 rounded-full bg-secondary"></span> Optimal</span>
                    <span className="flex items-center gap-1 text-tertiary"><span className="w-2 h-2 rounded-full bg-tertiary"></span> Activity</span>
                    <span className="flex items-center gap-1 text-outline"><span className="w-2 h-2 rounded-full bg-outline"></span> Standby</span>
                  </div>
                </div>

                {/* 8 Bays Grid Display */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm">
                  {mockDisks.map((disk, index) => (
                    <div
                      key={disk.name}
                      className={cn(
                        'p-space-sm rounded-lg bg-surface-container-lowest flex flex-col justify-between hover:bg-surface-container-high transition-colors',
                        disk.isParity && 'ring-1 ring-tertiary'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-code-sm text-code-sm font-semibold text-primary">
                          Bay {index}: {disk.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className={cn(
                            'w-2 h-2 rounded-full',
                            disk.status === 'online' && 'bg-secondary',
                            disk.status === 'degraded' && 'bg-warning',
                            disk.status === 'offline' && 'bg-error'
                          )}></span>
                          {disk.activity && (
                            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-ping"></span>
                          )}
                        </div>
                      </div>
                      <div className="my-space-xs font-code-xs text-code-xs">
                        <div className="text-on-surface font-medium truncate">{disk.model}</div>
                        <div className="text-outline">S/N: {disk.serial}</div>
                      </div>
                      <div className="flex justify-between items-center font-code-xs text-code-xs pt-1 text-on-surface-variant">
                        <span>Suhu: <strong className={cn(
                          disk.temperature > 45 ? 'text-error' :
                          disk.temperature > 40 ? 'text-warning' : 'text-secondary'
                        )}>{disk.temperature}°C</strong></span>
                        <span>Health: <strong className={cn(
                          disk.health >= 95 ? 'text-secondary' :
                          disk.health >= 85 ? 'text-warning' : 'text-error'
                        )}>{disk.health}%</strong></span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Array Summary Footer */}
                <div className="mt-space-md pt-space-sm bg-surface-container-low p-space-sm rounded-lg flex flex-col sm:flex-row items-center justify-between gap-space-xs border-t border-outline-variant">
                  <div className="flex items-center gap-space-sm font-code-xs text-code-xs text-on-surface-variant">
                    <span>Enclosure SAS Expanders: <strong className="text-on-surface">Dual Active-Active</strong></span>
                    <span>•</span>
                    <span>Fan Speed: <strong className="text-on-surface">4.200 RPM (Normal)</strong></span>
                  </div>
                  <div className="flex items-center gap-space-xs">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => alert('Memulai S.M.A.R.T Extended Self-Test pada 8 drives...')}
                    >
                      Jalankan S.M.A.R.T Test
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => alert('Mengidentifikasi disk array dengan LED Blinking...')}
                    >
                      Blink Identifiers
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column: Dataset Allocation Breakdown (4 Cols) */}
              <div className="xl:col-span-4 p-space-lg rounded-xl bg-surface-container shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-space-sm">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-secondary text-[20px]">folder_special</span>
                      <h2 className="font-headline-sm text-headline-sm text-on-surface">Dataset Klinis</h2>
                    </div>
                    <span className="font-code-xs text-code-xs text-outline">Quotas Active</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                    Distribusi alokasi penyimpanan per kategori data medis.
                  </p>
                  <div className="flex flex-col gap-space-md">
                    {mockDatasets.map((ds, index) => (
                      <div key={ds.path} className="p-space-sm rounded-lg bg-surface-container-lowest">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-code-sm text-code-sm font-semibold {cn(`text-${ds.color}`)} truncate">{ds.path}</span>
                          <span className="font-code-xs text-code-xs {cn(`text-${ds.color}`)} font-medium">
                            {ds.noQuota ? 'No Quota' : `${ds.percent}%`}
                          </span>
                        </div>
                        <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
                          <div className={cn(`bg-${ds.color} h-1.5 rounded-full`)} style={{ width: `${ds.percent}%` }}></div>
                        </div>
                        <div className="flex justify-between items-center mt-1.5 font-code-xs text-code-xs text-on-surface-variant">
                          <span>Terpakai: {ds.used}</span>
                          <span>{ds.noQuota ? 'Alokasi Dinamis' : `Quota: ${ds.quota}`}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-space-md mt-space-sm flex items-center justify-between border-t border-outline-variant">
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Total Terreservasi:</span>
                  <span className="font-code-sm text-code-sm font-semibold text-primary">65.0 TB / 72.0 TB</span>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'disks' && (
          <div className="p-space-lg rounded-xl bg-surface-container shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs mb-space-md">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">hard_drive_2</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Disk Array & S.M.A.R.T. Detail</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-sm">
              {mockDisks.map((disk, index) => (
                <div
                  key={disk.name}
                  className={cn(
                    'p-space-md rounded-lg bg-surface-container-lowest hover:bg-surface-container-high transition-colors',
                    disk.isParity && 'ring-1 ring-tertiary'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-code-sm text-code-sm font-semibold text-primary">Bay {index}: {disk.name}</span>
                    <Badge variant={disk.isParity ? 'tertiary' : 'default'} size="sm" dotColor="tertiary">
                      {disk.isParity ? 'Parity' : 'Data'}
                    </Badge>
                  </div>
                  <div className="mb-2 font-code-xs text-code-xs">
                    <div className="text-on-surface font-medium truncate">{disk.model}</div>
                    <div className="text-outline">S/N: {disk.serial}</div>
                    <div className="text-outline">Capacity: {disk.capacity}</div>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 bg-surface-container-highest rounded-full h-2">
                      <div className="bg-secondary h-2 rounded-full" style={{ width: `${disk.health}%` }}></div>
                    </div>
                    <span className="text-secondary font-medium text-code-xs">{disk.health}%</span>
                  </div>
                  <div className="flex justify-between items-center font-code-xs text-code-xs text-on-surface-variant">
                    <span>Suhu: <strong className={cn(
                      disk.temperature > 45 ? 'text-error' :
                      disk.temperature > 40 ? 'text-warning' : 'text-secondary'
                    )}>{disk.temperature}°C</strong></span>
                    <span className={cn(
                      disk.status === 'online' && 'text-secondary',
                      disk.status === 'degraded' && 'text-warning',
                      disk.status === 'offline' && 'text-error'
                    )}>{disk.status.toUpperCase()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'datasets' && (
          <div className="p-space-lg rounded-xl bg-surface-container shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs mb-space-md">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-[20px]">pie_chart</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Dataset Allocation & Quotas</h2>
              </div>
            </div>
            <div className="space-y-4">
              {mockDatasets.map((ds, index) => (
                <div
                  key={ds.path}
                  className="p-space-md rounded-lg bg-surface-container-lowest hover:bg-surface-container-high transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-code-sm text-code-sm font-semibold {cn(`text-${ds.color}`)}">{ds.path}</span>
                    <Badge variant={ds.color as any} size="sm">
                      {ds.noQuota ? 'No Quota' : `${ds.percent}%`}
                    </Badge>
                  </div>
                  <div className="w-full bg-surface-container-highest rounded-full h-3 overflow-hidden mb-2">
                    <div className={cn(`bg-${ds.color} h-3 rounded-full`)} style={{ width: `${ds.percent}%` }}></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-code-xs text-code-xs text-on-surface-variant">
                    <span>Terpakai: <strong className="text-on-surface">{ds.used}</strong></span>
                    <span>Quota: <strong className="text-on-surface">{ds.noQuota ? 'Dinamis' : ds.quota}</strong></span>
                    <span>Sisa: <strong className="text-on-surface">{ds.noQuota ? '—' : `${Math.round(parseFloat(ds.quota) * (100 - ds.percent) / 100 * 10) / 10} TB`}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'snapshots' && (
          <div className="p-space-lg rounded-xl bg-surface-container shadow-sm flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-md">
              <div>
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[20px]">schedule</span>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface">Snapshot & Kebijakan Retensi Rekam Medis</h2>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Menjamin kepatuhan regulasi arsip digital klinis Permenkes 24/2022 (Min. 10 Tahun)</p>
              </div>
              <div className="flex items-center gap-space-xs">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">filter_list</span>
                  <input
                    className="h-8 pl-8 pr-3 bg-surface-container-lowest text-on-surface font-code-xs text-code-xs rounded-lg placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary-container"
                    placeholder="Filter Snapshot..."
                    value={snapshotFilter}
                    onChange={(e) => setSnapshotFilter(e.target.value)}
                    type="text"
                  />
                </div>
                <Select
                  value={snapshotPolicyFilter}
                  onChange={(e) => setSnapshotPolicyFilter(e.target.value)}
                  options={[
                    { value: '', label: 'Semua Kebijakan' },
                    { value: 'Monthly (10 Thn)', label: 'Monthly (10 Thn)' },
                    { value: 'Daily (30 Hari)', label: 'Daily (30 Hari)' },
                    { value: 'Hourly (24 Jam)', label: 'Hourly (24 Jam)' },
                  ]}
                  placeholder="Semua Kebijakan"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg bg-surface-container-lowest">
              <table className="w-full text-left font-body-sm text-body-sm">
                <thead>
                  <tr className="bg-surface-container-high/60 font-label-md text-label-md uppercase text-outline">
                    <th className="px-space-md py-2.5 font-medium">Nama Snapshot ZFS</th>
                    <th className="px-space-md py-2.5 font-medium">Dataset Path</th>
                    <th className="px-space-md py-2.5 font-medium text-right">Ukuran Delta</th>
                    <th className="px-space-md py-2.5 font-medium text-right">Total Referensi</th>
                    <th className="px-space-md py-2.5 font-medium">Dibuat Pada</th>
                    <th className="px-space-md py-2.5 font-medium">Kebijakan Retensi</th>
                    <th className="px-space-md py-2.5 font-medium text-center">Status Offsite</th>
                    <th className="px-space-md py-2.5 font-medium text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {mockSnapshots
                    .filter(s =>
                      s.name.toLowerCase().includes(snapshotFilter.toLowerCase()) &&
                      (snapshotPolicyFilter === '' || s.policy.includes(snapshotPolicyFilter))
                    )
                    .map((snap, index) => (
                    <tr key={snap.name} className="hover:bg-surface-container-high/40 transition-colors">
                      <td className="px-space-md py-2 font-code-xs text-code-xs font-semibold text-primary truncate max-w-xs">
                        {snap.name}
                      </td>
                      <td className="px-space-md py-2 font-code-xs text-code-xs text-on-surface-variant">
                        {snap.dataset}
                      </td>
                      <td className="px-space-md py-2 font-code-xs text-code-xs text-on-surface text-right">
                        {snap.delta}
                      </td>
                      <td className="px-space-md py-2 font-code-xs text-code-xs text-outline text-right">
                        {snap.referenced}
                      </td>
                      <td className="px-space-md py-2 font-code-xs text-code-xs text-on-surface-variant">
                        {snap.created}
                      </td>
                      <td className="px-space-md py-2">
                        <Badge
                          variant={
                            snap.policy.includes('Monthly') ? 'tertiary' :
                            snap.policy.includes('Daily') ? 'default' :
                            snap.policy.includes('Hourly') ? 'default' :
                            'secondary'
                          }
                          size="sm"
                        >
                          {snap.policy}
                        </Badge>
                      </td>
                      <td className="px-space-md py-2 text-center">
                        <span className="inline-flex items-center gap-1 font-code-xs text-code-xs">
                          <span className="material-symbols-outlined text-[14px]">
                            {snap.syncStatus === 'synced' ? 'cloud_done' :
                             snap.syncStatus === 'syncing' ? 'sync' : 'cloud_off'}
                          </span>
                          {snap.offsite}
                        </span>
                      </td>
                      <td className="px-space-md py-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => confirm('Peringatan: Rollback akan memulihkan seluruh dataset ke kondisi ini. Lanjutkan?') ? alert('Rollback started') : null}
                          >
                            Rollback
                          </Button>
                          <Button variant="secondary" size="xs">Clone</Button>
                          <Button variant="ghost" size="icon-sm" className="text-error hover:bg-error-container/30">
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-space-xs mt-space-md pt-space-xs font-code-xs text-code-xs text-on-surface-variant border-t border-outline-variant">
              <span>Menampilkan 5 dari 1.480 Snapshot ZFS Terdaftar</span>
              <div className="flex items-center gap-1">
                <Button variant="secondary" size="sm" disabled>Sebelumnya</Button>
                <span className="px-2 text-on-surface">Hal 1 / 296</span>
                <Button variant="secondary" size="sm">Selanjutnya</Button>
              </div>
            </div>

            {/* Manual Snapshot Modal */}
            <Modal
              isOpen={creating}
              onClose={() => setCreating(false)}
              title="Buat ZFS Snapshot Manual"
              size="lg"
            >
              <div className="flex flex-col gap-space-sm font-body-sm text-body-sm">
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Dataset Tujuan</label>
                  <Select
                    value="tank/dicom-imaging"
                    onChange={() => {}}
                    options={[
                      { value: 'tank/dicom-imaging', label: 'tank/dicom-imaging (PACS Imaging)' },
                      { value: 'tank/lab-reports', label: 'tank/lab-reports (Laboratorium LIS)' },
                      { value: 'tank/emr-records', label: 'tank/emr-records (Rekam Medis Elektronik)' },
                      { value: 'tank/system-snapshots', label: 'tank/system-snapshots (Sistem & Konfigurasi)' },
                    ]}
                    placeholder="Pilih Dataset"
                  />
                </div>
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Nama Suffix Snapshot</label>
                  <div className="flex items-center">
                    <span className="h-9 px-3 bg-surface-container-high flex items-center rounded-l-lg font-code-xs text-code-xs text-outline select-none">manual-</span>
                    <Input
                      className="flex-1 h-9 px-3 bg-surface-container-lowest text-on-surface rounded-r-lg font-code-sm text-code-sm"
                      placeholder="pre-migration-auditing"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-label-md text-label-md text-on-surface-variant mb-1">Kebijakan Retensi</label>
                  <Select
                    value="Simpan Selamanya (Never Expire)"
                    onChange={() => {}}
                    options={[
                      { value: 'Simpan Selamanya (Never Expire)', label: 'Simpan Selamanya (Never Expire)' },
                      { value: '10 Tahun (Kepatuhan Rekam Medis Permenkes)', label: '10 Tahun (Kepatuhan Rekam Medis Permenkes)' },
                      { value: '1 Tahun', label: '1 Tahun' },
                      { value: '30 Hari', label: '30 Hari' },
                    ]}
                    placeholder="Pilih Kebijakan"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <input checked className="rounded bg-surface-container-lowest text-primary-container focus:ring-0" type="checkbox" id="modal-sync-s3" />
                  <label className="font-body-sm text-body-sm text-on-surface" htmlFor="modal-sync-s3">
                    Replikasi langsung ke Cloud Wasabi S3 & Backblaze
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-end gap-space-sm pt-space-xs">
                <Button variant="secondary" onClick={() => setCreating(false)}>Batal</Button>
                <Button variant="primary" onClick={() => { alert('Snapshot berhasil dibuat!'); setCreating(false); }}>
                  Buat Snapshot
                </Button>
              </div>
            </Modal>
          </div>
        )}

        {activeTab === 'cloudsync' && (
          <div className="p-space-lg rounded-xl bg-surface-container shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs mb-space-md">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-tertiary text-[20px]">cloud_sync</span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">CloudSync & S3 Backup Jobs</h2>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { name: 'offsite-backup-wasabi', target: 'Wasabi S3: medstore-cold-glacier', status: 'SUCCESS', lastRun: '14 Menit yang lalu', schedule: 'Setiap 15 Menit' },
                { name: 'offsite-backup-b2', target: 'Backblaze B2: medstore-archive', status: 'SUCCESS', lastRun: '22 Menit yang lalu', schedule: 'Setiap 30 Menit' },
                { name: 'disaster-recovery-drill', target: 'AWS S3: medstore-dr-test', status: 'IDLE', lastRun: '3 Hari yang lalu', schedule: 'Mingguan (Minggu 02:00)' },
              ].map((job, index) => (
                <div
                  key={job.name}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-surface-container-lowest border border-outline-variant"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-tertiary-container/20 flex items-center justify-center text-tertiary">
                      <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
                    </div>
                    <div>
                      <p className="font-body-sm text-body-sm font-medium text-on-surface">{job.name}</p>
                      <p className="font-code-xs text-code-xs text-on-surface-variant">Target: {job.target}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-code-xs text-code-xs text-on-surface-variant">
                      Terakhir: {job.lastRun}
                    </span>
                    <Badge
                      variant={
                        job.status === 'SUCCESS' ? 'success' :
                        job.status === 'RUNNING' ? 'warning' :
                        job.status === 'FAILED' ? 'danger' : 'default'
                      }
                      dot
                    >
                      {job.status}
                    </Badge>
                    <span className="font-code-xs text-code-xs text-outline">Jadwal: {job.schedule}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}