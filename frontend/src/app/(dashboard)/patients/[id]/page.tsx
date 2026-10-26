'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Upload,
  FileText,
  Download,
  Trash2,
  Eye,
  Calendar,
  User,
  Hash,
  ShieldCheck,
  CheckCircle,
  ChevronDown,
  Clock,
} from 'lucide-react';
import { getPatient, getDocuments, uploadDocument, downloadDocument, previewDocument, deleteDocument } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import type { Patient, Document } from '@/types';
import { Button, Select, Card, Badge, Table, Modal, Dropdown, Avatar, SkeletonCard } from '@/components/ui';
import { formatBytes, formatRelativeTime, cn } from '@/lib/utils';

// Lazy load heavy components
const MultiFileUpload = dynamic(() => import('@/components/ui/MultiFileUpload').then(m => m.default), {
  ssr: false,
  loading: () => (
    <div className="animate-pulse space-y-4 border-2 border-dashed border-neutral-300 rounded-xl p-6 text-center">
      <div className="h-12 w-12 mx-auto bg-neutral-200 rounded-full" />
      <div className="h-4 w-3/4 mx-auto bg-neutral-200 rounded mt-2" />
    </div>
  ),
});

const CATEGORIES: { label: string; value: string }[] = [
  { label: 'Semua', value: 'ALL' },
  { label: 'Laboratorium', value: 'Lab' },
  { label: 'Radiologi', value: 'Radiologi' },
  { label: 'Konsultasi', value: 'Konsultasi' },
  { label: 'Identitas', value: 'Identitas' },
  { label: 'Rujukan', value: 'Rujukan' },
  { label: 'Lainnya', value: 'Lainnya' },
];

const CATEGORY_OPTIONS = CATEGORIES.filter(c => c.value !== 'ALL').map(c => ({ value: c.value, label: c.label }));

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const { hasAnyRole } = useAuthStore();
  const canUpload = hasAnyRole(['SUPERADMIN', 'DOKTER', 'ADMIN_PENDAFTARAN', 'LAB', 'RADIOGRAFER']);
  const canDelete = hasAnyRole(['SUPERADMIN']);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('Lab');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  useEffect(() => {
    loadDocuments();
  }, [patientId, selectedCategory, page]);

  const loadPatientData = async () => {
    try {
      const data = await getPatient(patientId);
      setPatient(data);
    } catch (err) {
      toast.error('Gagal memuat data pasien');
    }
  };

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await getDocuments(patientId, {
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        page,
        page_size: 10,
      });
      setDocuments(res.items);
      setTotalDocs(res.total);
    } catch (err) {
      toast.error('Gagal memuat dokumen');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const blob = await downloadDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = doc.filename || doc.title;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Unduhan selesai');
    } catch (err) {
      toast.error('Gagal mengunduh dokumen');
    }
  };

  const handlePreview = async (doc: Document) => {
    try {
      const blob = await previewDocument(doc.id);
      const url = window.URL.createObjectURL(blob);
      setPreviewDoc(doc);
      setPreviewUrl(url);
    } catch (err) {
      toast.error('Gagal membuka preview dokumen');
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Hapus dokumen "${doc.title}"? Dokumen akan di-soft-delete.`)) return;
    try {
      await deleteDocument(doc.id);
      toast.success('Dokumen berhasil dihapus');
      loadDocuments();
    } catch (err) {
      toast.error('Gagal menghapus dokumen');
    }
  };

  const handleBatchUploadComplete = (result: { uploaded: any[]; failed: any[] }) => {
    if (result.uploaded.length > 0) {
      toast.success(`${result.uploaded.length} dokumen berhasil diunggah dan diverifikasi SHA-256`);
      loadDocuments();
    }
    if (result.failed.length > 0) {
      toast.error(`${result.failed.length} dokumen gagal diunggah`);
    }
  };

  const columns = useMemo(() => {
    return [
      {
        key: 'title',
        header: 'Nama Dokumen',
        render: (d: Document) => (
          <div>
            <div className="font-medium text-neutral-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary-600 flex-shrink-0" />
              <span>{d.title}</span>
            </div>
            <div className="text-xs text-neutral-400 dark:text-neutral-500 font-mono mt-0.5 truncate max-w-xs" title={d.checksum}>
              SHA-256: {d.checksum ? d.checksum.substring(0, 16) + '...' : '-'}
            </div>
          </div>
        ),
      },
      {
        key: 'category',
        header: 'Kategori',
        width: '140px',
        render: (d: Document) => (
          <Badge variant="primary" size="sm" dot className="capitalize">
            {d.category}
          </Badge>
        ),
      },
      {
        key: 'version',
        header: 'Versi',
        width: '80px',
        render: (d: Document) => (
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300">
            v{d.version}
          </span>
        ),
      },
      {
        key: 'size_bytes',
        header: 'Ukuran',
        width: '100px',
        render: (d: Document) => (
          <span className="text-xs text-neutral-600 dark:text-neutral-400 font-mono tabular-nums">{formatBytes(d.size_bytes)}</span>
        ),
      },
      {
        key: 'created_at',
        header: 'Waktu Upload',
        width: '160px',
        render: (d: Document) => (
          <span className="text-xs text-neutral-600 dark:text-neutral-400">{formatRelativeTime(d.created_at)}</span>
        ),
      },
      {
        key: 'actions',
        header: 'Aksi',
        width: '140px',
        render: (d: Document) => {
          const items = [
            {
              label: 'Preview',
              icon: <Eye className="h-4 w-4" />,
              onClick: () => handlePreview(d),
            },
            {
              label: 'Unduh',
              icon: <Download className="h-4 w-4" />,
              onClick: () => handleDownload(d),
            },
            ...(canDelete ? [
              { divider: true } as const,
              {
                label: 'Hapus',
                icon: <Trash2 className="h-4 w-4" />,
                onClick: () => handleDelete(d),
                danger: true,
              },
            ] : []),
          ];
          return (
            <Dropdown
              trigger={
                <Button variant="ghost" size="icon-sm" className="text-neutral-500 hover:text-neutral-700">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              }
              items={items}
              align="right"
            />
          );
        },
      },
    ];
  }, [canDelete]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in">
      {/* Top back & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/patients"
            className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Daftar Pasien
          </Link>
          <Link
            href={`/patients/${patientId}/timeline`}
            className="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20"
          >
            <Clock className="w-4 h-4" />
            Lihat Timeline
          </Link>
        </div>
        {canUpload && (
          <Button variant="primary" onClick={() => setIsUploadOpen(true)} iconLeft={<Upload className="w-4 h-4" />}>
            Upload Dokumen
          </Button>
        )}
      </div>

      {/* Patient Header Card */}
      {patient ? (
        <Card variant="default" padding="lg" className="border-neutral-200 dark:border-neutral-700 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">{patient.full_name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={patient.status === 'ACTIVE' ? 'success' : 'default'} size="sm" dot>
                      {patient.status === 'ACTIVE' ? 'Rekam Medis Aktif' : 'Arsip'}
                    </Badge>
                    <Badge variant="outline" size="sm" className="font-mono">
                      {patient.medical_record_number}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-neutral-600 dark:text-neutral-400 pt-2">
                <span className="flex items-center gap-1.5 font-mono bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 px-2.5 py-0.5 rounded font-semibold">
                  <Hash className="w-3.5 h-3.5" />
                  {patient.medical_record_number}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  Lahir: {patient.date_of_birth}
                </span>
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-neutral-400" />
                  {patient.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-success-700 dark:text-success-300 bg-success-50 dark:bg-success-900/20 px-3 py-2 rounded-lg border border-success-200 dark:border-success-800">
              <ShieldCheck className="w-4 h-4" />
              <span>Penyimpanan Terverifikasi WORM & UU PDP</span>
            </div>
          </div>
        </Card>
      ) : (
        <Card variant="default" padding="lg" className="border-neutral-200 dark:border-neutral-700 animate-pulse">
          <SkeletonCard />
        </Card>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-700 pb-2 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => {
              setSelectedCategory(cat.value);
              setPage(1);
            }}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
              selectedCategory === cat.value
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800'
            )}
          >
            {cat.label}
          </button>
        ))}
        <span className="ml-auto px-2 text-sm text-neutral-500 dark:text-neutral-400">
          Total: <span className="font-semibold text-neutral-900 dark:text-white">{totalDocs}</span> dokumen
        </span>
      </div>

      {/* Documents Table */}
      <Card variant="default" className="border-neutral-200 dark:border-neutral-700 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm overflow-hidden" padding="none">
        <Table
          columns={columns}
          data={documents}
          loading={loading}
          keyExtractor={(d) => d.id}
          pagination={{
            page: page,
            pageSize: 20,
            total: totalDocs,
            onPageChange: setPage,
            onPageSizeChange: (size) => {},
          }}
          emptyMessage="Belum ada dokumen dalam kategori ini. Klik 'Upload Dokumen' untuk menambahkan berkas medis."
          striped
          hoverable
          compact
        />
      </Card>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => !uploading && setIsUploadOpen(false)}
        title="Upload Dokumen Medis (Multi-file)"
        size="xl"
      >
        <div className="space-y-4">
          <Select
            label="Kategori Dokumen *"
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value)}
            options={CATEGORY_OPTIONS}
            required
          />

          <Suspense fallback={
            <div className="animate-pulse space-y-4 border-2 border-dashed border-neutral-300 rounded-xl p-6 text-center">
              <div className="h-12 w-12 mx-auto bg-neutral-200 rounded-full" />
              <div className="h-4 w-3/4 mx-auto bg-neutral-200 rounded mt-2" />
            </div>
          }>
            <MultiFileUpload
              patientId={patientId}
              category={uploadCategory}
              onUploadComplete={handleBatchUploadComplete}
              onUploadProgress={setUploadProgress}
              maxFiles={10}
              maxSizeMB={100}
              accept=".pdf,.jpg,.jpeg,.png,.dcm"
            />
          </Suspense>

          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsUploadOpen(false)}
              disabled={uploading}
            >
              Tutup
            </Button>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={!!previewDoc}
        onClose={() => {
          if (previewUrl) window.URL.revokeObjectURL(previewUrl);
          setPreviewDoc(null);
          setPreviewUrl(null);
        }}
        title={`Preview: ${previewDoc?.title || ''}`}
        size="xl"
      >
        <div className="min-h-[400px] flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 rounded-lg p-2">
          {previewUrl && previewDoc?.mime_type.includes('image') ? (
            <img src={previewUrl} alt={previewDoc.title} className="max-h-[600px] object-contain rounded" />
          ) : previewUrl && previewDoc?.mime_type.includes('pdf') ? (
            <iframe src={previewUrl} className="w-full h-[600px] rounded border border-neutral-200 dark:border-neutral-700" />
          ) : (
            <div className="text-center p-8 text-neutral-500 dark:text-neutral-400">
              <p className="text-sm">Format preview inline tidak didukung untuk tipe MIME ini ({previewDoc?.mime_type}).</p>
              {previewDoc && (
                <Button
                  variant="primary"
                  className="mt-4"
                  onClick={() => handleDownload(previewDoc)}
                  iconLeft={<Download className="w-4 h-4" />}
                >
                  Unduh Dokumen
                </Button>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}