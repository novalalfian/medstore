'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Shield, KeyRound, Mail, Lock, AlertCircle } from 'lucide-react';
import { login, verifyMfa } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { Button, Input, Card, Alert } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState('');

  const validateForm = () => {
    let valid = true;
    if (!email) {
      setEmailError('Email wajib diisi');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Format email tidak valid');
      valid = false;
    } else {
      setEmailError('');
    }

    if (!password) {
      setPasswordError('Kata sandi wajib diisi');
      valid = false;
    } else {
      setPasswordError('');
    }
    return valid;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.mfa_required && res.mfa_token) {
        setMfaRequired(true);
        setMfaToken(res.mfa_token);
        toast('Masukkan kode MFA 6-digit', { icon: '🔐' });
      } else if (res.access_token && res.user) {
        setAuth(res.access_token, res.user);
        toast.success(`Selamat datang, ${res.user.full_name}`);
        router.push('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Gagal masuk. Periksa kembali akun Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode || mfaCode.length !== 6) {
      setMfaError('Kode MFA harus 6 digit');
      return;
    }
    setMfaError('');

    setLoading(true);
    try {
      const res = await verifyMfa(mfaToken, mfaCode);
      if (res.access_token && res.user) {
        setAuth(res.access_token, res.user);
        toast.success(`Verifikasi berhasil. Selamat datang, ${res.user.full_name}`);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setMfaError('Kode MFA tidak valid atau telah kedaluwarsa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-primary)] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
              <Shield className="w-8 h-8" />
            </div>
            <span className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">MedStore</span>
          </div>
          <h2 className="text-lg font-medium text-neutral-600 dark:text-neutral-400">
            Sistem Penyimpanan & Rekam Medis Klinis
          </h2>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            Kepatuhan UU PDP No. 27/2022 & Permenkes No. 24/2022
          </p>
        </div>

        {/* Login Card */}
        <Card variant="elevated" padding="lg" className="card-clinical-elevated">
          {!mfaRequired ? (
            <form className="space-y-5" onSubmit={handleLogin}>
              <div>
                <Input
                  label="Email Akun"
                  type="email"
                  placeholder="nama@medstore.local"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                  error={emailError}
                  iconLeft={<Mail className="h-4 w-4" />}
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <Input
                  label="Kata Sandi"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                  error={passwordError}
                  iconLeft={<Lock className="h-4 w-4" />}
                  autoComplete="current-password"
                  required
                />
              </div>

              <div className="pt-2">
                <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
                  Masuk ke Sistem
                </Button>
              </div>

              <Alert variant="info" className="text-xs">
                <div className="flex items-center justify-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Default Superadmin: <b>admin@medstore.local</b> / <b>Admin123!</b></span>
                </div>
              </Alert>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleVerifyMfa}>
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-primary-100 dark:bg-primary-900/30 mb-4">
                  <KeyRound className="h-7 w-7 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Autentikasi Dua Faktor (MFA)</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                  Buka aplikasi autentikator Anda (Google Authenticator) dan masukkan 6-digit kode OTP.
                </p>
              </div>

              <div>
                <Input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={mfaCode}
                  onChange={(e) => { setMfaCode(e.target.value.replace(/\D/g, '')); setMfaError(''); }}
                  placeholder="000000"
                  error={mfaError}
                  className="tracking-widest text-center text-2xl font-mono"
                />
              </div>

              {mfaError && (
                <Alert variant="danger" className="text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {mfaError}
                </Alert>
              )}

              <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
                Verifikasi & Masuk
              </Button>

              <button
                type="button"
                onClick={() => { setMfaRequired(false); setMfaCode(''); }}
                className="w-full text-center text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 underline"
              >
                Kembali ke login email
              </button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}