'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { getDashboardStats } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import type { DashboardStats } from '@/types';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load stats', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();

    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB'
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-space-lg flex flex-col gap-space-lg w-full max-w-[1720px] mx-auto animate-fade-in">
      {/* Top Action Context Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-surface-container-low p-space-md rounded-xl shadow-sm">
        <div className="flex flex-col gap-space-xs">
          <div className="flex items-center gap-space-sm flex-wrap">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
              Dashboard Klinis & Penyimpanan Arsip
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-container/20 text-secondary font-code-xs text-code-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping"></span>
              Sistem Sinkronisasi Aktif • TrueNAS Core 13.0-U6
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2 flex-wrap">
            <span>Pusat Data Medis Terpadu RS MedStore</span>
            <span className="text-outline">•</span>
            <span className="font-code-xs text-code-xs text-tertiary">ZFS Tier-1 Enterprise NVMe</span>
            <span className="text-outline">•</span>
            <span className="font-code-xs text-code-xs text-on-surface-variant">
              Terakhir diperbarui: <span id="clock-timestamp">{currentTime || 'Memuat...'}</span>
            </span>
          </p>
        </div>
        <div className="flex items-center gap-space-sm flex-wrap">
          <Button
            variant="secondary"
            size="md"
            iconLeft={<span className="material-symbols-outlined text-[16px] text-tertiary">file_download</span>}
            onClick={() => alert('Mengekspor rekapitulasi audit log dan metrik kapasitas PDF/CSV...')}
          >
            Export Laporan
          </Button>
          <Button
            variant="secondary"
            size="md"
            iconLeft={<span className="material-symbols-outlined text-[16px] text-primary">cloud_upload</span>}
            onClick={() => router.push('/documents')}
          >
            Upload Dokumen Cepat
          </Button>
          <Button
            variant="primary"
            size="md"
            iconLeft={<span className="material-symbols-outlined text-[18px]">person_add</span>}
            onClick={() => router.push('/patients')}
          >
            + Pasien Baru
          </Button>
        </div>
      </div>

      {/* Metric Bento Grid (4 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
        {/* Card 1: Total Pasien Aktif */}
        <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col justify-between shadow-sm relative overflow-hidden group hover:bg-surface-container transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-outline tracking-wider uppercase">
                Total Pasien Terdaftar
              </span>
              <div className="flex items-baseline gap-space-xs mt-1">
                <span className="font-headline-xl text-headline-xl text-on-surface font-bold">
                  {loading ? '—' : stats?.total_patients?.toLocaleString('id-ID') ?? '34.821'}
                </span>
                <span className="font-code-xs text-code-xs text-outline">Jiwa</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">groups</span>
            </div>
          </div>
          <div className="mt-space-md pt-space-sm flex items-end justify-between">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1 font-code-xs text-code-xs text-secondary font-medium">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                <span>+142 minggu ini</span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant">Rata-rata 24 admisi/hari</span>
            </div>
            <div className="w-24 h-9">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 96 36">
                <path
                  className="text-secondary"
                  d="M0,28 L14,24 L28,26 L42,16 L56,19 L70,9 L84,12 L96,4"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                />
                <path
                  className="text-secondary/10"
                  d="M0,28 L14,24 L28,26 L42,16 L56,19 L70,9 L84,12 L96,4 L96,36 L0,36 Z"
                  fill="currentColor"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 2: Total Dokumen & Storage */}
        <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col justify-between shadow-sm relative overflow-hidden group hover:bg-surface-container transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-outline tracking-wider uppercase">
                Volume Arsip Medis
              </span>
              <div className="flex items-baseline gap-space-xs mt-1">
                <span className="font-headline-xl text-headline-xl text-on-surface font-bold">
                  {loading ? '—' : stats?.total_documents?.toLocaleString('id-ID') ?? '1.284.910'}
                </span>
                <span className="font-code-xs text-code-xs text-outline">Objek</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[20px]">folder_copy</span>
            </div>
          </div>
          <div className="mt-space-md pt-space-sm flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="font-code-sm text-code-sm text-on-surface font-medium">48.6 TB</span>
              <span className="font-code-xs text-code-xs text-outline">tersimpan</span>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container text-tertiary font-code-xs text-code-xs">
              <span className="material-symbols-outlined text-[12px]">enhanced_encryption</span>
              AES-256 GCM
            </span>
          </div>
        </div>

        {/* Card 3: TrueNAS Pool Health & Kapasitas */}
        <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col justify-between shadow-sm relative overflow-hidden group hover:bg-surface-container transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-label-md text-label-md text-outline tracking-wider uppercase">
                  TrueNAS ZFS Pool
                </span>
                <span className="px-1.5 py-0.2 rounded bg-secondary-container/20 text-secondary font-code-xs text-code-xs">
                  medstore-pool
                </span>
              </div>
              <div className="flex items-baseline gap-space-xs mt-1">
                <span className="font-headline-xl text-headline-xl text-on-surface font-bold">67.5%</span>
                <span className="font-code-xs text-code-xs text-outline">dari 72 TB</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-secondary-container/20 flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[20px]">dns</span>
            </div>
          </div>
          <div className="mt-space-md flex flex-col gap-1.5">
            <div className="w-full bg-surface-container-highest rounded-full h-2 overflow-hidden">
              <div className="bg-primary-container h-2 rounded-full transition-all duration-500" style={{ width: '67.5%' }}></div>
            </div>
            <div className="flex items-center justify-between font-code-xs text-code-xs text-on-surface-variant">
              <span className="text-secondary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                HEALTHY
              </span>
              <span>Scrub: Berhasil 12 jam lalu</span>
            </div>
          </div>
        </div>

        {/* Card 4: Audit & Integritas SHA-256 */}
        <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col justify-between shadow-sm relative overflow-hidden group hover:bg-surface-container transition-colors">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-outline tracking-wider uppercase">
                Integritas Checksum
              </span>
              <div className="flex items-baseline gap-space-xs mt-1">
                <span className="font-headline-xl text-headline-xl text-secondary font-bold">100.0%</span>
                <span className="font-code-xs text-code-xs text-secondary font-medium">Verified</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[20px]">verified_user</span>
            </div>
          </div>
          <div className="mt-space-md pt-space-sm flex items-center justify-between">
            <span className="font-code-xs text-code-xs text-outline">0 Checksum Mismatch</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container text-primary font-code-xs text-code-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              SHA-256 Realtime
            </span>
          </div>
        </div>
      </div>

      {/* Main Section: 2 Columns (7:5 Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
        {/* Left Column (7 cols): Dense Activity Table */}
        <div className="lg:col-span-7 bg-surface-container-low rounded-xl p-space-md flex flex-col shadow-sm">
          <div className="flex items-center justify-between pb-space-sm mb-space-sm border-b border-outline-variant">
            <div className="flex items-center gap-space-sm">
              <div className="w-2 h-4 rounded-sm bg-primary-container"></div>
              <div className="flex flex-col">
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Aktivitas Klinis & Upload Terkini</h2>
                <span className="font-code-xs text-code-xs text-outline">Log sinkronisasi berkas PACS / Lab / Rekam Medis</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  className="h-7 w-36 pl-7 pr-2 rounded bg-surface-container-lowest text-on-surface font-code-xs text-code-xs placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary-container"
                  placeholder="Filter RM / Berkas..."
                  type="text"
                />
                <span className="material-symbols-outlined absolute left-1.5 top-1/2 -translate-y-1/2 text-outline text-[14px]">
                  filter_list
                </span>
              </div>
              <button className="h-7 px-2 rounded bg-surface-container text-on-surface hover:bg-surface-container-high font-code-xs text-code-xs flex items-center gap-1 transition-colors">
                <span className="material-symbols-outlined text-[14px]">refresh</span>
                <span>Live</span>
              </button>
            </div>
          </div>

          {/* Dense Medical Table */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container font-label-md text-label-md text-outline uppercase tracking-wider">
                  <th className="py-2 px-3 font-medium">Waktu</th>
                  <th className="py-2 px-3 font-medium">No RM & Pasien</th>
                  <th className="py-2 px-3 font-medium">Jenis & Dept</th>
                  <th className="py-2 px-3 font-medium">Ukuran</th>
                  <th className="py-2 px-3 font-medium">Dokter PJ</th>
                  <th className="py-2 px-3 font-medium text-right">Integritas</th>
                </tr>
              </thead>
              <tbody className="divide-y-0 font-body-sm text-body-sm">
                <tr className="bg-surface-container-low hover:bg-surface-container transition-colors group cursor-pointer">
                  <td className="py-2.5 px-3 font-code-xs text-code-xs text-on-surface-variant whitespace-nowrap">14:38:12</td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col">
                      <span className="font-code-sm text-code-sm font-semibold text-primary">RM-2024-9982</span>
                      <span className="text-on-surface leading-tight">Ny. Siti Rohana (54th)</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-surface-container text-tertiary font-code-xs text-code-xs font-semibold">DICOM</span>
                      <span className="text-on-surface-variant font-code-xs text-code-xs">CT Thorax 64-Slice</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-code-xs text-code-xs text-on-surface-variant">482 MB</td>
                  <td className="py-2.5 px-3 text-on-surface leading-tight">dr. Farhan, Sp.Rad</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary-container/20 text-secondary font-code-xs text-code-xs">
                      <span className="material-symbols-outlined text-[12px]">check_circle</span>
                      SHA-OK
                    </span>
                  </td>
                </tr>
                <tr className="bg-surface-container-lowest/40 hover:bg-surface-container transition-colors group cursor-pointer">
                  <td className="py-2.5 px-3 font-code-xs text-code-xs text-on-surface-variant whitespace-nowrap">14:32:05</td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col">
                      <span className="font-code-sm text-code-sm font-semibold text-primary">RM-2024-4110</span>
                      <span className="text-on-surface leading-tight">Tn. Ahmad Fauzi (41th)</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-surface-container text-secondary font-code-xs text-code-xs font-semibold">LAB PDF</span>
                      <span className="text-on-surface-variant font-code-xs text-code-xs">Kimia Darah & Troponin</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-code-xs text-code-xs text-on-surface-variant">2.4 MB</td>
                  <td className="py-2.5 px-3 text-on-surface leading-tight">dr. Linda, Sp.PK</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary-container/20 text-secondary font-code-xs text-code-xs">
                      <span className="material-symbols-outlined text-[12px]">check_circle</span>
                      SHA-OK
                    </span>
                  </td>
                </tr>
                <tr className="bg-surface-container-low hover:bg-surface-container transition-colors group cursor-pointer">
                  <td className="py-2.5 px-3 font-code-xs text-code-xs text-on-surface-variant whitespace-nowrap">14:26:40</td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col">
                      <span className="font-code-sm text-code-sm font-semibold text-primary">RM-2024-8823</span>
                      <span className="text-on-surface leading-tight">An. David Wijaya (8th)</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-surface-container text-tertiary font-code-xs text-code-xs font-semibold">DICOM</span>
                      <span className="text-on-surface-variant font-code-xs text-code-xs">Rontgen Antebrachii DX</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-code-xs text-code-xs text-on-surface-variant">64 MB</td>
                  <td className="py-2.5 px-3 text-on-surface leading-tight">dr. Hendra, Sp.OT</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary-container/20 text-secondary font-code-xs text-code-xs">
                      <span className="material-symbols-outlined text-[12px]">check_circle</span>
                      SHA-OK
                    </span>
                  </td>
                </tr>
                <tr className="bg-surface-container-lowest/40 hover:bg-surface-container transition-colors group cursor-pointer">
                  <td className="py-2.5 px-3 font-code-xs text-code-xs text-on-surface-variant whitespace-nowrap">14:19:11</td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col">
                      <span className="font-code-sm text-code-sm font-semibold text-primary">RM-2024-1054</span>
                      <span className="text-on-surface leading-tight">Ibu Maya Sandra (32th)</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-code-xs text-code-xs font-semibold">RESUME</span>
                      <span className="text-on-surface-variant font-code-xs text-code-xs">Laporan Operasi SC</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-code-xs text-code-xs text-on-surface-variant">8.9 MB</td>
                  <td className="py-2.5 px-3 text-on-surface leading-tight">dr. Rian, Sp.OG</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary-container/20 text-secondary font-code-xs text-code-xs">
                      <span className="material-symbols-outlined text-[12px]">check_circle</span>
                      SHA-OK
                    </span>
                  </td>
                </tr>
                <tr className="bg-surface-container-low hover:bg-surface-container transition-colors group cursor-pointer">
                  <td className="py-2.5 px-3 font-code-xs text-code-xs text-on-surface-variant whitespace-nowrap">14:05:59</td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col">
                      <span className="font-code-sm text-code-sm font-semibold text-primary">RM-2024-7619</span>
                      <span className="text-on-surface leading-tight">Tn. Bambang Sutrisno (67th)</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-surface-container text-tertiary font-code-xs text-code-xs font-semibold">ECG RAW</span>
                      <span className="text-on-surface-variant font-code-xs text-code-xs">Holter Monitoring 24H</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-code-xs text-code-xs text-on-surface-variant">118 MB</td>
                  <td className="py-2.5 px-3 text-on-surface leading-tight">dr. Yulia, Sp.JP</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary-container/20 text-secondary font-code-xs text-code-xs">
                      <span className="material-symbols-outlined text-[12px]">check_circle</span>
                      SHA-OK
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="pt-space-sm mt-auto flex items-center justify-between text-on-surface-variant font-code-xs text-code-xs border-t border-outline-variant mt-2">
            <span>Menampilkan 5 dari 1.840 transaksi hari ini</span>
            <Link className="text-primary hover:underline flex items-center gap-1" href="/documents">
              Lihat Semua Antrean Upload
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        </div>

        {/* Right Column (5 cols): Category Distribution & Telemetry */}
        <div className="lg:col-span-5 flex flex-col gap-space-md">
          {/* Card: Distribusi Kategori Dokumen Klinis */}
          <div className="bg-surface-container-low rounded-xl p-space-md shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-space-sm">
              <div className="flex items-center gap-space-sm">
                <div className="w-2 h-4 rounded-sm bg-tertiary"></div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Distribusi Dokumen Klinis</h2>
              </div>
              <span className="font-code-xs text-code-xs text-outline">Total 48.6 TB</span>
            </div>
            {/* Multi-segment progress bar */}
            <div className="w-full h-3 rounded-full bg-surface-container flex overflow-hidden my-space-xs">
              <div className="bg-primary-container" style={{ width: '52%' }} title="Radiologi & DICOM: 52%"></div>
              <div className="bg-tertiary" style={{ width: '24%' }} title="Hasil Laboratorium: 24%"></div>
              <div className="bg-secondary" style={{ width: '14%' }} title="Resume Medis & Ranap: 14%"></div>
              <div className="bg-outline" style={{ width: '10%' }} title="Surat Rujukan & Identitas: 10%"></div>
            </div>
            {/* Category Legend Grid */}
            <div className="grid grid-cols-2 gap-space-sm mt-space-sm font-body-sm text-body-sm">
              <div className="p-space-xs rounded bg-surface-container flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-on-surface font-medium">
                    <span className="w-2 h-2 rounded-full bg-primary-container"></span>
                    Radiologi & DICOM
                  </span>
                  <span className="font-code-xs text-code-xs font-bold text-primary">52%</span>
                </div>
                <span className="font-code-xs text-code-xs text-outline mt-0.5">25.27 TB • 668.150 berkas</span>
              </div>
              <div className="p-space-xs rounded bg-surface-container flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-on-surface font-medium">
                    <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                    Hasil Laboratorium
                  </span>
                  <span className="font-code-xs text-code-xs font-bold text-tertiary">24%</span>
                </div>
                <span className="font-code-xs text-code-xs text-outline mt-0.5">11.66 TB • 308.378 berkas</span>
              </div>
              <div className="p-space-xs rounded bg-surface-container flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-on-surface font-medium">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    Resume & Rawat Inap
                  </span>
                  <span className="font-code-xs text-code-xs font-bold text-secondary">14%</span>
                </div>
                <span className="font-code-xs text-code-xs text-outline mt-0.5">6.80 TB • 179.887 berkas</span>
              </div>
              <div className="p-space-xs rounded bg-surface-container flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-on-surface font-medium">
                    <span className="w-2 h-2 rounded-full bg-outline"></span>
                    Rujukan & ID KTP/BPJS
                  </span>
                  <span className="font-code-xs text-code-xs font-bold text-on-surface-variant">10%</span>
                </div>
                <span className="font-code-xs text-code-xs text-outline mt-0.5">4.86 TB • 128.491 berkas</span>
              </div>
            </div>
          </div>

          {/* Mini Visual Telemetry: Live Bandwidth IOPS */}
          <div className="bg-surface-container-low rounded-xl p-space-md shadow-sm flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="font-label-md text-label-md text-outline uppercase tracking-wider">TrueNAS I/O Throughput</span>
              <div className="flex items-baseline gap-2">
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">1.48 GB/s</span>
                <span className="font-code-xs text-code-xs text-secondary font-medium">Write Load Nominal</span>
              </div>
              <span className="font-code-xs text-code-xs text-on-surface-variant">Pool IOPS: 18.420 read / 4.900 write</span>
            </div>
            {/* Bar Graph Telemetry */}
            <div className="flex items-end gap-1 h-10">
              <div className="w-1.5 bg-primary-container rounded-t h-4"></div>
              <div className="w-1.5 bg-primary-container rounded-t h-6"></div>
              <div className="w-1.5 bg-primary-container rounded-t h-5"></div>
              <div className="w-1.5 bg-primary-container rounded-t h-8"></div>
              <div className="w-1.5 bg-primary rounded-t h-7"></div>
              <div className="w-1.5 bg-primary-container rounded-t h-9"></div>
              <div className="w-1.5 bg-secondary rounded-t h-10"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: 3 Columns Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        {/* Card A: Status Node TrueNAS & Replikasi */}
        <div className="bg-surface-container-low rounded-xl p-space-md shadow-sm flex flex-col justify-between">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">hub</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Status Node & Replikasi</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-secondary-container/20 text-secondary font-code-xs text-code-xs font-semibold">
                SYNCED
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Arsitektur Redundansi Dual-Site High-Availability</p>
          </div>
          <div className="flex flex-col gap-space-sm my-space-md">
            <div className="flex items-center justify-between p-space-xs rounded bg-surface-container">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                <div className="flex flex-col">
                  <span className="font-body-sm text-body-sm text-on-surface font-medium leading-none">Primary: SFO-MedStore</span>
                  <span className="font-code-xs text-code-xs text-outline">IP: 10.18.143.43 (Direct 10GbE)</span>
                </div>
              </div>
              <span className="font-code-xs text-code-xs text-secondary">Latency 0.4ms</span>
            </div>
            <div className="flex items-center justify-between p-space-xs rounded bg-surface-container">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                <div className="flex flex-col">
                  <span className="font-body-sm text-body-sm text-on-surface font-medium leading-none">DR Site: CloudSync B2</span>
                  <span className="font-code-xs text-code-xs text-outline">Bucket: medstore-cold-glacier</span>
                </div>
              </div>
              <span className="font-code-xs text-code-xs text-on-surface-variant">8 mnt lalu</span>
            </div>
          </div>
          <div className="pt-space-xs flex items-center justify-between font-code-xs text-code-xs text-outline border-t border-outline-variant">
            <span>ZFS Snapshot: Interval 15 Menit</span>
            <span className="text-tertiary">RPO &lt; 5m • RTO &lt; 20m</span>
          </div>
        </div>

        {/* Card B: Kebijakan Retensi Aktif */}
        <div className="bg-surface-container-low rounded-xl p-space-md shadow-sm flex flex-col justify-between">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-outline-variant text-[20px]">policy</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Kebijakan Retensi Klinis</h3>
              </div>
              <span className="px-2 py-0.5 rounded bg-surface-container-highest text-primary font-code-xs text-code-xs font-semibold">
                Permenkes 24/2022
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Siklus hidup arsip medis wajib simpan minimum 10 tahun.</p>
          </div>
          <div className="my-space-md p-space-sm rounded-lg bg-surface-container flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-body-sm text-body-sm text-on-surface font-medium">Batas Retensi 2014-2024:</span>
              <span className="px-2 py-0.5 rounded bg-error-container/30 text-error font-code-xs text-code-xs font-bold">
                5 Berkas Perlu Telaah
              </span>
            </div>
            <p className="font-code-xs text-code-xs text-on-surface-variant leading-relaxed">
              Terdapat 5 rekam medis inaktif mendekati masa simpan dekade. Dibutuhkan persetujuan Komite Etik Medis untuk migrasi ke Cold Deep-Archive.
            </p>
          </div>
          <div className="flex items-center justify-between gap-space-sm">
            <button
              className="flex-1 h-8 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors"
              onClick={() => router.push('/admin/retention')}
            >
              Tinjau Berkas (5)
            </button>
            <button
              className="h-8 px-3 rounded bg-primary-container hover:bg-inverse-primary text-on-primary-container font-label-md text-label-md transition-colors"
              onClick={() => alert('Jadwal review komite: Senin, 09:00')}
            >
              Jadwal Audit
            </button>
          </div>
        </div>

        {/* Card C: Pintasan Aksi Cepat */}
        <div className="bg-surface-container-low rounded-xl p-space-md shadow-sm flex flex-col justify-between">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-[20px]">bolt</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Pintasan Aksi Cepat</h3>
              </div>
              <span className="font-code-xs text-code-xs text-outline">Utility Box</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Akses instan modul verifikasi dan pengambilan log.</p>
          </div>
          <div className="flex flex-col gap-space-xs my-space-md">
            <button
              className="flex items-center justify-between p-space-xs rounded bg-surface-container hover:bg-surface-container-high text-left transition-colors group"
              onClick={() => {
                const q = prompt('Masukkan No Rekam Medis (RM) atau NIK Pasien:');
                if (q) router.push(`/patients?search=${encodeURIComponent(q)}`);
              }}
            >
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[18px]">find_in_page</span>
                <span className="font-label-md text-label-md text-on-surface">Cari Cepat Arsip Pasien</span>
              </div>
              <kbd className="font-code-xs text-code-xs px-1.5 py-0.5 rounded bg-surface-container-lowest text-outline">RM</kbd>
            </button>
            <button
              className="flex items-center justify-between p-space-xs rounded bg-surface-container hover:bg-surface-container-high text-left transition-colors group"
              onClick={() => alert('Memulai validasi background SHA-256 batch terkini...')}
            >
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-[18px]">security_update_good</span>
                <span className="font-label-md text-label-md text-on-surface">Validasi Integritas File DICOM</span>
              </div>
              <span className="material-symbols-outlined text-outline text-[16px] group-hover:translate-x-0.5 transition-transform">
                chevron_right
              </span>
            </button>
            <button
              className="flex items-center justify-between p-space-xs rounded bg-surface-container hover:bg-surface-container-high text-left transition-colors group"
              onClick={() => router.push('/audit')}
            >
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-tertiary text-[18px]">history_edu</span>
                <span className="font-label-md text-label-md text-on-surface">Tarik Log Audit 24 Jam</span>
              </div>
              <span className="material-symbols-outlined text-outline text-[16px] group-hover:translate-x-0.5 transition-transform">
                download
              </span>
            </button>
          </div>
          <div className="flex items-center justify-between font-code-xs text-code-xs text-outline border-t border-outline-variant pt-2">
            <span>Security Level: Tier-3 Hospital</span>
            <span className="text-secondary font-medium">Zero-Trust Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}