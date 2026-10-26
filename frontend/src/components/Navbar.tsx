'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import { logoutSession } from '@/lib/api';
import { Button } from '@/components/ui';
import { Avatar, Dropdown } from '@/components/ui';
import type { DropdownMenuItem } from '@/components/ui';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  message: string;
  time: string;
  read: boolean;
  icon: string; // Material Symbols name
}

const mockNotifications: Notification[] = [
  { id: '1', type: 'success', title: 'Dokumen Diunggah', message: 'CT Scan - Pasien Budi Santoso berhasil diunggah ke storage TrueNAS', time: '5 menit lalu', read: false, icon: 'description' },
  { id: '2', type: 'info', title: 'Pasien Baru', message: 'Dr. Sarah menambahkan pasien baru: Ani Wijaya (RM-2024-001)', time: '15 menit lalu', read: false, icon: 'person_add' },
  { id: '3', type: 'warning', title: 'Retensi Hampir Habis', message: '5 dokumen akan kedaluwasa retensi dalam 7 hari', time: '1 jam lalu', read: true, icon: 'warning' },
  { id: '4', type: 'danger', title: 'Storage Hampir Penuh', message: 'Pool TrueNAS "medstore-pool" tersisa 12% kapasitas', time: '3 jam lalu', read: true, icon: 'warning' },
  { id: '5', type: 'info', title: 'Backup Selesai', message: 'CloudSync job "offsite-backup" selesai tanpa error', time: '6 jam lalu', read: true, icon: 'check_circle' },
];

const typeStyles: Record<Notification['type'], string> = {
  info: 'bg-primary-container/20 text-primary',
  success: 'bg-success-container/20 text-success',
  warning: 'bg-warning-container/20 text-warning',
  danger: 'bg-danger-container/20 text-danger',
};

export default function Navbar() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();
  const { theme, toggleTheme } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const handleLogout = async () => {
    await logoutSession();
    logout();
    router.push('/login');
  };

  const primaryRole = user?.roles?.[0] || 'PENGGUNA';
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const dropdownItems: DropdownMenuItem[] = [
    {
      label: 'Profil',
      icon: <span className="material-symbols-outlined text-[18px]">person</span>,
      onClick: () => router.push('/profile'),
    },
    {
      label: 'Pengaturan',
      icon: <span className="material-symbols-outlined text-[18px]">tune</span>,
      onClick: () => router.push('/settings'),
    },
    { divider: true },
    {
      label: 'Keluar',
      icon: <span className="material-symbols-outlined text-[18px]">logout</span>,
      onClick: handleLogout,
      danger: true,
    },
  ];

  return (
    <header className={cn(
      'fixed top-0 left-64 right-0 h-16 bg-surface/80 backdrop-blur-xl z-40 flex items-center justify-between px-gutter-desktop shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-colors duration-200',
      'border-b border-outline-variant'
    )}>
      <div className="flex items-center gap-space-md flex-1 max-w-lg">
        <div className="relative w-full">
          <span className="material-symbols-outlined absolute left-gutter top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input
            className="w-full h-9 pl-10 pr-16 bg-surface-container-lowest rounded-lg font-code-sm text-code-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary-container"
            placeholder="Cari No RM, Pasien, DICOM UID, atau Berkas..."
            type="text"
          />
          <kbd className="absolute right-gutter top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-surface-container-highest font-code-xs text-code-xs text-on-surface-variant shadow-sm">Ctrl+K</kbd>
        </div>
      </div>

      <div className="flex items-center gap-space-md">
        {/* Pool Status (hidden on mobile) */}
        <div className="hidden xl:flex items-center gap-space-xs px-space-md py-1 bg-surface-container-low rounded-full">
          <span className="w-2 h-2 rounded-full bg-secondary"></span>
          <span className="font-label-md text-label-md text-on-surface">Pool OK:</span>
          <span className="font-code-xs text-code-xs text-secondary font-medium">Online 99.98%</span>
        </div>

        {/* Role Badge */}
        <span className="px-2 py-0.5 rounded bg-surface-container-highest text-primary font-label-md text-label-md tracking-wider uppercase font-semibold">SUPERADMIN</span>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className={cn(
              'relative p-space-sm rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors',
            )}
            aria-label="Notifikasi"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-error text-on-error flex items-center justify-center font-code-xs text-code-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-surface-container-low border border-outline-variant rounded-xl shadow-xl py-2 z-50 animate-slide-down">
              <div className="px-gutter py-space-sm border-b border-outline-variant flex items-center justify-between">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">Notifikasi</h3>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="text-code-xs text-primary hover:bg-primary-container/20" onClick={markAllAsRead}>
                    Tandai semua dibaca
                  </Button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-gutter py-8 text-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-[48px] block mb-2 opacity-50">notifications_off</span>
                    <p className="font-body-sm text-body-sm">Tidak ada notifikasi</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <button
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className={cn(
                        'w-full px-gutter py-space-sm hover:bg-surface-container-high transition-colors text-left',
                        !notif.read && 'bg-primary-container/10'
                      )}
                    >
                      <div className="flex items-start gap-space-sm">
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', typeStyles[notif.type])}>
                          <span className="material-symbols-outlined text-[18px]">{notif.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-label-md text-label-md text-on-surface">{notif.title}</p>
                          <p className="font-code-xs text-code-xs text-on-surface-variant truncate">{notif.message}</p>
                          <p className="font-code-xs text-code-xs text-outline mt-1">{notif.time}</p>
                        </div>
                        {!notif.read && <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />}
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="px-gutter py-space-sm border-t border-outline-variant">
                <Button variant="outline" className="w-full" onClick={() => router.push('/settings/notifications')}>
                  Lihat Semua Notifikasi
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={cn(
            'p-space-sm rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors',
          )}
          aria-label={theme === 'dark' ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
        >
          <span className="material-symbols-outlined text-[20px]">
            {theme === 'dark' ? 'light_mode' : 'dark_mode'}
          </span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-space-sm pl-space-sm cursor-pointer border-l border-outline-variant ml-2">
          <div className="flex items-center gap-space-sm">
            <Avatar
              name={user?.full_name || user?.email}
              size="md"
              variant="primary"
              status="online"
            />
            <div className="hidden sm:block text-right">
              <p className="font-label-md text-label-md text-on-surface font-medium leading-tight">
                {user?.full_name || user?.email || 'Pengguna'}
              </p>
              <p className="font-code-xs text-code-xs text-on-surface-variant capitalize">{primaryRole.toLowerCase()}</p>
            </div>
          </div>

          <Dropdown
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-xl',
                )}
                aria-label="Menu pengguna"
              >
                <span className="material-symbols-outlined text-[20px]">expand_more</span>
              </Button>
            }
            items={dropdownItems}
            align="right"
          />
        </div>
      </div>
    </header>
  );
}