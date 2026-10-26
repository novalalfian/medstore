'use client';

import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Users, Shield, FileClock, Plus, Check, RefreshCw, Edit, Trash2 } from 'lucide-react';
import { getUsers, createUser, updateUser, getRoles, getRetentionPolicies, createRetentionPolicy } from '@/lib/api';
import type { User, Role, RetentionPolicy } from '@/types';
import { Button, Input, Select, Card, Badge, Table, Modal, Avatar, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

const ROLE_OPTIONS = [
  'SUPERADMIN',
  'DOKTER',
  'PERAWAT',
  'ADMIN_PENDAFTARAN',
  'LAB',
  'RADIOGRAFER',
  'AUDITOR',
];

const CATEGORY_OPTIONS = ['Lab', 'Radiologi', 'Konsultasi', 'Identitas', 'Rujukan', 'Lainnya'];

type Tab = 'users' | 'roles' | 'retention';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users');

  const handleTabChange = (value: string) => {
    setTab(value as Tab);
  };

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [loading, setLoading] = useState(false);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [userForm, setUserForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'DOKTER',
  });

  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [policyForm, setPolicyForm] = useState({
    category: 'Lab',
    retention_years: 5,
    description: '',
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [u, r, p] = await Promise.all([getUsers(), getRoles(), getRetentionPolicies()]);
      setUsers(u);
      setRoles(r);
      setPolicies(p);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Gagal memuat data admin');
    } finally {
      setLoading(false);
    }
  };

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({ full_name: '', email: '', password: '', role: 'DOKTER' });
    setIsUserModalOpen(true);
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      full_name: user.full_name,
      email: user.email,
      password: '',
      role: user.roles?.[0] || 'DOKTER',
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUser(true);
    try {
      if (editingUser) {
        await updateUser(editingUser.id, {
          full_name: userForm.full_name,
          roles: [userForm.role],
        });
        toast.success('Pengguna berhasil diperbarui');
      } else {
        if (userForm.password.length < 8) {
          toast.error('Kata sandi minimal 8 karakter');
          setSavingUser(false);
          return;
        }
        await createUser({
          full_name: userForm.full_name,
          email: userForm.email,
          password: userForm.password,
          roles: [userForm.role],
        });
        toast.success('Pengguna baru berhasil dibuat');
      }
      setIsUserModalOpen(false);
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Gagal menyimpan pengguna');
    } finally {
      setSavingUser(false);
    }
  };

  const toggleUserActive = async (user: User) => {
    try {
      await updateUser(user.id, { is_active: !user.is_active });
      toast.success(user.is_active ? 'Pengguna dinonaktifkan' : 'Pengguna diaktifkan');
      loadAll();
    } catch {
      toast.error('Gagal mengubah status pengguna');
    }
  };

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRetentionPolicy(policyForm);
      toast.success('Kebijakan retensi ditambahkan');
      setIsPolicyModalOpen(false);
      setPolicyForm({ category: 'Lab', retention_years: 5, description: '' });
      loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Gagal menambahkan kebijakan retensi');
    }
  };

  const userColumns = useMemo(() => [
    {
      key: 'full_name',
      header: 'Nama Lengkap',
      render: (u: User) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.full_name} size="sm" variant="primary" />
          <div>
            <div className="font-medium text-neutral-900 dark:text-white">{u.full_name}</div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'Peran',
      width: '200px',
      render: (u: User) => (
        <div className="flex flex-wrap gap-1">
          {(u.roles || []).map((r) => (
            <Badge key={r} variant="primary" size="xs">
              {r}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'mfa',
      header: 'MFA',
      width: '120px',
      render: (u: User) => (
        <Badge variant={u.mfa_enabled ? 'success' : 'warning'} size="sm" dot>
          {u.mfa_enabled ? 'Aktif' : 'Belum Aktif'}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (u: User) => (
        <Badge variant={u.is_active ? 'success' : 'default'} size="sm" dot>
          {u.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      width: '160px',
      render: (u: User) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEditUser(u)} iconLeft={<Edit className="w-3.5 h-3.5" />}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toggleUserActive(u)} className={cn(u.is_active ? 'text-warning-600 hover:bg-warning-50' : 'text-success-600 hover:bg-success-50')}>
            {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
          </Button>
        </div>
      ),
    },
  ], []);

  const policyColumns = useMemo(() => [
    {
      key: 'category',
      header: 'Kategori Dokumen',
      width: '180px',
      render: (p: RetentionPolicy) => (
        <span className="font-medium text-neutral-900 dark:text-white">{p.category}</span>
      ),
    },
    {
      key: 'retention_days',
      header: 'Masa Retensi',
      width: '140px',
      render: (p: RetentionPolicy) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300">
          {Math.round(p.retention_days / 365)} tahun
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Keterangan',
      render: (p: RetentionPolicy) => <span className="text-xs text-neutral-500 dark:text-neutral-400">{p.name}</span>,
    },
  ], []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">Administrasi Sistem</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Kelola pengguna, peran klinis, dan kebijakan retensi rekam medis.
          </p>
        </div>
        <Button variant="secondary" onClick={loadAll} loading={loading} iconLeft={<RefreshCw className="w-4 h-4" />}>
          Muat Ulang
        </Button>
      </div>

      <Tabs defaultValue="users" onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="w-full bg-neutral-100 dark:bg-neutral-800/50 p-1 rounded-xl">
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-1.5" />
            Pengguna
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Shield className="w-4 h-4 mr-1.5" />
            Peran & Hak Akses
          </TabsTrigger>
          <TabsTrigger value="retention">
            <FileClock className="w-4 h-4 mr-1.5" />
            Kebijakan Retensi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="pt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-neutral-900 dark:text-white">Manajemen Pengguna</h3>
            <Button variant="primary" onClick={openCreateUser} iconLeft={<Plus className="w-4 h-4" />}>
              Pengguna Baru
            </Button>
          </div>
          <Card className="border-neutral-200 dark:border-neutral-700 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm overflow-hidden" padding="none">
            <Table
              columns={userColumns}
              data={users}
              loading={loading}
              keyExtractor={(u) => u.id}
              emptyMessage="Belum ada pengguna terdaftar."
              striped
              hoverable
              compact
            />
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="pt-4">
          {roles.length === 0 && !loading ? (
            <Card className="border-neutral-200 dark:border-neutral-700 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm text-center text-neutral-500 dark:text-neutral-400" padding="lg">
              Belum ada peran.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((role) => (
                <Card key={role.id} variant="elevated" padding="md" className="border-neutral-200 dark:border-neutral-700 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600 dark:text-primary-400">
                      <Shield className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white">{role.name}</h3>
                  </div>
                  <ul className="space-y-1.5">
                    {(role.permissions || []).map((perm) => (
                      <li key={perm} className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                        <Check className="w-3.5 h-3.5 text-success-600 flex-shrink-0" />
                        <span className="font-mono text-neutral-800 dark:text-neutral-200">{perm}</span>
                      </li>
                    ))}
                    {(!role.permissions || role.permissions.length === 0) && (
                      <li className="text-xs text-neutral-400 dark:text-neutral-500">Tidak ada permission eksplisit</li>
                    )}
                  </ul>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="retention" className="pt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-neutral-900 dark:text-white">Kebijakan Retensi Dokumen</h3>
            <Button variant="primary" onClick={() => setIsPolicyModalOpen(true)} iconLeft={<Plus className="w-4 h-4" />}>
              Kebijakan Baru
            </Button>
          </div>
          <Card className="border-neutral-200 dark:border-neutral-700 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm overflow-hidden" padding="none">
            <Table
              columns={policyColumns}
              data={policies}
              loading={loading}
              keyExtractor={(p) => p.id}
              emptyMessage="Belum ada kebijakan retensi."
              striped
              hoverable
              compact
            />
          </Card>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
            Catatan: dokumen yang melewati masa retensi hanya ditandai untuk ditinjau — tidak
            dihapus otomatis, sesuai kebijakan konservatif Permenkes 24/2022.
          </p>
        </TabsContent>
      </Tabs>

      {/* User Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={editingUser ? 'Edit Pengguna' : 'Pengguna Baru'}
        size="lg"
      >
        <form onSubmit={handleSaveUser} className="space-y-4">
          <Input
            label="Nama Lengkap *"
            value={userForm.full_name}
            onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
            required
          />
          <Input
            label="Email *"
            type="email"
            value={userForm.email}
            onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
            disabled={!!editingUser}
            required
          />
          {!editingUser && (
            <Input
              label="Kata Sandi Awal * (min. 8 karakter)"
              type="password"
              value={userForm.password}
              onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
              required
            />
          )}
          <Select
            label="Peran Klinis *"
            value={userForm.role}
            onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
            options={ROLE_OPTIONS.map((r) => ({ value: r, label: r }))}
            required
          />
          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsUserModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" loading={savingUser}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Retention Policy Modal */}
      <Modal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        title="Kebijakan Retensi Baru"
      >
        <form onSubmit={handleCreatePolicy} className="space-y-4">
          <Select
            label="Kategori Dokumen *"
            value={policyForm.category}
            onChange={(e) => setPolicyForm({ ...policyForm, category: e.target.value })}
            options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))}
            required
          />
          <Input
            label="Masa Retensi (tahun) *"
            type="number"
            min={1}
            max={50}
            value={policyForm.retention_years}
            onChange={(e) =>
              setPolicyForm({ ...policyForm, retention_years: Number(e.target.value) })
            }
            required
          />
          <Input
            label="Deskripsi"
            value={policyForm.description}
            onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })}
          />
          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-700 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsPolicyModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary">
              Simpan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}