'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { User, Mail, Lock, Shield, Camera, Save, X } from 'lucide-react';
import { useAuthStore } from '@/lib/auth';
import { Button, Input, Card, Avatar, Badge } from '@/components/ui';

export default function ProfilePage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: '',
    department: '',
  });

  const [securityData, setSecurityData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // In real app, call updateProfile API
      toast.success('Profil berhasil diperbarui');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Gagal memperbarui profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (securityData.new_password !== securityData.confirm_password) {
      toast.error('Konfirmasi kata sandi tidak cocok');
      return;
    }
    if (securityData.new_password.length < 8) {
      toast.error('Kata sandi minimal 8 karakter');
      return;
    }
    setLoading(true);
    try {
      // In real app, call changePassword API
      toast.success('Kata sandi berhasil diubah');
      setSecurityData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Gagal mengubah kata sandi');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    if (activeTab === 'profile') {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else {
      setSecurityData(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in">
      <div className="flex items-center gap-4">
        <Avatar
          name={user?.full_name || user?.email}
          size="xl"
          variant="primary"
        />
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">{user?.full_name || 'Pengguna'}</h2>
          <p className="text-sm text-neutral-500">{user?.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="primary" size="sm">{user?.roles?.[0] || 'USER'}</Badge>
            <Badge variant="outline" size="sm">{user?.mfa_enabled ? 'MFA Aktif' : 'MFA Nonaktif'}</Badge>
          </div>
        </div>
      </div>

      <div className="flex border-b border-neutral-200">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <User className="w-4 h-4 inline mr-1" /> Profil
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'security'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <Shield className="w-4 h-4 inline mr-1" /> Keamanan
        </button>
      </div>

      {activeTab === 'profile' && (
        <Card variant="default" padding="lg" className="border-neutral-200">
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nama Lengkap"
                value={formData.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                required
                iconLeft={<User className="h-4 w-4" />}
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                iconLeft={<Mail className="h-4 w-4" />}
              />
              <Input
                label="Nomor Telepon"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="08xx-xxxx-xxxx"
              />
              <Input
                label="Departemen/Unit"
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
                placeholder="Contoh: Radiologi, Laboratorium, dll"
              />
            </div>
            <div className="pt-4 border-t border-neutral-200 flex justify-end gap-2">
              <Button type="submit" variant="primary" loading={loading} iconLeft={<Save className="w-4 h-4" />}>
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </Card>
      )}

      {activeTab === 'security' && (
        <Card variant="default" padding="lg" className="border-neutral-200">
          <form onSubmit={handleSecuritySubmit} className="space-y-4">
            <Input
              label="Kata Sandi Saat Ini"
              type="password"
              value={securityData.current_password}
              onChange={(e) => handleChange('current_password', e.target.value)}
              required
              iconLeft={<Lock className="h-4 w-4" />}
            />
            <Input
              label="Kata Sandi Baru"
              type="password"
              value={securityData.new_password}
              onChange={(e) => handleChange('new_password', e.target.value)}
              required
              iconLeft={<Lock className="h-4 w-4" />}
            />
            <Input
              label="Konfirmasi Kata Sandi Baru"
              type="password"
              value={securityData.confirm_password}
              onChange={(e) => handleChange('confirm_password', e.target.value)}
              required
              iconLeft={<Lock className="h-4 w-4" />}
            />
            <div className="pt-4 border-t border-neutral-200 flex justify-end gap-2">
              <Button type="submit" variant="primary" loading={loading} iconLeft={<Save className="w-4 h-4" />}>
                Ubah Kata Sandi
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-neutral-200">
            <h3 className="font-semibold text-neutral-900 mb-3">Autentikasi Dua Faktor (MFA)</h3>
            <p className="text-sm text-neutral-500 mb-4">
              {user?.mfa_enabled
                ? 'MFA sudah aktif. Kode OTP 6-digit diperlukan saat login.'
                : 'Aktifkan MFA untuk keamanan tambahan menggunakan Google Authenticator.'}
            </p>
            <Button
              variant={user?.mfa_enabled ? 'secondary' : 'primary'}
              iconLeft={<Shield className="w-4 h-4" />}
            >
              {user?.mfa_enabled ? 'Nonaktifkan MFA' : 'Aktifkan MFA'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}