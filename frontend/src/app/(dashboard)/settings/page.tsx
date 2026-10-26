'use client';

import React from 'react';
import { Settings, User, Bell, Shield, Palette, KeyRound } from 'lucide-react';
import { Card } from '@/components/ui';

import Link from 'next/link';

const settingsSections = [
  {
    title: 'Profil',
    icon: User,
    description: 'Kelola informasi profil dan preferensi akun',
    href: '/profile',
  },
  {
    title: 'Keamanan',
    icon: Shield,
    description: 'Ubah kata sandi, kelola MFA, dan sesi aktif',
    href: '/settings/security',
  },
  {
    title: 'Notifikasi',
    icon: Bell,
    description: 'Atur preferensi notifikasi email dan dalam aplikasi',
    href: '/settings/notifications',
  },
  {
    title: 'Tampilan',
    icon: Palette,
    description: 'Tema, bahasa, dan preferensi antarmuka',
    href: '/settings/appearance',
  },
];

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary-600" />
          Pengaturan
        </h2>
        <p className="text-sm text-neutral-500 mt-1">Kelola preferensi akun dan aplikasi Anda.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {settingsSections.map((section) => (
          <Link key={section.title} href={section.href}>
            <Card
              variant="default"
              padding="lg"
              className="border-neutral-200 hover:border-primary-300 hover:shadow-md transition-all duration-200 cursor-pointer h-full"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 flex-shrink-0">
                  <section.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-neutral-900">{section.title}</h3>
                  <p className="text-sm text-neutral-500 mt-1">{section.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card variant="default" padding="lg" className="border-neutral-200">
        <h3 className="font-semibold text-neutral-900 mb-4 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-primary-600" />
          Aksi Cepat
        </h3>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">
            Ubah Kata Sandi
          </button>
          <button className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors">
            Kelola MFA
          </button>
          <button className="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors">
            Sesi Aktif
          </button>
        </div>
      </Card>
    </div>
  );
}