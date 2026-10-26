import axios from 'axios';
import type {
  LoginResponse,
  Patient,
  Document,
  AuditLog,
  User,
  DashboardStats,
  StorageStatus,
  PaginatedResponse,
  RetentionPolicy,
  Role,
} from '@/types';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export { api };

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('medstore-auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        const token = parsed?.state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        localStorage.removeItem('medstore-auth');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──
export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post('/auth/login', { email, password });
  return {
    access_token: data.token?.access_token,
    token_type: data.token?.token_type || 'bearer',
    user: data.user ? {
      ...data.user,
      roles: data.user.roles?.map((r: any) => typeof r === 'string' ? r : r.name) || [],
    } : undefined,
    mfa_required: data.mfa_required,
    mfa_token: data.temp_token,
  };
}

export async function verifyMfa(tempToken: string, code: string): Promise<LoginResponse> {
  const { data } = await api.post('/auth/mfa/verify', {
    temp_token: tempToken,
    code,
  });
  return {
    access_token: data.token?.access_token,
    token_type: data.token?.token_type || 'bearer',
    user: data.user ? {
      ...data.user,
      roles: data.user.roles?.map((r: any) => typeof r === 'string' ? r : r.name) || [],
    } : undefined,
    mfa_required: false,
  };
}

// ── Dashboard ──
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await api.get('/dashboard/stats');
  return data;
}

// ── Patients ──
export async function getPatients(params: {
  page?: number;
  page_size?: number;
  search?: string;
  gender?: string;
  status?: string;
}): Promise<PaginatedResponse<Patient>> {
  const queryParams: any = {
    page: params.page || 1,
    page_size: params.page_size || 10,
  };
  if (params.search) queryParams.q = params.search;
  if (params.gender) queryParams.gender = params.gender;
  if (params.status) queryParams.status = params.status;

  const { data } = await api.get('/patients', { params: queryParams });
  return {
    items: data.items.map((p: any): Patient => ({
      id: p.id,
      medical_record_number: p.medical_record_no,
      full_name: p.full_name,
      date_of_birth: p.birth_date,
      gender: p.gender === 'M' ? 'MALE' : p.gender === 'F' ? 'FEMALE' : 'OTHER',
      status: p.is_active ? 'ACTIVE' : 'INACTIVE',
      created_at: p.created_at,
      updated_at: p.updated_at,
    })),
    total: data.total,
    page: data.page,
    page_size: data.size,
    total_pages: Math.ceil(data.total / data.size),
  };
}

export async function getPatient(id: string): Promise<Patient> {
  const { data } = await api.get(`/patients/${id}`);
  return {
    id: data.id,
    medical_record_number: data.medical_record_no,
    full_name: data.full_name,
    date_of_birth: data.birth_date,
    gender: data.gender === 'M' ? 'MALE' : data.gender === 'F' ? 'FEMALE' : 'OTHER',
    status: data.is_active ? 'ACTIVE' : 'INACTIVE',
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function createPatient(patient: {
  medical_record_number: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
}): Promise<Patient> {
  const payload = {
    medical_record_no: patient.medical_record_number,
    full_name: patient.full_name,
    birth_date: patient.date_of_birth,
    gender: patient.gender === 'MALE' ? 'M' : patient.gender === 'FEMALE' ? 'F' : 'O',
  };
  const { data } = await api.post('/patients', payload);
  return {
    id: data.id,
    medical_record_number: data.medical_record_no,
    full_name: data.full_name,
    date_of_birth: data.birth_date,
    gender: data.gender === 'M' ? 'MALE' : data.gender === 'F' ? 'FEMALE' : 'OTHER',
    status: data.is_active ? 'ACTIVE' : 'INACTIVE',
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function updatePatient(id: string, data: Partial<{
  full_name: string;
  date_of_birth: string;
  gender: string;
  is_active: boolean;
}>): Promise<Patient> {
  const payload: any = {};
  if (data.full_name) payload.full_name = data.full_name;
  if (data.date_of_birth) payload.birth_date = data.date_of_birth;
  if (data.gender) payload.gender = data.gender === 'MALE' ? 'M' : data.gender === 'FEMALE' ? 'F' : 'O';
  if (data.is_active !== undefined) payload.is_active = data.is_active;

  const { data: res } = await api.put(`/patients/${id}`, payload);
  return {
    id: res.id,
    medical_record_number: res.medical_record_no,
    full_name: res.full_name,
    date_of_birth: res.birth_date,
    gender: res.gender === 'M' ? 'MALE' : res.gender === 'F' ? 'FEMALE' : 'OTHER',
    status: res.is_active ? 'ACTIVE' : 'INACTIVE',
    created_at: res.created_at,
    updated_at: res.updated_at,
  };
}

// ── Documents ──
export async function getDocuments(
  patientId: string,
  params?: { category?: string; page?: number; page_size?: number }
): Promise<PaginatedResponse<Document>> {
  const queryParams: any = {
    page: params?.page || 1,
    size: params?.page_size || 50,
  };
  if (params?.category && params.category !== 'ALL' && params.category !== 'Semua') {
    queryParams.category = params.category;
  }

  const { data } = await api.get(`/documents/patient/${patientId}`, { params: queryParams });
  return {
    items: data.items.map((d: any) => ({
      id: d.id,
      patient_id: d.patient_id,
      title: d.title,
      filename: d.title,
      category: d.category,
      mime_type: d.mime_type,
      size_bytes: d.file_size_bytes,
      version: d.version,
      uploaded_by: d.uploaded_by,
      uploader_name: 'Staf Medis',
      created_at: d.created_at,
      checksum: d.sha256_hash,
    })),
    total: data.total,
    page: data.page,
    page_size: data.size,
    total_pages: Math.ceil(data.total / data.size),
  };
}

export async function uploadDocument(
  patientId: string,
  file: File,
  category: string,
  title?: string,
  onProgress?: (percent: number) => void
): Promise<Document> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('patient_id', patientId);
  formData.append('category', category);
  formData.append('title', title || file.name);

  const { data } = await api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });

  return {
    id: data.id,
    patient_id: data.patient_id,
    title: data.title,
    filename: data.title,
    category: data.category,
    mime_type: data.mime_type,
    size_bytes: data.file_size_bytes,
    version: data.version,
    uploaded_by: data.uploaded_by,
    uploader_name: 'Staf Medis',
    created_at: data.created_at,
    checksum: data.sha256_hash,
  };
}

export async function downloadDocument(documentId: string): Promise<Blob> {
  const { data } = await api.get(`/documents/${documentId}/download`, {
    responseType: 'blob',
  });
  return data;
}

export async function previewDocument(documentId: string): Promise<Blob> {
  const { data } = await api.get(`/documents/${documentId}/preview`, {
    responseType: 'blob',
  });
  return data;
}

export async function logoutSession(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    // best effort — token cleared client-side regardless
  }
}

export async function deleteDocument(documentId: string): Promise<void> {
  await api.delete(`/documents/${documentId}`);
}

export async function getAllDocuments(params?: {
  q?: string;
  category?: string;
  storage_backend?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedResponse<Document>> {
  const queryParams: any = {
    page: params?.page || 1,
    size: params?.page_size || 20,
  };
  if (params?.q) queryParams.q = params.q;
  if (params?.category) queryParams.category = params.category;
  if (params?.storage_backend) queryParams.storage_backend = params.storage_backend;

  const { data } = await api.get('/documents', { params: queryParams });
  return {
    items: data.items.map((d: any) => ({
      id: d.id,
      patient_id: d.patient_id,
      title: d.title,
      filename: d.title,
      category: d.category,
      mime_type: d.mime_type,
      size_bytes: d.file_size_bytes,
      version: d.version,
      uploaded_by: d.uploaded_by,
      uploader_name: d.uploader_name || 'Staf Medis',
      created_at: d.created_at,
      checksum: d.sha256_hash,
      storage_backend: d.storage_backend,
      status: d.status,
      patient: d.patient ? {
        id: d.patient.id,
        full_name: d.patient.full_name,
      } : undefined,
    })),
    total: data.total,
    page: data.page,
    page_size: data.size,
    total_pages: data.total_pages || Math.ceil(data.total / data.size),
  };
}

// ── Audit Logs ──
export async function getAuditLogs(params: {
  page?: number;
  page_size?: number;
  patient_id?: string;
  user_id?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: string;
}): Promise<PaginatedResponse<AuditLog>> {
  const queryParams: any = {
    page: params.page || 1,
    size: params.page_size || 20,
    ...params,
  };
  delete queryParams.page_size;

  const { data } = await api.get('/audit', { params: queryParams });
  return {
    items: data.items.map((log: any) => ({
      id: String(log.id),
      timestamp: log.event_time,
      user_id: log.user_id,
      user_email: log.user_email,
      user_full_name: log.user_full_name,
      patient_id: log.patient_id,
      patient_name: log.patient_name,
      document_id: log.document_id,
      document_title: log.document_title,
      action: log.action,
      result: log.result,
      ip_address: log.ip_address || null,
      details: log.detail ? JSON.stringify(log.detail) : null,
    })),
    total: data.total,
    page: data.page,
    page_size: data.size,
    total_pages: Math.ceil(data.total / data.size),
  };
}

export async function exportAuditCsv(params: {
  patient_id?: string;
  user_id?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: string;
}): Promise<Blob> {
  const { data } = await api.get('/audit/export/csv', {
    params,
    responseType: 'blob',
  });
  return data;
}

// ── Admin: Users ──
export async function getUsers(): Promise<User[]> {
  const { data } = await api.get('/admin/users');
  return data.map((u: any) => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    roles: u.roles?.map((r: any) => typeof r === 'string' ? r : r.name) || [],
    is_active: u.is_active,
    mfa_enabled: u.mfa_enabled,
    created_at: u.created_at,
    updated_at: u.created_at,
  }));
}

export async function createUser(user: {
  email: string;
  full_name: string;
  password: string;
  roles: string[];
}): Promise<User> {
  const { data } = await api.post('/admin/users', {
    email: user.email,
    full_name: user.full_name,
    password: user.password,
    role_names: user.roles,
  });
  return {
    id: data.id,
    email: data.email,
    full_name: data.full_name,
    roles: data.roles?.map((r: any) => typeof r === 'string' ? r : r.name) || [],
    is_active: data.is_active,
    mfa_enabled: data.mfa_enabled,
    created_at: data.created_at,
    updated_at: data.created_at,
  };
}

export async function updateUser(
  id: string,
  user: { full_name?: string; is_active?: boolean; roles?: string[] }
): Promise<User> {
  const { data } = await api.put(`/admin/users/${id}`, {
    full_name: user.full_name,
    is_active: user.is_active,
    role_names: user.roles,
  });
  return {
    id: data.id,
    email: data.email,
    full_name: data.full_name,
    roles: data.roles?.map((r: any) => typeof r === 'string' ? r : r.name) || [],
    is_active: data.is_active,
    mfa_enabled: data.mfa_enabled,
    created_at: data.created_at,
    updated_at: data.created_at,
  };
}

// ── Admin: Roles ──
export async function getRoles(): Promise<Role[]> {
  const { data } = await api.get('/admin/roles');
  return data.map((r: any) => ({
    id: r.id,
    name: r.name,
    permissions: r.permissions || [],
    description: `Role ${r.name}`,
  }));
}

// ── Admin: Retention Policies ──
export async function getRetentionPolicies(): Promise<RetentionPolicy[]> {
  const { data } = await api.get('/admin/retention-policies');
  return data.map((p: any) => ({
    id: p.id,
    name: `Kebijakan ${p.category}`,
    category: p.category,
    retention_days: p.retention_years * 365,
    action: 'ARCHIVE',
    is_active: true,
    created_at: p.created_at,
  }));
}

export async function createRetentionPolicy(policy: {
  category: string;
  retention_years: number;
  description?: string;
}): Promise<any> {
  const { data } = await api.post('/admin/retention-policies', policy);
  return data;
}

// ── Storage Dashboard ──
function toIsoString(value: unknown): string {
  if (!value) return new Date(0).toISOString();
  if (typeof value === 'number') {
    // TrueNAS may return epoch seconds; JS needs milliseconds.
    const ms = value > 1e12 ? value : value * 1000;
    return new Date(ms).toISOString();
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

export async function getStorageStatus(): Promise<StorageStatus> {
  const [poolsRes, snapshotsRes, cloudsyncRes] = await Promise.all([
    api.get('/dashboard/storage'),
    api.get('/dashboard/snapshots'),
    api.get('/dashboard/cloudsync'),
  ]);

  const pools = poolsRes.data.pools ?? [];
  const snapshots = snapshotsRes.data.snapshots ?? [];
  const jobs = cloudsyncRes.data.jobs ?? [];

  return {
    pools: pools.map((p: any) => ({
      name: p.name,
      health: p.health ?? p.status ?? 'UNKNOWN',
      total_bytes: p.total_bytes ?? 0,
      used_bytes: p.used_bytes ?? 0,
      free_bytes: p.free_bytes ?? 0,
      topology: p.topology,
    })),
    snapshots: snapshots.map((s: any) => ({
      name: s.name,
      created_at: toIsoString(s.created_at),
      size_bytes: s.used_bytes ?? 0,
      dataset: s.dataset ?? '',
    })),
    cloud_sync: jobs.map((job: any) => ({
      job_name: job.description || `Cloud Sync #${job.id}`,
      status: job.status || 'UNKNOWN',
      last_run: job.last_run ? toIsoString(job.last_run) : null,
      remote_target: job.path || '-',
    })),
    source: poolsRes.data.source ?? 'mock',
    dataset: poolsRes.data.dataset,
    storage_backend: poolsRes.data.storage_backend,
    truenas_configured: poolsRes.data.truenas_configured,
    message: poolsRes.data.message,
  };
}

export async function createSnapshot(name?: string): Promise<any> {
  const { data } = await api.post('/dashboard/snapshots', name ? { name } : {});
  return data;
}

// ── Batch Operations ──
export interface BatchUploadResult {
  uploaded: Document[];
  failed: { filename: string; error: string }[];
}

export async function batchUploadDocuments(
  patientId: string,
  files: File[],
  category: string,
  onProgress?: (percent: number) => void
): Promise<BatchUploadResult> {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  formData.append('patient_id', patientId);
  formData.append('category', category);

  const { data } = await api.post('/documents/batch/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
  return data;
}

export async function batchDeleteDocuments(documentIds: string[]): Promise<{ deleted: string[]; failed: { id: string; error: string }[] }> {
  const { data } = await api.post('/documents/batch/delete', documentIds);
  return data;
}

export async function batchDownloadDocuments(documentIds: string[]): Promise<Blob> {
  const { data } = await api.post('/documents/batch/download', documentIds, {
    responseType: 'blob',
  });
  return data;
}

// ── Retention Dashboard ──
export interface RetentionDashboardItem {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_mrn: string;
  title: string;
  category: string;
  retention_expires_at: string;
  days_until_expiry: number;
  storage_backend: string;
  file_size_bytes: number;
}

export interface RetentionDashboardResponse {
  expiring_soon: RetentionDashboardItem[];
  expiring_later: RetentionDashboardItem[];
  expired: RetentionDashboardItem[];
  total_expiring_soon: number;
  total_expiring_later: number;
  total_expired: number;
}

export async function getRetentionDashboard(): Promise<RetentionDashboardResponse> {
  const { data } = await api.get('/admin/retention-dashboard');
  return data;
}

// ── Patient Timeline ──
export interface TimelineEvent {
  id: string;
  type: string;
  timestamp: string;
  title: string;
  description?: string;
  category?: string;
  document_id?: string;
  document_title?: string;
  version?: number;
  user_name?: string;
}

export interface PatientTimelineResponse {
  patient_id: string;
  patient_name: string;
  patient_mrn: string;
  events: TimelineEvent[];
  total_documents: number;
  categories: string[];
}

export async function getPatientTimeline(patientId: string): Promise<PatientTimelineResponse> {
  const { data } = await api.get(`/patients/${patientId}/timeline`);
  return data;
}

// ── DICOM ──
export interface DicomMetadata {
  studyInstanceUID: string;
  seriesInstanceUID: string;
  sopInstanceUID: string;
  patientName: string;
  patientID: string;
  studyDate: string;
  studyTime: string;
  modality: string;
  rows: number;
  columns: number;
  bitsAllocated: number;
  bitsStored: number;
  highBit: number;
  pixelRepresentation: number;
  samplesPerPixel: number;
  photometricInterpretation: string;
  transferSyntaxUID: string;
}

export async function getDicomMetadata(documentId: string): Promise<DicomMetadata> {
  const { data } = await api.get(`/documents/${documentId}/dicom/metadata`);
  return data;
}

export async function getDicomPixelData(documentId: string): Promise<Blob> {
  const { data } = await api.get(`/documents/${documentId}/dicom/pixeldata`, {
    responseType: 'blob',
  });
  return data;
}
