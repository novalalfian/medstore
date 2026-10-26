-- MedStore Database Initialization
-- PostgreSQL 15+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM Types
-- ============================================================

CREATE TYPE gender_type AS ENUM ('M', 'F', 'O');
CREATE TYPE document_category AS ENUM ('Lab', 'Radiologi', 'Konsultasi', 'Identitas', 'Rujukan', 'Lainnya');
CREATE TYPE storage_backend AS ENUM ('SMB', 'NFS', 'S3', 'LOCAL');
CREATE TYPE audit_result AS ENUM ('SUCCESS', 'FAIL', 'DENIED');

-- ============================================================
-- Table: roles
-- ============================================================
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Table: users
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    mfa_secret VARCHAR(255),
    mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Table: user_roles (many-to-many)
-- ============================================================
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- ============================================================
-- Table: patients
-- ============================================================
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medical_record_no VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    birth_date DATE NOT NULL,
    gender gender_type NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patients_mrn ON patients(medical_record_no);
CREATE INDEX idx_patients_name ON patients USING gin(to_tsvector('indonesian', full_name));
CREATE INDEX idx_patients_active ON patients(is_active);

-- ============================================================
-- Table: documents
-- ============================================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id),
    title VARCHAR(500) NOT NULL,
    category document_category NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    parent_id UUID REFERENCES documents(id),
    storage_path TEXT NOT NULL,
    storage_backend storage_backend_type NOT NULL DEFAULT 'LOCAL',
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    sha256_hash CHAR(64) NOT NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
    retention_expires_at TIMESTAMPTZ,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_patient ON documents(patient_id);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_deleted ON documents(is_deleted);
CREATE INDEX idx_documents_hash ON documents(sha256_hash);

-- ============================================================
-- Table: retention_policies
-- ============================================================
CREATE TABLE retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL UNIQUE,
    retention_years INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Table: audit_log (APPEND-ONLY)
-- ============================================================
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES users(id),
    patient_id UUID REFERENCES patients(id),
    document_id UUID REFERENCES documents(id),
    action VARCHAR(100) NOT NULL,
    result audit_result_type NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    detail JSONB
);

CREATE INDEX idx_audit_event_time ON audit_log(event_time);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_patient ON audit_log(patient_id);
CREATE INDEX idx_audit_action ON audit_log(action);

-- ============================================================
-- Audit Log Protection: Deny UPDATE and DELETE
-- ============================================================
CREATE OR REPLACE FUNCTION deny_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Modifikasi audit_log tidak diizinkan';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_update_audit
    BEFORE UPDATE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION deny_audit_modification();

CREATE TRIGGER no_delete_audit
    BEFORE DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION deny_audit_modification();

-- ============================================================
-- Auto-update updated_at on patients
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Seed: Default Roles
-- ============================================================
INSERT INTO roles (name, permissions) VALUES
    ('SUPERADMIN', '["*"]'::jsonb),
    ('DOKTER', '["patient:read", "document:read", "document:upload", "document:download"]'::jsonb),
    ('PERAWAT', '["patient:read", "document:read", "document:download"]'::jsonb),
    ('ADMIN_PENDAFTARAN', '["patient:create", "patient:read", "patient:update", "document:upload", "document:read"]'::jsonb),
    ('LAB', '["patient:read", "document:read", "document:upload", "document:download"]'::jsonb),
    ('RADIOGRAFER', '["patient:read", "document:read", "document:upload", "document:download"]'::jsonb),
    ('AUDITOR', '["audit:read", "audit:export", "patient:read", "document:read"]'::jsonb);

-- ============================================================
-- Superadmin user is created by backend bootstrap (app/seed.py)
-- so the bcrypt hash is always generated at runtime.
-- ============================================================

-- ============================================================
-- Seed: Default Retention Policies (Permenkes 24/2022)
-- ============================================================
INSERT INTO retention_policies (category, retention_years, description) VALUES
    ('Lab', 5, 'Hasil laboratorium - retensi 5 tahun sesuai Permenkes 24/2022'),
    ('Radiologi', 5, 'Hasil radiologi/imaging - retensi 5 tahun'),
    ('Konsultasi', 5, 'Catatan konsultasi dokter - retensi 5 tahun'),
    ('Identitas', 10, 'Dokumen identitas pasien - retensi 10 tahun'),
    ('Rujukan', 5, 'Surat rujukan - retensi 5 tahun'),
    ('Lainnya', 5, 'Dokumen lainnya - retensi default 5 tahun');
