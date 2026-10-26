'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth';
import { useAppearancePrefs } from '@/lib/preferences';

interface NavItem {
  label: string;
  href: string;
  icon: string; // Material Symbols name
  roles?: string[];
  badge?: string;
  badgeVariant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'grid_view' },
  {
    label: 'Manajemen Pasien',
    href: '/patients',
    icon: 'badge',
    roles: ['DOKTER', 'PERAWAT', 'RADIOGRAFER', 'LAB', 'ADMIN_PENDAFTARAN', 'SUPERADMIN'],
  },
  {
    label: 'Dokumen Global',
    href: '/documents',
    icon: 'folder_shared',
    roles: ['DOKTER', 'PERAWAT', 'RADIOGRAFER', 'LAB', 'ADMIN_PENDAFTARAN', 'SUPERADMIN'],
  },
  {
    label: 'Storage TrueNAS',
    href: '/storage',
    icon: 'dns',
    roles: ['SUPERADMIN'],
    badge: 'Beta',
    badgeVariant: 'warning',
  },
  {
    label: 'Audit Trail',
    href: '/audit',
    icon: 'receipt_long',
    roles: ['AUDITOR', 'SUPERADMIN'],
  },
  {
    label: 'Administrasi & Akses',
    href: '/admin',
    icon: 'shield_person',
    roles: ['SUPERADMIN'],
  },
  {
    label: 'Pengaturan',
    href: '/settings',
    icon: 'tune',
    roles: ['SUPERADMIN'],
  },
];

interface SidebarProps {
  onToggle: () => void;
}

export default function Sidebar({ onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { sidebarCollapsed } = useAppearancePrefs();

  const userRoles = user?.roles || [];
  const collapsed = sidebarCollapsed;

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.some((r) => userRoles.includes(r));
  });

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full bg-surface-container-low z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
      role="navigation"
      aria-label="Navigasi utama"
    >
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Brand Header */}
        <div className="h-16 px-gutter flex items-center justify-between bg-surface-container-low border-b border-outline-variant">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-lg">
              M
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface leading-none">MedStore</span>
                <span className="font-code-xs text-code-xs text-on-surface-variant uppercase tracking-wider">PACS & Storage</span>
              </div>
            )}
          </div>

          <button
            onClick={onToggle}
            className={cn(
              'p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-all duration-200 flex-shrink-0',
              collapsed ? 'mx-auto' : 'ml-auto'
            )}
            aria-label={collapsed ? 'Perluas sidebar' : 'Perkecil sidebar'}
          >
            <span className="material-symbols-outlined text-[20px]">
              {collapsed ? 'dock_to_right' : 'dock_to_left'}
            </span>
          </button>

          {collapsed && (
            <div className="absolute left-16 top-0 h-16 w-48 bg-surface-container-low border-r border-outline-variant border-b border-outline-variant flex items-center gap-2 px-4 shadow-lg z-10 animate-slide-down">
              <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight whitespace-nowrap">MedStore</span>
            </div>
          )}
        </div>

        {/* TrueNAS Status */}
        <div className="px-gutter py-space-sm">
          <div className="px-space-sm py-space-xs rounded bg-surface-container flex items-center justify-between">
            <div className="flex items-center gap-space-xs">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              <span className="font-label-md text-label-md text-on-surface">TrueNAS Core</span>
            </div>
            <span className="font-code-xs text-code-xs text-secondary">99.98%</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="px-gutter pt-space-xs">
          <span className="font-label-md text-label-md uppercase text-outline tracking-wider block mb-space-xs">Navigasi Klinis</span>
        </div>

        <nav className="flex flex-col gap-1 px-gutter flex-1">
          {visibleItems.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.label + item.href}
                href={item.href}
                prefetch={false}
                className={cn(
                  'flex items-center gap-space-sm px-space-md py-space-sm rounded-lg font-body-sm text-body-sm transition-colors',
                  isActive
                    ? 'bg-primary-container text-on-primary-container font-semibold rounded-lg shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? item.label : undefined}
              >
                <span className="material-symbols-outlined text-[18px] transition-colors duration-200" aria-hidden="true">
                  {item.icon}
                </span>
                {!collapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {item.badge && (
                      <span className={cn(
                        'ml-auto px-1.5 py-0.2 rounded text-code-xs font-medium',
                        item.badgeVariant === 'warning' && 'bg-warning-container/20 text-warning',
                        item.badgeVariant === 'primary' && 'bg-primary-container/20 text-primary',
                        item.badgeVariant === 'success' && 'bg-success-container/20 text-success',
                        item.badgeVariant === 'danger' && 'bg-danger-container/20 text-danger',
                        item.badgeVariant === 'default' && 'bg-surface-container-highest text-on-surface-variant',
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}

          {/* Divider */}
          {!collapsed && user && (
            <div className="border-t border-outline-variant my-2" />
          )}

          {/* Logout */}
          {!collapsed && user && (
            <button
              onClick={() => useAuthStore.getState().logout()}
              className={cn(
                'w-full flex items-center gap-space-sm px-space-md py-space-sm rounded-lg font-body-sm text-body-sm transition-colors',
                'text-on-surface-variant hover:text-error hover:bg-error-container/20'
              )}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">logout</span>
              <span className="truncate">Keluar</span>
            </button>
          )}
        </nav>
      </div>

      {/* Footer - Pool Status */}
      <div className="p-gutter bg-surface-container-lowest m-gutter rounded-lg border-b border-outline-variant">
        <div className="flex items-center justify-between mb-space-xs">
          <span className="font-label-md text-label-md text-on-surface-variant">Pool ZFS: ClinStore01</span>
          <span className="font-code-xs text-code-xs text-secondary">ONLINE</span>
        </div>
        <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
          <div className="bg-primary-container h-1.5 rounded-full" style={{ width: '68.4%' }} />
        </div>
        <div className="flex justify-between items-center mt-space-xs font-code-xs text-code-xs text-outline">
          <span>68.4 TB / 100 TB</span>
          <span>Tier-1 NVMe</span>
        </div>
      </div>

      {/* Collapsed tooltip */}
      {collapsed && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-48 bg-surface-container-lowest border border-outline rounded-lg p-2 shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 group">
          <p className="text-code-xs text-on-surface-variant text-center">Klik untuk memperluas</p>
        </div>
      )}
    </aside>
  );
}