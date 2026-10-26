export interface User {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
  is_active: boolean;
  mfa_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
  description: string;
}

export interface Patient {
  id: string;
  medical_record_number: string;
  full_name: string;
  date_of_birth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  status: 'ACTIVE' | 'INACTIVE' | 'DECEASED' | 'OUTPATIENT' | 'OBSERVATION' | 'CRITICAL';
  nik?: string;
  blood_type?: string;
  specialty?: string;
  attending_doctor?: string;
  document_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  patient_id: string;
  title: string;
  filename: string;
  category: DocumentCategory;
  mime_type: string;
  size_bytes: number;
  version: number;
  uploaded_by: string;
  uploader_name: string;
  created_at: string;
  checksum: string;
  storage_backend?: string;
  status?: string;
  patient?: { id: string; full_name: string };
}

export type DocumentCategory =
  | 'Lab'
  | 'Radiologi'
  | 'Konsultasi'
  | 'Identitas'
  | 'Rujukan'
  | 'Lainnya';

export interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string;
  user_email: string | null;
  user_full_name: string | null;
  patient_id: string | null;
  patient_name: string | null;
  document_id: string | null;
  document_title: string | null;
  action: string;
  result: 'SUCCESS' | 'FAIL' | 'DENIED';
  ip_address: string | null;
  details: string | null;
}

export interface RetentionPolicy {
  id: string;
  name: string;
  category: DocumentCategory | 'ALL';
  retention_days: number;
  action: 'ARCHIVE' | 'DELETE';
  is_active: boolean;
  created_at: string;
}

export interface DashboardStats {
  total_patients: number;
  total_documents: number;
  documents_today: number;
  active_users: number;
}

export interface StoragePool {
  name: string;
  health: 'ONLINE' | 'DEGRADED' | 'FAULTED' | 'OFFLINE' | 'HEALTHY' | string;
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  topology?: string;
  disks?: { name: string; status: string }[];
}

export interface Snapshot {
  name: string;
  created_at: string;
  size_bytes: number;
  dataset: string;
}

export interface CloudSyncStatus {
  enabled: boolean;
  provider: string | null;
  last_sync: string | null;
  status: 'IDLE' | 'SYNCING' | 'ERROR' | 'DISABLED';
  error_message: string | null;
}

export interface CloudSyncJob {
  id: number;
  job_name: string;
  status: string;
  last_run: string | null;
  remote_target: string;
  path?: string;
}

export interface StorageStatus {
  pools: StoragePool[];
  snapshots: Snapshot[];
  cloud_sync: CloudSyncJob[];
  source: 'truenas' | 'mock';
  dataset?: string;
  storage_backend?: string;
  truenas_configured?: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  detail: string;
  status_code: number;
}

export interface LoginResponse {
  access_token?: string;
  token_type: string;
  user?: User;
  mfa_required?: boolean;
  mfa_token?: string;
}
