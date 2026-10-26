'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { createPatient } from '@/lib/api';
import { Button, Input, Select, Card } from '@/components/ui';

export default function NewPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    medical_record_number: '',
    full_name: '',
    date_of_birth: '',
    gender: 'MALE',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.medical_record_number.trim()) {
      newErrors.medical_record_number = 'Nomor Rekam Medis wajib diisi';
    }
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Nama lengkap wajib diisi';
    }
    if (!formData.date_of_birth) {
      newErrors.date_of_birth = 'Tanggal lahir wajib diisi';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const patient = await createPatient(formData);
      toast.success('Pasien berhasil didaftarkan');
      router.push(`/patients/${patient.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Gagal mendaftarkan pasien. No. RM mungkin sudah terdaftar.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <Link
          href="/patients"
          className="p-2 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <UserPlus className="w-6 h-6 text-primary-600" />
            Pendaftaran Pasien Baru
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Formulir pendaftaran rekam medis digital klinik.
          </p>
        </div>
      </div>

      <Card variant="default" padding="lg" className="border-neutral-200">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Nomor Rekam Medis (No. RM) *"
            placeholder="Contoh: RM-2026-0001"
            value={formData.medical_record_number}
            onChange={(e) => handleChange('medical_record_number', e.target.value.toUpperCase())}
            error={errors.medical_record_number}
            required
          />
          <p className="text-xs text-neutral-500">
            Harus unik sesuai nomor rekam medis fisik/sistem SIMRS.
          </p>

          <Input
            label="Nama Lengkap Pasien *"
            placeholder="Masukkan nama lengkap sesuai KTP"
            value={formData.full_name}
            onChange={(e) => handleChange('full_name', e.target.value)}
            error={errors.full_name}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Tanggal Lahir *"
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => handleChange('date_of_birth', e.target.value)}
              error={errors.date_of_birth}
              required
            />

            <Select
              label="Jenis Kelamin *"
              value={formData.gender}
              onChange={(e) => handleChange('gender', e.target.value)}
              options={[
                { value: 'MALE', label: 'Laki-laki' },
                { value: 'FEMALE', label: 'Perempuan' },
                { value: 'OTHER', label: 'Lainnya' },
              ]}
              required
            />
          </div>

          <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-3">
            <Link href="/patients">
              <Button type="button" variant="secondary">
                Batal
              </Button>
            </Link>
            <Button type="submit" variant="primary" loading={loading} iconLeft={<UserPlus className="w-4 h-4" />}>
              Simpan & Buka Berkas Pasien
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}