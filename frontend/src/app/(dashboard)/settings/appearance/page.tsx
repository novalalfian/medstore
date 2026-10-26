'use client';

import React from 'react';
import toast from 'react-hot-toast';
import { Palette, Sun, Moon, Check, Globe, Type, Save } from 'lucide-react';
import { Button, Card, Select, Badge, Switch } from '@/components/ui';
import { useAppearancePrefs } from '@/lib/preferences';

export default function AppearanceSettingsPage() {
  const { 
    theme, setTheme,
    language, setLanguage,
    fontSize, setFontSize,
    compactMode, setCompactMode,
    animationsEnabled, setAnimationsEnabled,
    sidebarCollapsed, setSidebarCollapsed
  } = useAppearancePrefs();

  const themeOptions = [
    { value: 'light', label: 'Terang', icon: <Sun className="w-4 h-4" />, desc: 'Tema terang standar' },
    { value: 'dark', label: 'Gelap', icon: <Moon className="w-4 h-4" />, desc: 'Tema gelap untuk mata yang nyaman' },
  ];

  const languageOptions = [
    { value: 'id', label: '🇮🇩 Bahasa Indonesia' },
    { value: 'en', label: '🇺🇸 English' },
  ];

  const fontSizeOptions = [
    { value: 'small', label: 'Kecil (13px)' },
    { value: 'medium', label: 'Sedang (14px)' },
    { value: 'large', label: 'Besar (16px)' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in">
      <div className="flex items-center gap-3">
        <button onClick={() => window.history.back()} className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Palette className="w-6 h-6 text-primary-600" />
            Tampilan
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Kustomisasi tema, bahasa, dan preferensi antarmuka.</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Theme Selection */}
        <Card variant="default" padding="lg" className="border-neutral-200 dark:border-neutral-700">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary-600" />
            Tema Warna
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTheme(option.value as 'light' | 'dark')}
                className={`relative p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-3 ${
                  theme === option.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg shadow-primary-500/10'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-700'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600">
                  {option.icon}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-neutral-900 dark:text-white">{option.label}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{option.desc}</p>
                </div>
                {theme === option.value && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </Card>

        {/* Language */}
        <Card variant="default" padding="lg" className="border-neutral-200 dark:border-neutral-700">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary-600" />
            Bahasa
          </h3>
          <Select
            value={language}
            onChange={(val) => setLanguage(val as any)}
            options={languageOptions}
            placeholder="Pilih bahasa"
            className="w-full max-w-xs"
          />
        </Card>

        {/* Font Size */}
        <Card variant="default" padding="lg" className="border-neutral-200 dark:border-neutral-700">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <Type className="w-5 h-5 text-primary-600" />
            Ukuran Font
          </h3>
          <Select
            value={fontSize}
            onChange={(val) => setFontSize(val as any)}
            options={fontSizeOptions}
            placeholder="Pilih ukuran font"
            className="w-full max-w-xs"
          />
        </Card>

        {/* UI Preferences */}
        <Card variant="default" padding="lg" className="border-neutral-200 dark:border-neutral-700">
          <h3 className="font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary-600" />
            Preferensi Antarmuka
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">Mode Kompak</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Mengurangi padding dan spacing untuk tampilan lebih padat</p>
              </div>
              <Switch
                checked={compactMode}
                onChange={(e) => setCompactMode(e.target.checked)}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">Animasi</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Aktifkan transisi dan animasi halaman</p>
              </div>
              <Switch
                checked={animationsEnabled}
                onChange={(e) => setAnimationsEnabled(e.target.checked)}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
              <div>
                <p className="font-medium text-neutral-900 dark:text-white">Sidebar Diciutkan (Default)</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Mulai dengan sidebar dalam mode collapsed</p>
              </div>
              <Switch
                checked={sidebarCollapsed}
                onChange={(e) => setSidebarCollapsed(e.target.checked)}
              />
            </div>
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
