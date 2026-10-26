# MedStore — Clinical Storage Application

Penyimpanan & Manajemen Rekam Medis Klinis Patuh Regulasi UU PDP & Permenkes 24/2022 dengan integrasi TrueNAS SCALE (REST API v2.0 + SMB) dan antarmuka Material Design 3.

## Tech Stack
- **Frontend**: Next.js 14, React, Tailwind CSS, TypeScript, Material Design 3 Tokens
- **Backend**: FastAPI, Python 3.11+, SQLAlchemy, PostgreSQL, Redis, smbprotocol

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
