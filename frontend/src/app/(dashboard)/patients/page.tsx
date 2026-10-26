'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { getPatients, updatePatient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import type { Patient } from '@/types';
import { Button, Input, Select, Table, Badge, Dropdown, Card, Skeleton } from '@/components/ui';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function PatientsPage() {
  const router = useRouter();
  const { hasAnyRole } = useAuthStore();
  const canCreate = hasAnyRole(['SUPERADMIN', 'ADMIN_PENDAFTARAN']);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search).get('search');
      if (q) setSearch(q);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [page, pageSize, search, genderFilter, statusFilter, sortBy, sortOrder]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const res = await getPatients({
        page,
        page_size: pageSize,
        search: search.trim() || undefined,
        gender: genderFilter || undefined,
        status: statusFilter || undefined,
      });
      setPatients(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load patients', err);
      toast.error('Gagal memuat data pasien');
    } finally {
      setLoading(false);
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

  const handleExport = async () => {
    setExportLoading(true);
    try {
      toast.success('Fitur ekspor akan segera tersedia');
    } finally {
      setExportLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedKeys.size === patients.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(patients.map(p => p.id)));
    }
  };

  const columns = useMemo(() => [
    {
      key: 'select',
      header: '',
      width: '40px',
      align: 'center' as const,
      render: (p: Patient) => (
        <input
          type="checkbox"
          className="rounded bg-surface-container-high text-primary-container focus:ring-0 focus:outline-none cursor-pointer"
          checked={selectedKeys.has(p.id)}
          onChange={(e) => {
            const newKeys = new Set(selectedKeys);
            if (e.target.checked) newKeys.add(p.id);
            else newKeys.delete(p.id);
            setSelectedKeys(newKeys);
          }}
          aria-label={`Pilih pasien ${p.medical_record_number}`}
        />
      ),
    },
    {
      key: 'medical_record_number',
      header: 'No RM',
      sortable: true,
      width: '140px',
      render: (p: Patient) => (
        <span className="inline-flex items-center gap-1 font-code-xs text-code-xs px-2 py-0.5 rounded bg-surface-container-highest text-primary font-medium tracking-wide">
          {p.medical_record_number}
        </span>
      ),
    },
    {
      key: 'full_name',
      header: 'Nama Pasien & NIK',
      sortable: true,
      render: (p: Patient) => (
        <div className="flex flex-col">
          <span className="font-body-md text-body-md font-semibold text-on-surface leading-tight group-hover:text-primary transition-colors">
            {p.full_name}
          </span>
          <span className="font-code-xs text-code-xs text-outline">
            NIK: {p.nik || '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'demographics',
      header: 'Usia / Gender',
      width: '150px',
      render: (p: Patient) => {
        const age = p.date_of_birth ? Math.floor((Date.now() - new Date(p.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : '—';
        const genderLabels: Record<string, string> = { MALE: 'L', FEMALE: 'P', OTHER: 'L' };
        const genderColors: Record<string, string> = { MALE: 'primary', FEMALE: 'secondary', OTHER: 'outline' };
        return (
          <div className="whitespace-nowrap">
            <span className="font-body-sm text-body-sm text-on-surface">{age} Thn</span>
            <span className={cn(
              'font-code-xs text-code-xs px-1.5 py-0.2 rounded bg-surface-container-highest ml-1',
              genderColors[p.gender] === 'primary' && 'text-primary',
              genderColors[p.gender] === 'secondary' && 'text-secondary',
              genderColors[p.gender] === 'outline' && 'text-outline'
            )}>
              {genderLabels[p.gender] || p.gender}
            </span>
            <span className="font-code-xs text-code-xs text-outline ml-1">{p.blood_type || '—'}</span>
          </div>
        );
      },
    },
    {
      key: 'specialty',
      header: 'Poli & DPJP',
      width: '200px',
      render: (p: Patient) => (
        <div className="flex flex-col">
          <span className="font-body-sm text-body-sm font-medium text-on-surface">{p.specialty || 'Umum'}</span>
          <span className="font-code-xs text-code-xs text-outline-variant">{p.attending_doctor || '—'}</span>
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Registrasi',
      sortable: true,
      width: '150px',
      render: (p: Patient) => (
        <span className="font-code-xs text-code-xs text-outline whitespace-nowrap">
          {formatDate(p.created_at, { day: '2-digit', month: 'short', year: 'numeric' })} • {formatDate(p.created_at, { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      key: 'documents',
      header: 'Berkas',
      width: '100px',
      align: 'center' as const,
      render: (p: Patient) => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-tertiary font-code-xs text-code-xs font-semibold">
          <span className="material-symbols-outlined text-[13px]">attachment</span>
          {p.document_count || 0} Berkas
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status Klinis',
      sortable: true,
      width: '150px',
      render: (p: Patient) => {
        const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' | 'info' | 'primary'; dotColor: string }> = {
          ACTIVE: { label: 'Rawat Inap', variant: 'success', dotColor: 'secondary' },
          OUTPATIENT: { label: 'Rawat Jalan', variant: 'primary', dotColor: 'primary' },
          DISCHARGED: { label: 'Selesai / Pulang', variant: 'default', dotColor: 'outline' },
          OBSERVATION: { label: 'Observasi', variant: 'info', dotColor: 'tertiary' },
          CRITICAL: { label: 'Kritis / ICU', variant: 'danger', dotColor: 'error' },
        };
        const config = statusConfig[p.status] || { label: p.status, variant: 'default', dotColor: 'outline' };
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-label-md font-semibold">
            <span className={cn('w-1.5 h-1.5 rounded-full', `bg-${config.dotColor}`)}></span>
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Aksi',
      width: '140px',
      align: 'right' as const,
      render: (p: Patient) => {
        const isActive = p.status === 'ACTIVE' || p.status === 'OUTPATIENT' || p.status === 'OBSERVATION' || p.status === 'CRITICAL';
        return (
          <div className="inline-flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-outline hover:text-on-surface"
              onClick={() => router.push(`/patients/${p.id}`)}
              aria-label="Lihat Rekam Medis"
            >
              <span className="material-symbols-outlined text-[18px]">folder_open</span>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-outline hover:text-primary"
              onClick={() => router.push(`/patients/${p.id}`)}
              aria-label="Upload Arsip"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-outline hover:text-on-surface"
              onClick={() => router.push(`/audit?patient=${p.id}`)}
              aria-label="Audit Trail"
            >
              <span className="material-symbols-outlined text-[18px]">history</span>
            </Button>
            <Dropdown
              trigger={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-outline hover:text-on-surface"
                  aria-label="Lainnya"
                >
                  <span className="material-symbols-outlined text-[18px]">more_vert</span>
                </Button>
              }
              items={[
                {
                  label: 'Edit Pasien',
                  icon: <span className="material-symbols-outlined text-[18px]">edit</span>,
                  onClick: () => router.push(`/patients/${p.id}/edit`),
                },
                { divider: true },
                {
                  label: isActive ? 'Arsipkan Pasien' : 'Aktifkan Pasien',
                  icon: isActive ? <span className="material-symbols-outlined text-[18px]">archive</span> : <span className="material-symbols-outlined text-[18px]">person_add</span>,
                  onClick: async () => {
                    try {
                      await updatePatient(p.id, { is_active: !isActive });
                      toast.success(isActive ? 'Pasien berhasil diarsipkan' : 'Pasien berhasil diaktifkan');
                      loadPatients();
                    } catch {
                      toast.error('Gagal mengubah status pasien');
                    }
                  },
                },
                { divider: true },
                {
                  label: 'Hapus Pasien',
                  icon: <span className="material-symbols-outlined text-[18px]">delete</span>,
                  onClick: () => { /* delete logic */ },
                  danger: true,
                },
              ]}
              align="right"
            />
          </div>
        );
      },
    },
  ], [router, selectedKeys, patients]);

  const genderOptions = [
    { value: '', label: 'Semua (L/P)' },
    { value: 'MALE', label: 'Laki-laki (L)' },
    { value: 'FEMALE', label: 'Perempuan (P)' },
    { value: 'OTHER', label: 'Lainnya' },
  ];

  const statusOptions = [
    { value: '', label: 'Semua Status' },
    { value: 'ACTIVE', label: 'Rawat Inap' },
    { value: 'OUTPATIENT', label: 'Rawat Jalan' },
    { value: 'DISCHARGED', label: 'Selesai / Pulang' },
    { value: 'OBSERVATION', label: 'Observasi' },
    { value: 'CRITICAL', label: 'Kritis / ICU' },
  ];

  const specialtyOptions = [
    { value: '', label: 'Semua Poli / Spesialisasi' },
    { value: 'RADIOLOGY', label: 'Radiologi Diagnostik' },
    { value: 'ONCOLOGY', label: 'Onkologi & Kemoterapi' },
    { value: 'CARDIOLOGY', label: 'Kardiologi & Jantung' },
    { value: 'PATHOLOGY', label: 'Patologi Anatomi & Lab' },
    { value: 'NEUROSURGERY', label: 'Bedah Saraf' },
  ];

  const hasFilters = genderFilter || statusFilter;

  const allSelected = patients.length > 0 && patients.every(p => selectedKeys.has(p.id));
  const someSelected = patients.some(p => selectedKeys.has(p.id)) && !allSelected;

  return (
    <div className="p-gutter-desktop pb-space-xl flex flex-col gap-space-lg max-w-[1720px] mx-auto">
      {/* Top Utility Contextual Sub-bar & Metrics */}
      <section className="flex flex-col gap-space-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
          <div>
            <div className="flex items-center gap-space-sm mb-space-xs">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary-container/15 text-primary font-code-xs text-code-xs font-semibold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                Modul Rekam Medis Elektronik
              </span>
              <span className="font-code-xs text-code-xs text-outline">v4.8.2-PROD</span>
              <span className="text-outline">•</span>
              <span className="font-code-xs text-code-xs text-secondary flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">verified</span> Encrypted AES-256
              </span>
            </div>
            <div className="flex items-baseline gap-space-md flex-wrap">
              <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">
                Manajemen Pasien & Arsip Rekam Medis
              </h1>
              <span className="font-code-sm text-code-sm px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-medium">
                {total.toLocaleString('id-ID')} Pasien Terdaftar
              </span>
            </div>
          </div>
          {/* Action Cluster */}
          <div className="flex items-center gap-space-sm flex-wrap">
            <Button variant="secondary" size="md" iconLeft={<span className="material-symbols-outlined text-[18px] text-on-surface-variant">download</span>} onClick={handleExport} loading={exportLoading}>
              Export CSV Pasien
            </Button>
            <Button variant="secondary" size="md" iconLeft={<span className="material-symbols-outlined text-[18px] text-on-surface-variant">tune</span>} onClick={() => {}} >
              Filter Lanjutan
            </Button>
            {canCreate && (
              <Button variant="primary" size="md" iconLeft={<span className="material-symbols-outlined text-[18px]">person_add</span>} onClick={() => router.push('/patients/new')}>
                + Tambah Pasien Baru
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats Cards Micro-Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
          <div className="p-space-md rounded-lg bg-surface-container-low shadow-sm flex items-center justify-between">
            <div>
              <span className="font-label-md text-label-md text-outline uppercase tracking-wider block">Rawat Inap Aktif</span>
              <span className="font-headline-lg text-headline-lg text-on-surface font-semibold">{patients.filter(p => p.status === 'ACTIVE').length}</span>
              <span className="font-code-xs text-code-xs text-secondary flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-[12px]">trending_up</span> 98.2% Bed Occupancy
              </span>
            </div>
            <div className="w-10 h-10 rounded bg-surface-container-highest flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">hotel</span>
            </div>
          </div>
          <div className="p-space-md rounded-lg bg-surface-container-low shadow-sm flex items-center justify-between">
            <div>
              <span className="font-label-md text-label-md text-outline uppercase tracking-wider block">Rawat Jalan Hari Ini</span>
              <span className="font-headline-lg text-headline-lg text-on-surface font-semibold">{patients.filter(p => p.status === 'OUTPATIENT').length}</span>
              <span className="font-code-xs text-code-xs text-outline-variant mt-0.5">Antrean aktif: 24</span>
            </div>
            <div className="w-10 h-10 rounded bg-surface-container-highest flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[22px]">directions_walk</span>
            </div>
          </div>
          <div className="p-space-md rounded-lg bg-surface-container-low shadow-sm flex items-center justify-between">
            <div>
              <span className="font-label-md text-label-md text-outline uppercase tracking-wider block">Studi DICOM 24 Jam</span>
              <span className="font-headline-lg text-headline-lg text-on-surface font-semibold">1.248</span>
              <span className="font-code-xs text-code-xs text-secondary mt-0.5">+420 GB sinkron</span>
            </div>
            <div className="w-10 h-10 rounded bg-surface-container-highest flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[22px]">radiology</span>
            </div>
          </div>
          <div className="p-space-md rounded-lg bg-surface-container-low shadow-sm flex items-center justify-between">
            <div>
              <span className="font-label-md text-label-md text-outline uppercase tracking-wider block">TrueNAS Quota Used</span>
              <div className="flex items-baseline gap-1.5">
                <span className="font-headline-lg text-headline-lg text-on-surface font-semibold">68.4%</span>
                <span className="font-code-xs text-code-xs text-outline">ZFS z2</span>
              </div>
              <span className="font-code-xs text-code-xs text-outline-variant mt-0.5">31.6 TB Free</span>
            </div>
            <div className="w-10 h-10 rounded bg-surface-container-highest flex items-center justify-center text-outline">
              <span className="material-symbols-outlined text-[22px]">database</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filter, Search, & View Toolbar */}
      <section className="p-space-md rounded-lg bg-surface-container shadow-sm flex flex-col xl:flex-row gap-space-md items-stretch xl:items-center justify-between">
        {/* Search Field with leading scan-indicator icon */}
        <div className="relative flex-1 min-w-[280px] max-w-xl">
          <span className="material-symbols-outlined absolute left-space-md top-1/2 -translate-y-1/2 text-outline text-[18px]">barcode_scanner</span>
          <input
            className="w-full h-9 pl-10 pr-20 bg-surface-container-lowest text-on-surface rounded font-code-sm text-code-sm placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container shadow-inner"
            placeholder="Scan Barcode / Cari No RM, NIK, Nama Lengkap..."
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
          />
          <div className="absolute right-space-sm top-1/2 -translate-y-1/2 flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-surface-container-highest font-code-xs text-code-xs text-outline">⌘F</kbd>
          </div>
        </div>

        {/* Dropdown Selects Filter Bar */}
        <div className="flex items-center gap-space-sm flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-surface-container-low px-space-sm py-1 rounded">
            <span className="font-label-md text-label-md text-outline">Status:</span>
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              options={statusOptions}
              placeholder="Semua Status"
              className="bg-transparent"
            />
          </div>
          {/* Gender Filter */}
          <div className="flex items-center gap-1.5 bg-surface-container-low px-space-sm py-1 rounded">
            <span className="font-label-md text-label-md text-outline">Gender:</span>
            <Select
              value={genderFilter}
              onChange={(e) => { setGenderFilter(e.target.value); setPage(1); }}
              options={genderOptions}
              placeholder="Semua (L/P)"
              className="bg-transparent"
            />
          </div>
          {/* Reset Button */}
          {hasFilters && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="p-1.5 rounded hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors"
              onClick={() => { setGenderFilter(''); setStatusFilter(''); setPage(1); }}
              title="Reset Filter"
            >
              <span className="material-symbols-outlined text-[18px]">restart_alt</span>
            </Button>
          )}
        </div>
      </section>

      {/* Dense Clinical Data Table */}
      <section>
        <div className="rounded-lg bg-surface-container shadow-md overflow-hidden">
          <Table
            columns={columns}
            data={patients}
            keyExtractor={(p) => p.id}
            loading={loading}
            sortColumn={sortBy}
            sortDirection={sortOrder}
            onSort={handleSort}
            selectable
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
            pagination={{
              page,
              pageSize,
              total,
              onPageChange: setPage,
              onPageSizeChange: setPageSize,
            }}
            emptyMessage="Tidak ada pasien yang ditemukan. Coba ubah filter atau daftarkan pasien baru."
            compact
            striped
            hoverable
          />
        </div>
      </section>
    </div>
  );
}