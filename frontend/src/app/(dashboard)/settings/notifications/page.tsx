'use client';

import React from 'react';
import toast from 'react-hot-toast';
import { Bell, Mail, Smartphone, Save } from 'lucide-react';
import { Button, Card, Switch } from '@/components/ui';
import { useNotificationPrefs } from '@/lib/preferences';

export default function NotificationsSettingsPage() {
  const { 
    emailPrefs, setEmailPrefs,
    pushPrefs, setPushPrefs,
    inAppPrefs, setInAppPrefs
  } = useNotificationPrefs();

  const togglePref = (type: 'email' | 'push' | 'inApp', key: string) => {
    if (type === 'email') {
      setEmailPrefs({ ...emailPrefs, [key]: !emailPrefs[key] });
    } else if (type === 'push') {
      setPushPrefs({ ...pushPrefs, [key]: !pushPrefs[key] });
    } else {
      setInAppPrefs({ ...inAppPrefs, [key]: !inAppPrefs[key] });
    }
    toast.success('Preferensi diperbarui');
  };

  const notificationTypes = [
    { key: 'new_patient', label: 'Pasien Baru', desc: 'Notifikasi saat pasien baru didaftarkan' },
    { key: 'document_upload', label: 'Upload Dokumen', desc: 'Notifikasi saat dokumen baru diunggah' },
    { key: 'document_shared', label: 'Berbagi Dokumen', desc: 'Notifikasi saat dokumen dibagikan kepada Anda' },
    { key: 'retention_expiring', label: 'Masa Retensi', desc: 'Peringatan dokumen yang mendekati masa retensi' },
    { key: 'system_alerts', label: 'Alert Sistem', desc: 'Pemberitahuan pemeliharaan dan keamanan sistem' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <button onClick={() => window.history.back()} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary-600" />
            Notifikasi
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Kelola bagaimana dan kapan Anda menerima notifikasi.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Email Notifications */}
        <Card variant="default" padding="lg" className="border-neutral-200 dark:border-neutral-700">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary-600" />
            Email
          </h3>
          <div className="space-y-4">
            {notificationTypes.map((type) => (
              <div key={type.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">{type.label}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{type.desc}</p>
                </div>
                <Switch
                  checked={emailPrefs[type.key]}
                  onChange={() => togglePref('email', type.key)}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Push Notifications */}
        <Card variant="default" padding="lg" className="border-neutral-200 dark:border-neutral-700">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary-600" />
            Push Notification (Browser)
          </h3>
          <div className="space-y-4">
            {notificationTypes.map((type) => (
              <div key={type.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">{type.label}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{type.desc}</p>
                </div>
                <Switch
                  checked={pushPrefs[type.key]}
                  onChange={() => togglePref('push', type.key)}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* In-App Notifications */}
        <Card variant="default" padding="lg" className="border-neutral-200 dark:border-neutral-700">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary-600" />
            Dalam Aplikasi
          </h3>
          <div className="space-y-4">
            {notificationTypes.map((type) => (
              <div key={type.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">{type.label}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{type.desc}</p>
                </div>
                <Switch
                  checked={inAppPrefs[type.key]}
                  onChange={() => togglePref('inApp', type.key)}
                />
              </div>
            ))}
          </div>
        </Card>

        <div className="flex justify-end">
          <Button variant="primary" onClick={() => toast.success('Preferensi otomatis tersimpan')} iconLeft={<Save className="w-4 h-4" />}>
            Simpan Perubahan
          </Button>
        </div>
      </div>
    </div>
  );
}
