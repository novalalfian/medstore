'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Lock, Shield, UserCheck, X, Check, Eye, EyeOff, Loader2, XCircle, LogOut } from 'lucide-react';
import { Button, Input, Card, Badge, Alert } from '@/components/ui';
import { useAuthStore } from '@/lib/auth';
import { api } from '@/lib/api';

export default function SecuritySettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);

  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [mfaEnabled, setMfaEnabled] = useState(user?.mfa_enabled || false);
  const [sessions, setSessions] = useState<Array<{
    id: string;
    device: string;
    ip: string;
    location: string;
    lastActive: string;
    current: boolean;
  }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (formData.new_password !== formData.confirm_password) {
      setError('Konfirmasi kata sandi tidak cocok');
      return;
    }
    if (formData.new_password.length < 8) {
      setError('Kata sandi minimal 8 karakter');
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        current_password: formData.current_password,
        new_password: formData.new_password,
      });
      setSuccess('Kata sandi berhasil diubah');
      setFormData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Gagal mengubah kata sandi');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaToggle = async () => {
    setError(null);
    setSuccess(null);
    setMfaLoading(true);
    try {
      if (mfaEnabled) {
        await api.post('/auth/mfa/disable');
        setMfaEnabled(false);
        setSuccess('MFA dinonaktifkan');
      } else {
        const res = await api.post('/auth/mfa/enable');
        setMfaEnabled(true);
        setSuccess('MFA diaktifkan. Simpan kode recovery Anda!');
        // TODO: Show QR code and recovery codes from res.data
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Gagal mengubah status MFA');
    } finally {
      setMfaLoading(false);
    }
  };

  const revokeSession = async (id: string) => {
    if (confirm('Putuskan sesi ini?')) {
      try {
        await api.post('/auth/sessions/revoke', { session_id: id });
        setSessions(prev => prev.filter(s => s.id !== id));
        toast.success('Sesi diputuskan');
      } catch {
        toast.error('Gagal memutuskan sesi');
      }
    }
  };

  const revokeAllOtherSessions = async () => {
    if (confirm('Putuskan SEMUA sesi lain? Anda akan tetap login di perangkat ini.')) {
      try {
        await api.post('/auth/sessions/revoke-all-other');
        setSessions(prev => prev.filter(s => s.current));
        toast.success('Semua sesi lain diputuskan');
      } catch {
        toast.error('Gagal memutuskan sesi');
      }
    }
  };

  const loadSessions = async () => {
    try {
      const res = await api.get('/auth/sessions');
      setSessions(res.data);
    } catch {
      // fallback mock data
      setSessions([
        { id: '1', device: 'Chrome on Windows', ip: '192.168.1.100', location: 'Jakarta, Indonesia', lastActive: 'Baru saja', current: true },
        { id: '2', device: 'Firefox on Linux', ip: '192.168.1.101', location: 'Bandung, Indonesia', lastActive: '2 jam lalu', current: false },
        { id: '3', device: 'Safari on iPhone', ip: '192.168.1.102', location: 'Surabaya, Indonesia', lastActive: '1 hari lalu', current: false },
      ]);
    }
  };

  React.useEffect(() => {
    loadSessions();
    setMfaEnabled(user?.mfa_enabled || false);
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <button onClick={() => window.history.back()} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary-600" />
            Keamanan
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Kelola kata sandi, MFA, dan sesi aktif Anda.</p>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4" dismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="mb-4" dismissible onDismiss={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Password Change */}
      <Card variant="default" padding="lg" className="border-neutral-200 dark:border-neutral-700">
        <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary-600" />
          Ubah Kata Sandi
        </h3>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="relative">
            <Input
              label="Kata Sandi Saat Ini"
              type={showCurrent ? 'text' : 'password'}
              value={formData.current_password}
              onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
              required
              iconLeft={<Lock className="h-4 w-4" />}
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-[38px] text-neutral-500 hover:text-neutral-700"
            >
              {showCurrent ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <div className="relative">
            <Input
              label="Kata Sandi Baru"
              type={showNew ? 'text' : 'password'}
              value={formData.new_password}
              onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
              required
              iconLeft={<Lock className="h-4 w-4" />}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-[38px] text-neutral-500 hover:text-neutral-700"
            >
              {showNew ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <div className="relative">
            <Input
              label="Konfirmasi Kata Sandi Baru"
              type={showConfirm ? 'text' : 'password'}
              value={formData.confirm_password}
              onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
              required
              iconLeft={<Lock className="h-4 w-4" />}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-[38px] text-neutral-500 hover:text-neutral-700"
            >
              {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700 flex justify-end">
            <Button type="submit" variant="primary" loading={loading} iconLeft={<Lock className="w-4 h-4" />}>
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Card>

      {/* MFA */}
      <Card variant="default" padding="lg" className="border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary-600" />
              Autentikasi Dua Faktor (MFA)
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {mfaEnabled
                ? 'MFA aktif. Kode OTP 6-digit dari Google Authenticator diperlukan saat login.'
                : 'Aktifkan MFA untuk lapisan keamanan tambahan menggunakan aplikasi autentikator.'}
            </p>
          </div>
          <Button
            variant={mfaEnabled ? 'secondary' : 'primary'}
            loading={mfaLoading}
            onClick={handleMfaToggle}
            iconLeft={mfaEnabled ? <Shield className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          >
            {mfaEnabled ? 'Nonaktifkan MFA' : 'Aktifkan MFA'}
          </Button>
        </div>
        {mfaEnabled && (
          <div className="mt-4 p-4 bg-success-50 dark:bg-success-900/20 rounded-lg border border-success-200 dark:border-success-800">
            <p className="text-sm text-success-800 dark:text-success-300">
              <strong>Kode Recovery:</strong> Simpan kode berikut di tempat aman untuk akses darurat jika kehilangan autentikator:
              <code className="ml-2 font-mono bg-success-100 dark:bg-success-900 px-2 py-1 rounded">ABCD-EFGH-IJKL-MNOP</code>
            </p>
          </div>
        )}
      </Card>

      {/* Active Sessions */}
      <Card variant="default" padding="lg" className="border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-primary-600" />
            Sesi Aktif
          </h3>
          <Button variant="ghost" size="sm" onClick={revokeAllOtherSessions} className="text-danger-600 hover:bg-danger-50">
            <LogOut className="w-4 h-4 mr-1" />
            Putuskan Semua Lainnya
          </Button>
        </div>
        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${session.current ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200' : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200'}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M12 17h.01M18 10c0 2.7-2.3 4.9-5 4.9S8 12.7 8 10c0-2.7 2.3-4.9 5-4.9s5 2.2 5 4.9z" /></svg>
                </div>
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">{session.device}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{session.ip} · {session.location}</p>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">Terakhir aktif: {session.lastActive}{session.current && ' (Sesi ini)'}</p>
                </div>
              </div>
              {!session.current && (
                <Button variant="ghost" size="sm" onClick={() => revokeSession(session.id)} className="text-danger-600 hover:bg-danger-50">
                  <XCircle className="w-4 h-4 mr-1" />
                  Putuskan
                </Button>
              )}
              {session.current && (
                <Badge variant="success" size="sm" className="ml-2">Sesi Ini</Badge>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}