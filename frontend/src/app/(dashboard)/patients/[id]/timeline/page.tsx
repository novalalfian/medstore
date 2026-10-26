'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  ArrowLeft,
  FileText,
  UserPlus,
  Calendar,
  Clock,
  Tag,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { getPatient, getPatientTimeline } from '@/lib/api';
import { Button, Card, Badge, Avatar, SkeletonCard, Tooltip } from '@/components/ui';
import { formatDate, formatRelativeTime } from '@/lib/utils';

export default function PatientTimelinePage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  useEffect(() => {
    loadData();
  }, [patientId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [patientData, timelineData] = await Promise.all([
        getPatient(patientId),
        getPatientTimeline(patientId),
      ]);
      setPatient(patientData);
      setTimeline(timelineData);
    } catch (err) {
      toast.error('Gagal memuat timeline pasien');
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = timeline?.events.filter((event: any) => {
    if (filterCategory === 'ALL') return true;
    return event.category === filterCategory;
  }) || [];

  const categories = timeline?.categories || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in">
      {/* Top back */}
      <Link
        href={`/patients/${patientId}`}
        className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Detail Pasien
      </Link>

      {/* Patient Header */}
      {patient ? (
        <Card variant="elevated" padding="lg" className="border-neutral-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900">{patient.full_name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" size="sm" className="font-mono">
                      {patient.medical_record_number}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-neutral-600 pt-2">
                <span className="flex items-center gap-1.5 font-mono bg-primary-50 text-primary-700 px-2.5 py-0.5 rounded font-semibold">
                  <Tag className="w-3.5 h-3.5" />
                  {patient.medical_record_number}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  Lahir: {patient.date_of_birth}
                </span>
                <span className="flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-neutral-400" />
                  {patient.gender === 'MALE' ? 'Laki-laki' : 'Perempuan'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-primary-700 bg-primary-50 px-3 py-2 rounded-lg border border-primary-200">
              <Clock className="w-4 h-4" />
              <span>Total {timeline?.total_documents || 0} dokumen di {categories.length} kategori</span>
            </div>
          </div>
        </Card>
      ) : (
        <Card variant="default" padding="lg" className="border-neutral-200 animate-pulse">
          <SkeletonCard />
        </Card>
      )}

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-2">
        <button
          onClick={() => setFilterCategory('ALL')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterCategory === 'ALL'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          Semua ({timeline?.events.length || 0})
        </button>
        {categories.map((cat: string) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterCategory === cat
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            {cat} ({timeline?.events.filter((e: any) => e.category === cat).length || 0})
          </button>
        ))}
      </div>

      {/* Timeline */}
      <Card variant="default" padding="lg" className="border-neutral-200">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} className="border-neutral-200" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium text-neutral-900 mb-1">Belum ada riwayat dokumen</p>
            <p className="text-sm">Dokumen akan muncul di sini setelah diunggah</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-neutral-200" />

            <div className="space-y-6">
              {filteredEvents.map((event: any, index: number) => (
                <div
                  key={event.id}
                  className="relative flex gap-4 pl-14"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Timeline dot */}
                  <div className={clsx(
                    'absolute left-6 w-3 h-3 rounded-full border-4 flex-shrink-0 z-10',
                    event.type === 'patient_created' ? 'bg-primary-600 border-primary-600' :
                    event.type === 'document_upload' ? 'bg-success-500 border-success-500' :
                    'bg-neutral-400 border-neutral-400'
                  )} />

                  {/* Line connector */}
                  {index < filteredEvents.length - 1 && (
                    <div className="absolute left-7 top-10 bottom-0 w-0.5 bg-neutral-200" />
                  )}

                  {/* Event card */}
                  <div className="flex-1 bg-white border border-neutral-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className={clsx(
                        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                        event.type === 'patient_created' && 'bg-primary-100 text-primary-600',
                        event.type === 'document_upload' && 'bg-success-100 text-success-600',
                      )}>
                        {event.type === 'patient_created' && <UserPlus className="w-5 h-5" />}
                        {event.type === 'document_upload' && <FileText className="w-5 h-5" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold text-neutral-900">{event.title}</h4>
                          <span className="text-xs text-neutral-500 whitespace-nowrap">
                            {formatRelativeTime(event.timestamp)}
                          </span>
                        </div>

                        <p className="text-sm text-neutral-600 mt-1">{event.description}</p>

                        {event.category && (
                          <Badge variant="outline" size="sm" className="mt-2">
                            {event.category}
                          </Badge>
                        )}

                        {event.version && (
                          <Badge variant="primary" size="sm" className="mt-2 ml-2">
                            Versi {event.version}
                          </Badge>
                        )}

                        {event.user_name && (
                          <p className="text-xs text-neutral-400 mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Oleh: {event.user_name}
                          </p>
                        )}
                      </div>
                    </div>

                    {event.document_id && (
                      <Tooltip content="Lihat detail dokumen">
                        <button
                          onClick={() => router.push(`/documents/${event.document_id}`)}
                          className="mt-3 text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
                        >
                          <ChevronRight className="w-3 h-3" />
                          Buka dokumen
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}