# PRD — MedStore: Clinical Storage Application

Oct 21, 2026 · @Noval

**Versi:** 1.0 (Draft) **Status:** In Review

---

## Daftar Isi

---

## 1. Ringkasan Eksekutif

## 1. Ringkasan Eksekutif

Klinik dan rumah sakit kecil-menengah di Indonesia umumnya menyimpan dokumen medis di folder jaringan tanpa kontrol akses terstruktur, audit, atau enkripsi — situasi yang melanggar UU PDP No. 27/2022 dan Permenkes 24/2022, sekaligus meningkatkan risiko kebocoran data pasien.

**MedStore** adalah aplikasi web clinical storage yang menempatkan lapisan domain healthcare di atas TrueNAS. TrueNAS menangani integritas data (ZFS, snapshot, replikasi, enkripsi at-rest); MedStore menambahkan autentikasi + MFA, RBAC berbasis peran klinis, audit log append-only per pasien, manajemen retensi, dan antarmuka ramah pengguna non-teknis.

### Nilai Bisnis

| Dimensi | Manfaat |
| --- | --- |
| Kepatuhan | Kontrol terpetakan ke UU PDP & Permenkes 24/2022; audit log siap inspeksi |
| Efisiensi | Pencarian dokumen < 5 detik; upload terstandar menggantikan proses manual |
| Keamanan | Enkripsi ZFS + TLS + MFA; backup 3-2-1 + snapshot immutable |
| Skalabilitas | Mulai Docker Compose; naik ke Kubernetes multi-cabang tanpa ganti stack |
| Keterbukaan | TrueNAS & MinIO open-source; standar S3/SMB/NFS — tidak ada vendor lock-in |

### Ringkasan MVP

Login + MFA TOTP · Manajemen pasien dasar (No. RM, nama, tanggal lahir) · Upload dokumen (PDF/JPG/DICOM ≤ 100 MB) · Pencarian per pasien · Unduh dengan otorisasi · Audit log append-only · Retensi dasar · Dashboard kesehatan TrueNAS.

Target go-live MVP: **12 minggu** dari kick-off.

---

## 2. Latar Belakang & Masalah

## 2. Latar Belakang & Masalah

### 2.1 Pain Point Klinik Saat Ini

| Masalah | Dampak |
| --- | --- |
| Dokumen tersimpan di shared folder tanpa RBAC | Semua staf bisa akses semua rekam medis — melanggar prinsip minimum necessary access |
| Tidak ada audit trail | Tidak dapat membuktikan siapa yang mengakses dokumen pasien kepada auditor/regulator |
| Backup manual dan tidak konsisten | Risiko kehilangan data permanen saat storage failure |
| Tidak ada enkripsi at-rest | Data pasien terbaca jika drive dicuri atau diakses fisik |
| Retensi tidak terkelola | Dokumen dihapus sembarangan atau menumpuk tanpa batas — risiko hukum |
| Tidak ada MFA | Satu password bocor = akses penuh seluruh rekam medis |
| Pencarian dokumen lambat | Staf medis harus browsing folder manual — membuang waktu kritis |

### 2.2 Mengapa TrueNAS?

TrueNAS dipilih sebagai backend karena:

- **ZFS** memberikan integritas data end-to-end (checksum per blok, self-healing), snapshot atomic, dan enkripsi at-rest native.
- **Sudah familiar** di banyak klinik dan rumah sakit yang memiliki NAS on-premise.
- **Protokol standar**: SMB/NFS untuk file I/O; MinIO (S3-compatible) untuk objek besar seperti DICOM.
- **REST API v2.0** memungkinkan otomasi: pembuatan dataset, snapshot terjadwal, monitoring pool, cloud sync — semua dapat dikontrol programatik.
- **Biaya rendah**: TrueNAS SCALE tersedia gratis; hardware komoditas.
- **Immutable snapshot**: Snapshot ZFS tidak dapat dimodifikasi retroaktif — memenuhi persyaratan WORM untuk rekam medis.

### 2.3 Mengapa Aplikasi Sendiri — Bukan UI TrueNAS Langsung?

UI TrueNAS dirancang untuk admin storage, bukan tenaga medis. Aplikasi MedStore diperlukan karena:

1. **Domain healthcare**: konsep No. RM, episode rawat inap, kategori dokumen medis, retensi per jenis dokumen — tidak ada di TrueNAS.
2. **RBAC klinis**: dokter hanya akses pasien sendiri; radiografer hanya unggah hasil imaging — granularitas yang tidak bisa dikonfigurasi di level SMB share.
3. **Audit per pasien**: log akses yang terikat ke identitas klinis, bukan hanya username sistem operasi.
4. **UX non-teknis**: perawat dan admin pendaftaran tidak boleh terekspos ke konsep pool, vdev, atau dataset.
5. **Kepatuhan baked-in**: kontrol UU PDP dan Permenkes 24/2022 harus diimplementasikan di lapisan aplikasi — TrueNAS tidak mengenal regulasi ini.
6. **Integrasi masa depan**: FHIR/SATUSEHAT dan DICOM viewer membutuhkan lapisan domain yang dapat diperluas — tidak bisa dilakukan dari UI TrueNAS.

---

## 3. Tujuan & Metrik Keberhasilan

## 3. Tujuan & Metrik Keberhasilan

*Asumsi: metrik diukur pada lingkungan produksi dengan data nyata, bukan staging.*

### 3.1 Objektif MVP

| # | Objektif | Key Result | Target | Cara Ukur |
| --- | --- | --- | --- | --- |
| O1 | Penyimpanan dokumen medis aman & patuh | Semua akses dokumen tercatat di audit log | 100% | Query audit\_log vs access log |
| O2 | Akses cepat oleh staf medis | Waktu pencarian dokumen pasien | < 5 detik (p95) | APM / synthetic test |
| O3 | Ketersediaan tinggi | Uptime aplikasi | ≥ 99,5% / bulan | Monitoring uptime |
| O4 | Perlindungan data | RPO (Recovery Point Objective) | ≤ 15 menit | Uji restore berkala |
| O5 | Pemulihan cepat | RTO (Recovery Time Objective) | ≤ 4 jam | Uji DR terjadwal |
| O6 | Adopsi pengguna | Pengguna aktif dalam 30 hari pasca go-live | ≥ 80% staf target | Analytics |
| O7 | Kepercayaan audit | Audit log tidak dapat dimodifikasi | 0 record yang bisa di-UPDATE/DELETE | DB constraint check |

### 3.2 Metrik Keamanan & Kepatuhan

| Metrik | Target |
| --- | --- |
| Sesi tanpa MFA yang lolos | 0 |
| Waktu respons insiden kebocoran data | < 24 jam (konfirmasi dengan DPO) |
| Frekuensi uji restore snapshot | Minimal 1x/bulan |
| Dokumen terenkrip at-rest | 100% |
| Versi dokumen dengan hash SHA-256 | 100% |

### 3.3 Metrik Performa Teknis

| Metrik | Target |
| --- | --- |
| Upload dokumen ≤ 100 MB | < 30 detik (koneksi LAN 100 Mbps) |
| Download dokumen ≤ 100 MB | < 15 detik |
| Waktu load halaman (LCP) | < 2,5 detik |
| Concurrency pengguna simultan | ≥ 50 pengguna (MVP), ≥ 200 (Fase 2) |

---

## 4. Persona & User Journey

## 4. Persona & User Journey

### 4.1 Persona

| Persona | Peran | Kebutuhan Utama | Kekhawatiran |
| --- | --- | --- | --- |
| **dr. Rina** — Dokter Umum | Melihat & upload dokumen pasiennya | Akses cepat riwayat pasien; upload hasil konsultasi | Tidak ingin belajar sistem baru yang rumit |
| **Siti** — Admin Pendaftaran | Input data pasien baru; upload KTP & surat rujukan | Form sederhana; cari pasien cepat | Takut salah upload ke pasien yang salah |
| **Budi** — Admin IT Klinik | Kelola user, pantau TrueNAS, backup | Dashboard storage real-time; alert kapasitas | Tidak punya tim besar; ingin sistem yang self-maintaining |
| **Ibu Dewi** — Auditor Compliance | Verifikasi akses dokumen sesuai otorisasi | Export audit log per periode; filter per pasien | Butuh laporan yang siap print untuk regulator |

### 4.2 User Journey Utama

**Journey 1 — Dokter mencari & melihat dokumen pasien**

1. Login → MFA TOTP → dashboard
2. Ketik nama atau No. RM pasien di search bar
3. Pilih pasien dari hasil → halaman dokumen pasien
4. Filter by kategori (Lab / Radiologi / Konsultasi)
5. Klik dokumen → preview inline atau unduh
6. Sistem mencatat akses di audit log secara otomatis

**Journey 2 — Admin Pendaftaran mendaftarkan pasien baru & upload dokumen**

1. Login → Dashboard → tombol "Pasien Baru"
2. Isi No. RM (auto-generate atau manual), nama, tanggal lahir, jenis kelamin
3. Simpan → halaman detail pasien terbuka
4. Klik "Upload Dokumen" → drag-and-drop atau browse file (PDF/JPG)
5. Pilih kategori dokumen (Rujukan / Identitas / Hasil Lab)
6. Konfirmasi → sistem upload ke TrueNAS, simpan metadata + hash SHA-256
7. Notifikasi sukses; dokumen muncul di daftar pasien

**Journey 3 — Admin IT memonitor dan mengelola storage**

1. Login → Dashboard TrueNAS
2. Lihat status pool (kapasitas, health, SMART), snapshot terbaru, status cloud sync
3. Terima alert email jika kapasitas > 80% atau snapshot gagal
4. Buat user baru → assign role → set dataset permission via REST API TrueNAS
5. Jalankan uji restore snapshot on-demand dari dashboard

**Journey 4 — Auditor mengekspor log akses**

1. Login → menu Audit Log
2. Filter: pilih pasien (opsional), rentang tanggal, user, tipe aksi (VIEW/DOWNLOAD/UPLOAD)
3. Klik "Ekspor CSV" atau "Ekspor PDF"
4. Unduh laporan; log audit tidak dapat dimodifikasi (append-only, no DELETE/UPDATE)
5. Serahkan laporan ke regulator atau arsipkan internal

---

## 5. Ruang Lingkup

## 5. Ruang Lingkup

### 5.1 In-Scope MVP

| Modul | Fitur |
| --- | --- |
| Autentikasi & Sesi | Login via OIDC (Keycloak/Authentik), MFA TOTP, logout, timeout sesi |
| Manajemen Pasien | CRUD pasien: No. RM, nama, tanggal lahir, jenis kelamin; pencarian |
| Manajemen Dokumen | Upload (PDF/JPG/DICOM ≤ 100 MB), kategorisasi, versioning, hash SHA-256 |
| Pencarian & Filter | Cari per No. RM / nama, filter kategori & tanggal |
| Unduh & Preview | Preview PDF/JPG inline; unduh dengan cek otorisasi; watermark opsional |
| Audit Log | Catat VIEW/UPLOAD/DOWNLOAD/DELETE per user per dokumen; append-only |
| Retensi Dasar | Set kebijakan retensi per kategori dokumen; flag dokumen kadaluarsa |
| Dashboard TrueNAS | Status pool, kapasitas, snapshot list, job cloud sync, alert |
| Admin | Manajemen user, role, dataset TrueNAS, API key rotation |

### 5.2 Out-of-Scope MVP

- DICOM viewer (Fase 2)
- OCR dokumen (Fase 2)
- Integrasi FHIR / SATUSEHAT (Fase 2)
- Integrasi billing / LIS / RIS (Fase 3)
- Multi-cabang / multi-tenant (Fase 3)
- Disaster Recovery site aktif (Fase 4)
- High Availability aktif-aktif (Fase 4)
- Mobile native app (tidak direncanakan; PWA dipertimbangkan di Fase 3)

### 5.3 Roadmap Fase

| Fase | Nama | Konten Utama | Estimasi |
| --- | --- | --- | --- |
| 0 | Fondasi | Infrastruktur (Docker Compose, TrueNAS, Keycloak, PostgreSQL, MinIO), CI/CD, security baseline | 2 minggu |
| 1 | MVP | Semua modul in-scope MVP di atas | 10 minggu |
| 2 | Clinical Plus | DICOM viewer (OHIF/Cornerstone), OCR (Tesseract/Google Vision), integrasi SATUSEHAT FHIR R4, audit laporan lanjutan | 12 minggu |
| 3 | Enterprise | Multi-cabang, integrasi LIS/RIS/billing, SSO enterprise, API publik untuk sistem eksternal | 16 minggu |
| 4 | Resiliensi | DR site aktif (replikasi TrueNAS cross-site), Kubernetes HA, observability stack (Grafana/Loki/Tempo) | 12 minggu |
| 5 | AI Assist | OCR + NLP ekstrak data klinis, rekomendasi coding ICD-10, anomali deteksi akses | TBD |

---

## 6. Functional Requirements

## 6. Functional Requirements

*Format: User Story + Acceptance Criteria (Gherkin). Prioritas: M = Must Have, S = Should Have, C = Could Have.*

---

### 6.1 Auth & Session

**FR-AUTH-01** (M) — Login via OIDC + MFA

> *Sebagai pengguna terdaftar, saya ingin login dengan akun SSO dan MFA TOTP sehingga akses saya aman dari pembajakan sesi.*

```
Given pengguna membuka halaman login
When memasukkan kredensial OIDC yang valid
Then sistem mengarahkan ke prompt MFA TOTP
And setelah kode TOTP valid, sesi aktif dibuat dengan durasi 8 jam
And seluruh proses login dicatat di audit_log (event: LOGIN_SUCCESS)

Given pengguna memasukkan kode TOTP salah 3 kali
Then akun dikunci sementara 15 menit
And event LOGIN_FAILED_MFA dicatat di audit_log
```

**FR-AUTH-02** (M) — Timeout & Logout

> \*Sebagai admin keamanan, saya ingin sesi otomatis berakhir setelah idle sehingga terminal yang ditinggalkan tidak membuka akses.

```
Given pengguna tidak melakukan aktivitas selama 30 menit
Then sesi dihapus server-side
And pengguna diarahkan ke halaman login
And event SESSION_TIMEOUT dicatat di audit_log

Given pengguna klik tombol Logout
Then token OIDC direvoke di Keycloak
And cookie sesi dihapus
And event LOGOUT dicatat di audit_log
```

**FR-AUTH-03** (M) — RBAC Role-Based Access

> *Sebagai admin, saya ingin menetapkan role ke pengguna sehingga akses dibatasi sesuai tanggung jawab klinis.*

```
Given pengguna dengan role PERAWAT mengakses endpoint /admin/users
Then sistem mengembalikan HTTP 403
And event ACCESS_DENIED dicatat di audit_log

Given admin menetapkan role DOKTER ke user baru
Then user dapat melihat daftar pasien dan dokumen miliknya
But tidak dapat mengakses konfigurasi sistem atau audit log
```

---

### 6.2 Manajemen Pasien

**FR-PAT-01** (M) — Tambah Pasien

> \*Sebagai admin pendaftaran, saya ingin mendaftarkan pasien baru dengan data minimal sehingga dokumen dapat segera diunggah.

```
Given admin membuka form Pasien Baru
When mengisi No. RM (unik), nama lengkap, tanggal lahir, jenis kelamin
And menekan Simpan
Then rekord pasien tersimpan di tabel patients
And No. RM tervalidasi unik (tidak duplikat)
And event PATIENT_CREATED dicatat di audit_log
```

**FR-PAT-02** (M) — Cari Pasien

```
Given pengguna mengetikkan minimal 3 karakter di search bar
Then sistem menampilkan hasil dalam < 5 detik (p95)
And hasil dapat difilter dengan No. RM atau nama
And hanya pasien yang sesuai izin role pengguna yang tampil
```

**FR-PAT-03** (S) — Edit & Nonaktifkan Pasien

```
Given admin mengedit data pasien
Then perubahan tersimpan dengan timestamp dan user yang mengubah
And versi sebelumnya tetap ada di riwayat (soft history)

Given admin menonaktifkan pasien (bukan delete)
Then dokumen pasien tetap ada dengan status arsip
And akses dokumen tetap bisa dilakukan oleh pengguna berwenang
```

---

### 6.3 Manajemen Dokumen

**FR-DOC-01** (M) — Upload Dokumen

> *Sebagai staf medis, saya ingin mengunggah dokumen ke rekam medis pasien sehingga semua dokumen terpusat dan aman.*

```
Given pengguna memilih file PDF/JPG/DICOM (≤ 100 MB)
When menekan Upload
Then sistem melakukan:
  - Validasi tipe MIME dan ukuran
  - Hitung SHA-256 hash
  - Simpan file ke dataset TrueNAS via SMB/NFS atau MinIO S3
  - Simpan metadata (nama, hash, ukuran, tipe, uploader, timestamp) ke tabel documents
  - Catat event DOCUMENT_UPLOADED di audit_log
And konfirmasi sukses ditampilkan dalam < 30 detik (file 100 MB, LAN 100 Mbps)
```

**FR-DOC-02** (M) — Versioning Dokumen

```
Given pengguna mengunggah dokumen dengan nama yang sudah ada untuk pasien yang sama
Then sistem menyimpan sebagai versi baru (version++)
And versi lama tetap dapat diakses via riwayat versi
And hash SHA-256 masing-masing versi disimpan terpisah
```

**FR-DOC-03** (M) — Kategori Dokumen

```
Given pengguna mengunggah dokumen
Then wajib memilih kategori: Lab / Radiologi / Konsultasi / Identitas / Rujukan / Lainnya
And kategori dapat difilter di halaman dokumen pasien
```

**FR-DOC-04** (M) — Hapus Dokumen (Soft Delete)

```
Given pengguna dengan role yang diizinkan menekan Hapus
Then dokumen ditandai deleted_at, tidak tampil di UI
But file fisik di TrueNAS tidak dihapus sampai masa retensi habis
And event DOCUMENT_DELETED dicatat di audit_log
```

---

### 6.4 Pencarian & Filter

**FR-SEARCH-01** (M) — Pencarian Full-Text Metadata

```
Given pengguna di halaman pasien mengetik kata kunci
Then sistem mencari di nama dokumen, kategori, dan catatan
And hasil tampil dalam < 5 detik (p95)
And hanya dokumen yang dapat diakses pengguna yang tampil
```

**FR-SEARCH-02** (S) — Filter Tanggal & Kategori

```
Given pengguna mengaktifkan filter tanggal upload (dari-sampai) dan/atau kategori
Then daftar dokumen diperbarui tanpa reload halaman
And state filter tersimpan di URL query string
```

---

### 6.5 Unduh & Preview

**FR-DOWNLOAD-01** (M) — Unduh Dokumen Terotorisasi

```
Given pengguna dengan izin menekan Unduh
Then sistem mengecek permission di database
And jika diizinkan: generate signed URL/token sementara (TTL 60 detik)
And file distream ke browser
And event DOCUMENT_DOWNLOADED dicatat di audit_log

Given pengguna tanpa izin mencoba akses URL dokumen langsung
Then sistem mengembalikan HTTP 403
And event ACCESS_DENIED dicatat
```

**FR-DOWNLOAD-02** (S) — Preview Inline

```
Given pengguna klik tombol Preview pada dokumen PDF atau JPG
Then dokumen tampil di panel/modal dalam browser tanpa diunduh
And event DOCUMENT_VIEWED dicatat di audit_log
```

---

### 6.6 Audit Log

**FR-AUDIT-01** (M) — Log Append-Only

```
Given setiap event sistem terjadi (login, akses, upload, unduh, hapus)
Then satu baris dicatat di tabel audit_log (append INSERT only)
And tidak ada endpoint atau prosedur yang mengizinkan UPDATE atau DELETE audit_log
And setiap baris berisi: timestamp, user_id, patient_id (nullable), document_id (nullable), action, ip_address, user_agent, result
```

**FR-AUDIT-02** (M) — Ekspor Audit Log

```
Given auditor mengatur filter (rentang tanggal, user, pasien, tipe aksi)
Then sistem menghasilkan file CSV atau PDF laporan audit
And laporan berisi semua kolom audit_log yang relevan
And event AUDIT_EXPORT dicatat (siapa yang mengekspor kapan)
```

---

### 6.7 Retensi & Legal Hold

**FR-RETAIN-01** (M) — Kebijakan Retensi per Kategori

```
Given admin menetapkan kebijakan retensi (mis. Lab = 5 tahun, Radiologi = 5 tahun)
Then sistem menandai dokumen yang sudah melewati masa retensi
And dokumen tidak dihapus otomatis — flagged for review saja (konfirmasi stakeholder)
```

**FR-RETAIN-02** (S) — Legal Hold

```
Given admin compliance memasang Legal Hold pada dokumen atau pasien
Then dokumen tidak dapat dihapus meski masa retensi habis
And status Legal Hold tampil di UI dan di audit log
```

---

### 6.8 Dashboard TrueNAS

**FR-DASH-01** (M) — Status Pool & Kapasitas

```
Given admin IT membuka Dashboard
Then tampil: nama pool, status (ONLINE/DEGRADED/FAULTED), kapasitas terpakai vs total, persentase
And data diambil dari TrueNAS REST API /api/v2.0/pool dengan polling setiap 60 detik
And alert merah jika kapasitas > 85%
```

**FR-DASH-02** (M) — Daftar Snapshot & Job

```
Given admin membuka tab Snapshot
Then tampil daftar snapshot terbaru (nama, tanggal, ukuran, status)
And admin dapat memicu snapshot manual dari UI
And status Cloud Sync job (PENDING/RUNNING/SUCCESS/FAIL) tampil di tab terpisah
```

---

### 6.9 Admin

**FR-ADMIN-01** (M) — Manajemen User & Role

```
Given superadmin membuka halaman Users
Then dapat menambah, mengedit, menonaktifkan user
And menetapkan satu atau lebih role: SUPERADMIN / DOKTER / PERAWAT / ADMIN_PENDAFTARAN / LAB / RADIOGRAFER / AUDITOR
And perubahan role langsung efektif di sesi berikutnya
```

**FR-ADMIN-02** (M) — Rotasi API Key TrueNAS

```
Given admin IT memilih Rotate API Key di pengaturan
Then sistem menghasilkan API key baru dari TrueNAS
And key lama dinonaktifkan
And key baru disimpan ke secret manager, tidak pernah tampil di UI atau log
And event API_KEY_ROTATED dicatat di audit_log
```

---

## 7. Non-Functional Requirements

## 7. Non-Functional Requirements

### 7.1 Performa

| Metrik | Target | Kondisi |
| --- | --- | --- |
| Waktu pencarian pasien (p95) | < 5 detik | 10.000 pasien, 50 pengguna simultan |
| Upload 100 MB | < 30 detik | LAN 100 Mbps |
| Download 100 MB | < 15 detik | LAN 100 Mbps |
| LCP (halaman utama) | < 2,5 detik | Koneksi LAN |
| API response time (p99) | < 500 ms | Endpoint non-file |

### 7.2 Skalabilitas

- Arsitektur stateless pada layer aplikasi; sesi disimpan di Redis.
- Docker Compose untuk single-node (MVP); migrasi ke Kubernetes tanpa perubahan kode aplikasi.
- Database PostgreSQL dapat di-scale vertical (MVP) atau read-replica (Fase 2).
- MinIO mendukung scale-out ke cluster multi-node.

### 7.3 Keamanan

| Kontrol | Detail |
| --- | --- |
| Autentikasi | OIDC + MFA TOTP wajib; no password-only login |
| Enkripsi in-transit | TLS 1.2+ untuk semua komunikasi; SMB signing |
| Enkripsi at-rest | ZFS native encryption; kunci di KMS/secret manager |
| RBAC | Minimal permission per role; policy deny-by-default |
| API key TrueNAS | Disimpan di secret manager; tidak di ENV file, tidak di frontend |
| Input validation | Server-side validasi semua input; MIME type check file upload |
| Rate limiting | Login endpoint: max 10 request/menit per IP |
| CORS | Origin whitelist ketat; no wildcard |
| Dependency | Scan vulnerability otomatis di CI (Dependabot/Trivy) |

### 7.4 Ketersediaan

- Uptime target: ≥ 99,5% per bulan (downtime terencana maks. 3,65 jam/bulan).
- Maintenance window: di luar jam operasional klinik (konfirmasi stakeholder).
- Health check endpoint `/health` untuk monitoring dan container restart policy.

### 7.5 Auditabilitas

- Setiap perubahan data dan akses dokumen tercatat di `audit_log`.
- Tabel `audit_log` menggunakan constraint `GENERATED ALWAYS` untuk `id` dan trigger PostgreSQL yang menolak UPDATE/DELETE.
- Log diekspor ke SIEM eksternal (opsional, Fase 2) via webhook atau log shipper.

### 7.6 Kompatibilitas Browser

| Browser | Versi Minimum |
| --- | --- |
| Google Chrome | 110+ |
| Mozilla Firefox | 110+ |
| Microsoft Edge | 110+ |
| Safari | 16+ |

Mobile browser didukung untuk preview dan pencarian; upload direkomendasikan dari desktop.

### 7.7 Aksesibilitas

- Target: WCAG 2.1 Level AA untuk komponen utama.
- Semua form memiliki label yang dapat dibaca screen reader.
- Kontras warna minimum 4,5:1.
- Navigasi keyboard penuh untuk alur upload dan pencarian.

---

## 8. Arsitektur Sistem

## 8. Arsitektur Sistem

*Asumsi: Semua komponen di-deploy on-premise di jaringan klinik. TrueNAS dan backend berada di belakang VPN/WireGuard dan tidak terekspos ke internet.*

### 8.1 Diagram Komponen

```
┌─────────────────────────────────────────────────────────────────┐
│  INTERNET (akses terbatas via VPN)                              │
│   [Browser Staf / Auditor] ──VPN WireGuard──► [Nginx Reverse   │
│                                                  Proxy + TLS]  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS (TLS 1.2+)
┌────────────────────────────▼────────────────────────────────────┐
│  DMZ / App Layer (Docker Compose / Kubernetes)                  │
│                                                                 │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────────┐   │
│  │  Next.js     │  │  FastAPI       │  │  Keycloak/       │   │
│  │  Frontend    │◄─►  Backend API   │  │  Authentik OIDC  │   │
│  └──────────────┘  └───────┬────────┘  └──────────────────┘   │
│                            │                                    │
│  ┌─────────────┐  ┌────────▼────────┐  ┌──────────────────┐   │
│  │  Redis      │  │  PostgreSQL     │  │  Secret Manager  │   │
│  │  (Session)  │  │  (Metadata, DB) │  │  (API Keys, KMS) │   │
│  └─────────────┘  └─────────────────┘  └──────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API v2.0 + SMB/NFS/S3
┌────────────────────────────▼────────────────────────────────────┐
│  Storage Layer (Isolated Network Segment)                       │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  TrueNAS SCALE                                           │  │
│  │  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐  │  │
│  │  │  ZFS Pool  │  │  Snapshots   │  │  Cloud Sync     │  │  │
│  │  │  (RAIDZ2)  │  │  (Immutable) │  │  (B2/S3 remote) │  │  │
│  │  └────────────┘  └──────────────┘  └─────────────────┘  │  │
│  │  ┌────────────┐  ┌──────────────┐                        │  │
│  │  │  SMB/NFS   │  │  MinIO S3    │  (untuk DICOM/objek   │  │
│  │  │  Share     │  │  (S3 gateway)│   besar di Fase 2)    │  │
│  │  └────────────┘  └──────────────┘                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Alur Data Utama

**Upload Dokumen:**

```
Browser → Nginx → FastAPI → Validasi MIME + ukuran
  → Hitung SHA-256 → Write file ke TrueNAS (SMB/NFS mount)
  → Simpan metadata ke PostgreSQL → Tulis audit_log
  → Return 201 Created ke browser
```

**Unduh Dokumen:**

```
Browser → Nginx → FastAPI → Cek permission RBAC
  → Generate signed token (Redis, TTL 60s)
  → Stream file dari TrueNAS mount → Browser
  → Tulis audit_log (event: DOCUMENT_DOWNLOADED)
```

**Snapshot Terjadwal:**

```
FastAPI Scheduler (APScheduler) → TrueNAS REST API
  POST /api/v2.0/zfs/snapshot → TrueNAS membuat snapshot
  → FastAPI mencatat hasil di dashboard_events
  → Kirim alert email jika gagal
```

### 8.3 Batas Kepercayaan (Trust Boundary)

| Zona | Komponen | Kepercayaan |
| --- | --- | --- |
| Internet | Browser staf via VPN | Tidak dipercaya; wajib autentikasi |
| App Layer | FastAPI, Next.js, Redis, PostgreSQL | Dipercaya setelah autentikasi |
| Storage Layer | TrueNAS, MinIO | Dipercaya; akses via API key dari secret manager |
| Secret Manager | KMS, Vault/ENV terenkripsi | Dipercaya penuh; akses terbatas ke backend saja |

### 8.4 Stack Teknologi

| Layer | Teknologi |
| --- | --- |
| Frontend | Next.js 14+, React, TypeScript, Tailwind CSS |
| Backend API | Python 3.11+, FastAPI, Pydantic, SQLAlchemy |
| Database | PostgreSQL 15+ |
| Cache/Session | Redis 7+ |
| Auth | Keycloak 23+ atau Authentik (konfirmasi stakeholder) |
| Storage Engine | TrueNAS SCALE + ZFS |
| Object Storage | MinIO (S3-compatible, self-hosted) |
| Container | Docker Compose (MVP), Kubernetes (Fase 2+) |
| Reverse Proxy | Nginx |
| Secret Manager | HashiCorp Vault atau Docker Secrets (MVP) |
| Monitoring | Prometheus + Grafana (Fase 2) |

---

## 9. Model Data

## 9. Model Data

*Semua tabel menggunakan UUID v7 sebagai primary key untuk performa sort dan keamanan. Timestamps dalam UTC.*

### 9.1 Tabel Utama

**patients**

| Kolom | Tipe | Constraint | Keterangan |
| --- | --- | --- | --- |
| `id` | UUID | PK |  |
| `medical_record_no` | VARCHAR(50) | UNIQUE NOT NULL | No. Rekam Medis |
| `full_name` | VARCHAR(255) | NOT NULL |  |
| `birth_date` | DATE | NOT NULL |  |
| `gender` | ENUM('M','F','O') | NOT NULL |  |
| `is_active` | BOOLEAN | DEFAULT TRUE | Soft delete |
| `created_by` | UUID | FK → users |  |
| `created_at` | TIMESTAMPTZ | NOT NULL |  |
| `updated_at` | TIMESTAMPTZ | NOT NULL |  |

**documents**

| Kolom | Tipe | Constraint | Keterangan |
| --- | --- | --- | --- |
| `id` | UUID | PK |  |
| `patient_id` | UUID | FK → patients NOT NULL |  |
| `title` | VARCHAR(500) | NOT NULL | Nama dokumen |
| `category` | ENUM | NOT NULL | Lab/Radiologi/Konsultasi/Identitas/Rujukan/Lainnya |
| `version` | INTEGER | NOT NULL DEFAULT 1 |  |
| `parent_id` | UUID | FK → documents NULLABLE | Versi sebelumnya |
| `storage_path` | TEXT | NOT NULL | Path di TrueNAS atau MinIO object key |
| `storage_backend` | ENUM('SMB','NFS','S3') | NOT NULL |  |
| `file_size_bytes` | BIGINT | NOT NULL |  |
| `mime_type` | VARCHAR(100) | NOT NULL |  |
| `sha256_hash` | CHAR(64) | NOT NULL | Integritas file |
| `is_deleted` | BOOLEAN | DEFAULT FALSE | Soft delete |
| `deleted_at` | TIMESTAMPTZ | NULLABLE |  |
| `legal_hold` | BOOLEAN | DEFAULT FALSE | Mencegah penghapusan |
| `retention_expires_at` | TIMESTAMPTZ | NULLABLE |  |
| `uploaded_by` | UUID | FK → users |  |
| `created_at` | TIMESTAMPTZ | NOT NULL |  |

**users**

| Kolom | Tipe | Constraint | Keterangan |
| --- | --- | --- | --- |
| `id` | UUID | PK | Sinkron dengan Keycloak subject |
| `email` | VARCHAR(255) | UNIQUE NOT NULL |  |
| `full_name` | VARCHAR(255) | NOT NULL |  |
| `is_active` | BOOLEAN | DEFAULT TRUE |  |
| `last_login_at` | TIMESTAMPTZ | NULLABLE |  |
| `created_at` | TIMESTAMPTZ | NOT NULL |  |

**roles & user\_roles** (many-to-many)

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `roles.id` | UUID PK |  |
| `roles.name` | VARCHAR(50) UNIQUE | SUPERADMIN, DOKTER, PERAWAT, dst. |
| `roles.permissions` | JSONB | Array permission string |
| `user_roles.user_id` | UUID FK |  |
| `user_roles.role_id` | UUID FK |  |

**retention\_policies**

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `id` | UUID PK |  |
| `category` | VARCHAR(100) | Kategori dokumen |
| `retention_years` | INTEGER | Periode retensi dalam tahun |
| `description` | TEXT |  |
| `created_at` | TIMESTAMPTZ |  |

### 9.2 Tabel Audit Log (Append-Only)

**audit\_log**

| Kolom | Tipe | Constraint | Keterangan |
| --- | --- | --- | --- |
| `id` | BIGSERIAL | PK | Auto-increment |
| `event_time` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |  |
| `user_id` | UUID | NULLABLE FK → users | Null jika sistem/anonim |
| `patient_id` | UUID | NULLABLE FK → patients |  |
| `document_id` | UUID | NULLABLE FK → documents |  |
| `action` | VARCHAR(100) | NOT NULL | LOGIN, LOGOUT, DOCUMENT\_UPLOADED, dll. |
| `result` | ENUM('SUCCESS','FAIL','DENIED') | NOT NULL |  |
| `ip_address` | INET | NOT NULL |  |
| `user_agent` | TEXT | NULLABLE |  |
| `detail` | JSONB | NULLABLE | Data tambahan kontekstual |

**Aturan Append-Only (wajib diimplementasikan):**

```sql
-- Trigger menolak UPDATE dan DELETE di audit_log
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

-- Revoke privilege DELETE/UPDATE dari application user
REVOKE UPDATE, DELETE ON audit_log FROM medstore_app;
```

### 9.3 Relasi Antar Tabel

```
users ──< user_roles >── roles
users ──< documents (uploaded_by)
users ──< audit_log (user_id)
patients ──< documents (patient_id)
patients ──< audit_log (patient_id)
documents ──< audit_log (document_id)
documents.parent_id → documents.id (self-referential, versioning)
retention_policies ─ category → documents.category
```

---

## 10. Integrasi

## 10. Integrasi

### 10.1 TrueNAS REST API v2.0

**Autentikasi:** API key dari secret manager, dikirim sebagai header `Authorization: Bearer <key>`. Tidak pernah di-log atau ditampilkan di frontend.

| Endpoint TrueNAS | Method | Penggunaan MedStore |
| --- | --- | --- |
| `/api/v2.0/pool` | GET | Ambil daftar pool & status |
| `/api/v2.0/pool/dataset` | GET/POST | Cek/buat dataset per pasien |
| `/api/v2.0/zfs/snapshot` | GET/POST | Daftar & buat snapshot manual |
| `/api/v2.0/cloudsync/job` | GET | Pantau status Cloud Sync |
| `/api/v2.0/disk` | GET | Status disk & SMART |
| `/api/v2.0/alert/list` | GET | Alert aktif TrueNAS |
| `/api/v2.0/auth/generate_token` | POST | Buat token sementara (opsional) |

**Penanganan Job Asinkron:** Endpoint TrueNAS tertentu (mis. cloud sync, snapshot besar) mengembalikan `job_id`. FastAPI menggunakan APScheduler atau Celery worker untuk polling `GET /api/v2.0/core/get_jobs?id=<job_id>` sampai status `SUCCESS` atau `FAILED`, lalu memperbarui `dashboard_events` di PostgreSQL.

**File I/O:**

- PDF/JPG/DICOM ≤ 100 MB: ditulis ke TrueNAS via SMB mount (`/mnt/medstore/<medical_record_no>/`) menggunakan `pysmb` atau mount via Docker volume.
- DICOM besar / objek ≥ 100 MB (Fase 2): ditulis ke MinIO via `boto3` (S3-compatible API).

### 10.2 MinIO / S3

- MinIO di-deploy sebagai container terpisah, dikonfigurasi dengan access key dari secret manager.
- Bucket per kategori dokumen atau per tahun (konfirmasi arsitektur dengan tim DevOps).
- Presigned URL (TTL 60 detik) digunakan untuk streaming download ke browser tanpa membuka bucket secara publik.
- Lifecycle rules di MinIO untuk menandai objek expired sesuai retention policy.

### 10.3 OIDC — Keycloak / Authentik

- Backend FastAPI memvalidasi JWT access token dari Keycloak menggunakan JWKS endpoint.
- Klaim JWT yang digunakan: `sub` (user ID), `email`, `realm_access.roles`.
- MFA TOTP dikonfigurasi sebagai required authentication flow di Keycloak.
- Refresh token disimpan di Redis, bukan di browser cookie (konfirmasi dengan tim security).

### 10.4 FHIR / SATUSEHAT (Fase 2)

| Aspek | Detail |
| --- | --- |
| Standar | FHIR R4 (HL7) |
| Endpoint target | SATUSEHAT Platform API (platform.satusehat.kemkes.go.id) |
| Integrasi utama | Patient resource, DocumentReference, DiagnosticReport |
| Autentikasi | OAuth 2.0 client credentials ke SATUSEHAT |
| Arah data | MedStore → SATUSEHAT (push), bukan pull |
| Perlu konfirmasi | Data apa yang wajib dikirim; frekuensi sinkronisasi; penanganan error & retry |

### 10.5 DICOM (Fase 2)

- File DICOM disimpan di MinIO (S3).
- OHIF Viewer atau Cornerstone.js di-embed di frontend untuk preview DICOM tanpa download.
- Metadata DICOM (StudyUID, SeriesUID, Modality) diekstrak oleh backend saat upload dan disimpan di PostgreSQL.
- DICOMweb (WADO-RS) endpoint disediakan oleh Orthanc atau Horos server di jaringan internal (konfirmasi arsitektur).

---

## 11. Keamanan & Kepatuhan

## 11. Keamanan & Kepatuhan

### 11.1 Kontrol Keamanan Wajib

| Kontrol | Implementasi | Status MVP |
| --- | --- | --- |
| MFA TOTP | Keycloak required authentication flow | ✅ Wajib |
| RBAC | Roles + permissions di PostgreSQL; enforced di FastAPI middleware | ✅ Wajib |
| Enkripsi at-rest | ZFS native encryption + kunci di KMS/secret manager | ✅ Wajib |
| Enkripsi in-transit | TLS 1.2+ (Nginx), SMB signing (TrueNAS) | ✅ Wajib |
| Audit log immutable | PostgreSQL trigger + REVOKE DML | ✅ Wajib |
| Backup 3-2-1 | 3 salinan, 2 media, 1 offsite (Cloud Sync TrueNAS) | ✅ Wajib |
| Snapshot immutable | ZFS snapshot tidak dapat dimodifikasi retroaktif | ✅ Wajib |
| Uji restore berkala | Minimal 1x/bulan; hasil dicatat | ✅ Wajib |
| Input validation | Server-side; MIME type; ukuran file | ✅ Wajib |
| Secret management | API key, DB credentials di Vault/Docker Secrets | ✅ Wajib |
| Rate limiting | Login: 10 req/menit/IP via Nginx | ✅ Wajib |
| Dependency scan | Trivy/Dependabot di CI pipeline | ✅ Wajib |

### 11.2 Pemetaan Regulasi

**UU PDP No. 27/2022**

| Pasal/Kewajiban | Implementasi MedStore |
| --- | --- |
| Pasal 16: Keamanan Data Pribadi | Enkripsi at-rest + in-transit; MFA; audit log |
| Pasal 26: Pemberitahuan insiden | Prosedur notifikasi insiden < 14 hari (lihat 11.3) |
| Pasal 20: Pembatasan akses | RBAC; minimum necessary access per role |
| Pasal 22: Akurasi data | Validasi input; versioning dokumen |
| Pasal 65: Penghapusan data | Soft delete + retention policy; hard delete setelah masa retensi |

**Permenkes No. 24/2022 (Rekam Medis Digital)**

| Ketentuan | Implementasi MedStore |
| --- | --- |
| Rekam medis wajib disimpan 5 tahun | Retention policy default 5 tahun; ringkasan 25 tahun (konfirmasi compliance officer) |
| Integritas & keaslian dokumen | SHA-256 hash per dokumen + versi |
| Akses terbatas | RBAC per peran klinis |
| Backup & ketersediaan | Backup 3-2-1 + RTO 4 jam + RPO 15 menit |
| Tanda tangan elektronik (Fase 2) | Perlu kajian implementasi TTE tersertifikasi (konfirmasi compliance) |

### 11.3 Prosedur Insiden

1. **Deteksi** — Alert dari monitoring (Grafana) atau laporan pengguna.
2. **Klasifikasi** — P1 (kebocoran data pasien), P2 (gangguan layanan), P3 (anomali kecil).
3. **Isolasi** — Nonaktifkan user/sesi yang terdampak; blokir IP jika perlu.
4. **Investigasi** — Analisis audit\_log; identifikasi scope data yang terdampak.
5. **Notifikasi** — Untuk P1: notifikasi ke manajemen + DPO dalam 24 jam; ke regulator (BPJPH/Kominfo) dalam 14 hari kerja sesuai UU PDP Pasal 26 (konfirmasi dengan compliance officer untuk persyaratan persisnya).
6. **Pemulihan** — Restore dari snapshot; reset kredensial; patch kerentanan.
7. **Post-mortem** — Dokumen insiden, root cause, tindakan pencegahan.

### 11.4 Data Residency

- Data pasien wajib disimpan di server on-premise klinik (Indonesia).
- Cloud Sync TrueNAS (backup offsite) hanya ke penyedia cloud dengan data center di Indonesia, atau dengan perjanjian DPA yang memenuhi UU PDP (perlu konfirmasi compliance officer untuk vendor cloud yang diizinkan).
- SATUSEHAT: data dikirim ke platform pemerintah Indonesia — residency terpenuhi.

### 11.5 Prosedur Escrow Kunci Enkripsi

- Kunci ZFS encryption dan KMS diescrow ke minimal 2 pihak terpisah (mis. direktur klinik + admin IT senior).
- Prosedur pemulihan kunci didokumentasikan dan diuji minimal 1x/tahun.
- Kunci tidak pernah disimpan bersamaan dengan data terenkripsi.

---

## 12. UX/UI Principles

## 12. UX/UI Principles

### 12.1 Prinsip Desain

| Prinsip | Implementasi |
| --- | --- |
| **Minimum cognitive load** | Alur utama ≤ 3 klik; label Bahasa Indonesia; ikon dengan label teks |
| **Error prevention** | Konfirmasi sebelum hapus; validasi real-time di form; preview sebelum upload |
| **Transparency** | Status operasi selalu tampil (loading, sukses, gagal) |
| **Role-aware UI** | Komponen yang tidak relevan untuk role tidak ditampilkan (bukan di-disable) |
| **Aksesibilitas** | WCAG 2.1 AA; keyboard navigable; screen reader compatible |
| **Responsif** | Desktop-first; mobile view untuk pencarian dan preview |

### 12.2 Wireframe Tingkat Tinggi (Deskripsi Teks)

**Halaman Login** Logo klinik + nama produk di tengah. Form email + password. Tombol "Masuk". Setelah sukses, redirect ke halaman MFA: input 6 digit kode TOTP. Link "Hubungi Admin" jika lupa password.

**Dashboard Utama (Staf Medis)** Top nav: logo, nama pengguna, role, tombol Logout. Search bar besar di tengah atas (placeholder: "Cari pasien — No. RM atau nama"). Di bawah: kartu statistik ringkas (total pasien, dokumen hari ini, alert storage). Side nav (collapsible): Pasien, Dokumen, Audit Log (hanya AUDITOR), Admin (hanya SUPERADMIN), Dashboard TrueNAS (hanya IT).

**Halaman Dokumen Pasien** Header: nama pasien, No. RM, tanggal lahir. Tab kategori (Semua / Lab / Radiologi / Konsultasi / dll). Tabel dokumen: nama, kategori, tanggal upload, uploader, versi, aksi (Preview / Unduh / Versi). Tombol "Upload Dokumen" di pojok kanan atas (sticky).

**Modal Upload Dokumen (3 Klik)**

1. Klik "Upload Dokumen"
2. Drag-and-drop atau Browse file → pilih kategori dari dropdown → opsional: nama dokumen
3. Klik "Upload" → progress bar → konfirmasi sukses

**Dashboard TrueNAS (Admin IT)** Grid kartu: Pool Status (nama, health badge hijau/merah/kuning, % kapasitas progress bar). Daftar 10 snapshot terbaru (nama, waktu, ukuran). Status Cloud Sync (RUNNING/SUCCESS/FAIL + timestamp). Tombol "Snapshot Sekarang" dan "Uji Restore".

**Halaman Audit Log (Auditor)** Filter panel di atas: pilih pasien (autocomplete), rentang tanggal, user, tipe aksi. Tabel hasil: waktu, user, pasien, dokumen, aksi, hasil, IP. Tombol ekspor CSV dan PDF di kanan atas.

### 12.3 Alur Utama dengan Target Waktu

| Alur | Langkah | Target |
| --- | --- | --- |
| Upload dokumen | 3 klik (buka modal → pilih file+kategori → upload) | < 30 detik (file 100 MB) |
| Cari pasien & buka dokumen | Ketik ≥ 3 karakter → pilih pasien → klik dokumen | < 10 detik total |
| Login + MFA | Isi email+password → submit → isi TOTP → submit | < 30 detik |
| Ekspor audit log | Atur filter → klik Ekspor → download | < 60 detik (1.000 record) |

---

## 13. Rencana Rilis & Roadmap

## 13. Rencana Rilis & Roadmap

*Asumsi: Tim 4–5 orang (1 PM, 1 backend, 1 frontend, 1 DevOps/full-stack, 1 QA). Estimasi dapat berubah sesuai kapasitas tim aktual.*

### 13.1 Fase 0 — Fondasi (Minggu 1–2)

**Milestone:** Infrastruktur berjalan, CI/CD aktif, tim bisa develop lokal.

| Task | Owner | Deliverable |
| --- | --- | --- |
| Setup TrueNAS + ZFS pool + dataset awal | DevOps | TrueNAS running, API accessible |
| Deploy Keycloak + konfigurasi realm & MFA | DevOps | OIDC endpoint aktif |
| Setup PostgreSQL + schema awal | Backend | DB dengan tabel dasar + trigger audit |
| Setup MinIO | DevOps | S3 endpoint aktif |
| Docker Compose dev environment | DevOps | `docker compose up` fully working |
| CI/CD pipeline (GitHub Actions) | DevOps | Auto-test + lint setiap PR |
| Secret Manager (Vault dev mode atau Docker Secrets) | DevOps | Tidak ada secret di ENV file |

**Dependency:** Hardware TrueNAS tersedia sebelum Fase 0.

### 13.2 Fase 1 — MVP (Minggu 3–12)

| Sprint | Minggu | Fokus | Gate |
| --- | --- | --- | --- |
| S1 | 3–4 | Auth (login, MFA, RBAC, sesi timeout) | Login end-to-end berfungsi |
| S2 | 5–6 | Manajemen pasien (CRUD, pencarian) | Cari pasien < 5 detik |
| S3 | 7–8 | Upload & manajemen dokumen (versioning, hash, kategori) | Upload 100 MB sukses |
| S4 | 9–10 | Unduh, preview, audit log, retensi dasar | Audit log immutable verified |
| S5 | 11 | Dashboard TrueNAS, admin user/role | Dashboard live data |
| S6 | 12 | QA akhir, penetration test ringan, UAT, hardening | Sign-off stakeholder |

**Milestone Go-Live MVP:** Akhir Minggu 12.

### 13.3 Fase 2 — Clinical Plus (Bulan 4–6)

- DICOM viewer (OHIF/Cornerstone embed)
- OCR dokumen (Tesseract/cloud vision)
- Integrasi SATUSEHAT FHIR R4
- Audit log export ke SIEM
- Observability stack (Prometheus + Grafana + Loki)

**Dependency Fase 2:** Akses sandbox SATUSEHAT, lisensi/quota OCR engine, TTE tersertifikasi (jika diperlukan regulasi).

### 13.4 Fase 3 — Enterprise (Bulan 7–10)

- Multi-cabang / multi-tenant (row-level security PostgreSQL)
- Integrasi LIS, RIS, billing
- API publik (REST + webhook) untuk sistem eksternal
- SSO enterprise (Active Directory / LDAP)

### 13.5 Fase 4 — Resiliensi (Bulan 11–13)

- DR site aktif (replikasi TrueNAS cross-site + failover)
- Kubernetes HA (multi-node, auto-scaling)
- RTO < 1 jam, RPO < 5 menit

### 13.6 Fase 5 — AI Assist (TBD)

- OCR + NLP ekstraksi data klinis terstruktur
- Anomali deteksi akses (ML-based)
- Rekomendasi kode ICD-10

---

## 14. Risiko & Mitigasi

## 14. Risiko & Mitigasi

*Skala Likelihood dan Impact: H = Tinggi, M = Sedang, L = Rendah.*

| # | Risiko | Kategori | Likelihood | Impact | Mitigasi |
| --- | --- | --- | --- | --- | --- |
| R01 | Kegagalan hardware TrueNAS (disk failure) | Teknis | M | H | RAIDZ2; snapshot harian; backup 3-2-1; uji restore bulanan; spare disk tersedia |
| R02 | Kebocoran API key TrueNAS | Keamanan | L | H | Secret manager; rotasi key periodik; audit akses API; key tidak pernah di log/frontend |
| R03 | Ransomware mengenkripsi storage | Keamanan | M | H | Snapshot immutable ZFS; backup offsite terpisah; segmentasi jaringan; backup tidak di-mount permanen |
| R04 | Pengguna mengakses dokumen pasien di luar wewenangnya | Keamanan/Kepatuhan | M | H | RBAC granular; audit log per akses; alert anomali akses (Fase 2); review audit berkala |
| R05 | Regulasi SATUSEHAT berubah sebelum Fase 2 selesai | Kepatuhan | H | M | Desain adapter layer yang dapat diperbarui; pantau update API SATUSEHAT; buat integrasi opsional/toggle |
| R06 | Performa lambat saat 50+ pengguna simultan | Teknis | M | M | Load test sebelum go-live; koneksi pooling PostgreSQL (PgBouncer); Redis cache untuk query sering; CDN untuk aset statis |
| R07 | Resistensi adopsi pengguna (staf non-teknis) | Adopsi | H | M | UAT dengan pengguna nyata; training sebelum go-live; UI intuitif Bahasa Indonesia; hotline support awal |
| R08 | Ketidakjelasan kebijakan retensi rekam medis | Kepatuhan | M | M | Eskalasi ke compliance officer sejak Fase 0; implementasikan dengan nilai konservatif (5 tahun) sambil menunggu konfirmasi |
| R09 | Waktu pengembangan melebihi estimasi | Operasional | M | M | Sprint planning 2 mingguan; potong fitur S (Should Have) jika terlambat; daily standup; backlog yang diprioritaskan |
| R10 | Kunci enkripsi ZFS hilang / tidak terescrow dengan benar | Teknis/Operasional | L | H | Prosedur escrow didokumentasikan + diuji sejak Fase 0; minimal 2 pemegang kunci; drills pemulihan kunci |
| R11 | Vendor Keycloak/Authentik tidak sesuai kebutuhan di lapangan | Teknis | L | M | Evaluasi 2 vendor di Fase 0; desain auth layer abstrak sehingga dapat diganti tanpa ubah aplikasi |
| R12 | Perubahan TrueNAS REST API v2.0 (breaking change) | Teknis | L | M | Pin versi TrueNAS; gunakan adapter pattern di kode integrasi; integration test otomatis terhadap API |
| R13 | Data pasien tidak akurat karena input ganda / salah RM | Operasional | M | M | Validasi uniqueness No. RM; peringatan saat nama mirip ditemukan; proses merge pasien duplikat (Fase 2) |

---

## 15. Pertanyaan Terbuka

## 15. Pertanyaan Terbuka

Item berikut perlu keputusan dari stakeholder sebelum atau selama Fase 0–1.

| # | Pertanyaan | Pemilik | Tenggat |
| --- | --- | --- | --- |
| Q01 | Berapa lama retensi rekam medis per kategori dokumen yang ditetapkan klinik? (Minimum hukum: 5 tahun RM, 25 tahun ringkasan — perlu konfirmasi compliance officer) | DPO / Compliance | Sebelum Sprint S4 |
| Q02 | Vendor OIDC mana yang dipilih: Keycloak atau Authentik? | Admin IT + Engineering | Fase 0 |
| Q03 | Vendor secret manager yang digunakan di produksi: HashiCorp Vault, Docker Secrets, atau lainnya? | DevOps | Fase 0 |
| Q04 | Provider cloud mana untuk backup offsite (Cloud Sync TrueNAS)? Apakah sudah ada DPA? (perlu konfirmasi data residency Indonesia) | DPO + Manajemen | Sebelum go-live |
| Q05 | Apakah diperlukan Tanda Tangan Elektronik (TTE) tersertifikasi di MVP atau bisa ditunda ke Fase 2? | DPO / Compliance | Sprint S1 |
| Q06 | Bagaimana kebijakan akses dokumen lintas spesialisasi? (mis. dokter umum bisa lihat hasil radiologi?) | Manajemen Medis | Sprint S2 |
| Q07 | Siapa pemegang kunci escrow enkripsi ZFS? Prosedur pemulihan disetujui siapa? | Manajemen + IT | Fase 0 |
| Q08 | Apakah watermark wajib saat unduh dokumen? Format watermark? | Manajemen | Sprint S4 |
| Q09 | Nomor RM: auto-generate oleh sistem atau input manual dari SIM rumah sakit yang ada? | Manajemen Medis + IT | Sprint S2 |
| Q10 | Maintenance window yang disepakati untuk update dan backup (agar tidak ganggu jam operasional)? | Manajemen + IT | Sebelum go-live |
| Q11 | Bagaimana penanganan pasien yang sama di cabang berbeda (multi-RM vs satu RM) — relevan untuk Fase 3? | Manajemen Medis | Fase 3 planning |
| Q12 | Apakah audit log perlu dikirim ke SIEM eksternal di MVP atau cukup di PostgreSQL dahulu? | DPO + IT | Sprint S4 |

---

## 16. Lampiran

## 16. Lampiran

### 16.1 Glosarium

| Istilah | Definisi |
| --- | --- |
| **ZFS** | Zettabyte File System — sistem berkas dengan integritas data built-in, snapshot atomic, dan enkripsi native. Digunakan TrueNAS SCALE sebagai filesystem utama. |
| **Snapshot** | Salinan read-only dari state filesystem pada waktu tertentu. Di ZFS, snapshot bersifat atomic dan tidak memerlukan salinan penuh data (copy-on-write). |
| **WORM** | Write Once Read Many — properti storage di mana data yang sudah ditulis tidak dapat diubah atau dihapus. ZFS snapshot bersifat immutable secara efektif. |
| **RAIDZ2** | Konfigurasi ZFS setara RAID-6 — toleran terhadap kegagalan 2 disk sekaligus. |
| **3-2-1 Backup** | 3 salinan data, di 2 media berbeda, 1 di lokasi offsite. |
| **RBAC** | Role-Based Access Control — mekanisme otorisasi di mana hak akses ditentukan berdasarkan peran (role) pengguna, bukan identitas individu. |
| **OIDC** | OpenID Connect — protokol autentikasi berbasis OAuth 2.0. Digunakan MedStore via Keycloak/Authentik untuk SSO. |
| **MFA TOTP** | Multi-Factor Authentication menggunakan Time-based One-Time Password (mis. Google Authenticator). |
| **FHIR** | Fast Healthcare Interoperability Resources — standar internasional (HL7) untuk pertukaran data kesehatan. Versi R4 yang digunakan. |
| **SATUSEHAT** | Platform interoperabilitas data kesehatan nasional Indonesia (Kemenkes). |
| **DICOM** | Digital Imaging and Communications in Medicine — standar format file dan protokol untuk data pencitraan medis (CT, MRI, X-ray). |
| **DICOMweb** | Standar web service (WADO-RS, STOW-RS, QIDO-RS) untuk mengakses data DICOM via HTTP. |
| **SMB** | Server Message Block — protokol berbagi file jaringan (Windows). TrueNAS mendukung SMB share. |
| **NFS** | Network File System — protokol berbagi file jaringan (Unix/Linux). |
| **KMS** | Key Management System — sistem pengelolaan kunci enkripsi terpusat. |
| **RPO** | Recovery Point Objective — toleransi kehilangan data maksimum (dalam waktu) jika terjadi insiden. |
| **RTO** | Recovery Time Objective — target waktu pemulihan layanan setelah insiden. |
| **UU PDP** | Undang-Undang Perlindungan Data Pribadi No. 27/2022 — regulasi perlindungan data Indonesia. |
| **Permenkes 24/2022** | Peraturan Menteri Kesehatan No. 24 Tahun 2022 tentang Rekam Medis — mengatur penyimpanan dan keamanan rekam medis digital di Indonesia. |
| **DPO** | Data Protection Officer — pejabat perlindungan data di organisasi, bertanggung jawab atas kepatuhan UU PDP. |
| **Legal Hold** | Penangguhan penghapusan dokumen karena proses hukum atau investigasi aktif. |
| **SHA-256** | Secure Hash Algorithm 256-bit — algoritma hash kriptografis untuk verifikasi integritas file. |
| **Soft Delete** | Penghapusan logis (menandai data sebagai terhapus) tanpa menghapus data fisik, memungkinkan pemulihan. |
| **APScheduler** | Advanced Python Scheduler — library Python untuk penjadwalan task terdistribusi. |

### 16.2 Referensi Regulasi

| Regulasi | Sumber |
| --- | --- |
| UU No. 27/2022 tentang Perlindungan Data Pribadi | jdih.kominfo.go.id |
| Permenkes No. 24/2022 tentang Rekam Medis | jdih.kemkes.go.id |
| SATUSEHAT Platform Developer Documentation | platform.satusehat.kemkes.go.id |
| HL7 FHIR R4 Specification | hl7.org/fhir/R4 |
| TrueNAS REST API v2.0 Documentation | truenas.com/docs |
| WCAG 2.1 (Web Content Accessibility Guidelines) | w3.org/TR/WCAG21 |

### 16.3 Versi Dokumen

| Versi | Tanggal | Perubahan | Penulis |
| --- | --- | --- | --- |
| 1.0 | 21 Oktober 2026 | Draft awal — semua bagian | Tim Produk |
| — | — | Pending review stakeholder | — |
