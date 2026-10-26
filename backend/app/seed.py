import asyncio
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.database import Base, async_session_factory, engine
from app.models import *  # noqa: F401,F403 — register all tables on Base.metadata
from app.models.retention import RetentionPolicy
from app.models.user import Role, User

ROLES_DATA = [
    {
        "name": "SUPERADMIN",
        "permissions": [
            "users:create", "users:read", "users:update", "users:delete",
            "roles:read", "roles:manage",
            "patients:create", "patients:read", "patients:update", "patients:delete",
            "documents:create", "documents:read", "documents:update", "documents:delete",
            "audit:read", "audit:export",
            "dashboard:read", "storage:manage", "retention:manage",
        ],
    },
    {
        "name": "DOKTER",
        "permissions": [
            "patients:read", "patients:update",
            "documents:create", "documents:read", "documents:versions",
            "dashboard:read",
        ],
    },
    {
        "name": "PERAWAT",
        "permissions": [
            "patients:read",
            "documents:read",
        ],
    },
    {
        "name": "ADMIN_PENDAFTARAN",
        "permissions": [
            "patients:create", "patients:read", "patients:update",
            "documents:create", "documents:read",
            "dashboard:read",
        ],
    },
    {
        "name": "LAB",
        "permissions": [
            "patients:read",
            "documents:create", "documents:read",
        ],
    },
    {
        "name": "RADIOGRAFER",
        "permissions": [
            "patients:read",
            "documents:create", "documents:read",
        ],
    },
    {
        "name": "AUDITOR",
        "permissions": [
            "patients:read",
            "documents:read",
            "audit:read", "audit:export",
        ],
    },
]

RETENTION_POLICIES_DATA = [
    {"category": "Lab", "retention_years": 5, "description": "Hasil tes laboratorium klinis disimpan 5 tahun"},
    {"category": "Radiologi", "retention_years": 10, "description": "Berkas citra radiologi (X-ray, CT, MRI) disimpan 10 tahun"},
    {"category": "Konsultasi", "retention_years": 10, "description": "Catatan rekam medis konsultasi dokter disimpan 10 tahun"},
    {"category": "Identitas", "retention_years": 25, "description": "Dokumen identitas pasien disimpan selama 25 tahun"},
    {"category": "Rujukan", "retention_years": 5, "description": "Surat rujukan faskes disimpan 5 tahun"},
    {"category": "Lainnya", "retention_years": 5, "description": "Dokumen pendukung lainnya disimpan 5 tahun"},
]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        # 1. Seed Roles
        role_map = {}
        for r_data in ROLES_DATA:
            stmt = select(Role).where(Role.name == r_data["name"])
            existing = (await session.execute(stmt)).scalar_one_or_none()
            if existing:
                existing.permissions = r_data["permissions"]
                role_map[r_data["name"]] = existing
            else:
                new_role = Role(name=r_data["name"], permissions=r_data["permissions"])
                session.add(new_role)
                role_map[r_data["name"]] = new_role

        await session.flush()

        # Re-fetch roles with assigned IDs
        for name in role_map:
            stmt = select(Role).where(Role.name == name)
            role_map[name] = (await session.execute(stmt)).scalar_one()

        # 2. Seed Superadmin User
        admin_email = "admin@medstore.local"
        stmt = select(User).where(User.email == admin_email)
        admin_user = (await session.execute(stmt)).scalar_one_or_none()

        if not admin_user:
            admin_user = User(
                email=admin_email,
                full_name="System Superadmin",
                hashed_password=hash_password("Admin123!"),
                is_active=True,
                mfa_enabled=False,
                roles=[role_map["SUPERADMIN"]],
            )
            session.add(admin_user)
            print(f"[Seed] Created superadmin: {admin_email} / Admin123!")
        else:
            # Repair default credentials only for an untouched account:
            # valid bcrypt hash that never logged in and does not match the default password.
            from app.core.security import verify_password

            needs_repair = (
                admin_user.last_login_at is None
                and (
                    not str(admin_user.hashed_password).startswith("$2")
                    or not verify_password("Admin123!", admin_user.hashed_password)
                )
            )
            if needs_repair:
                admin_user.hashed_password = hash_password("Admin123!")
                print("[Seed] Reset unused superadmin to default password")
            if not admin_user.roles:
                admin_user.roles = [role_map["SUPERADMIN"]]
            if not admin_user.is_active:
                admin_user.is_active = True
            print(f"[Seed] Superadmin ready: {admin_email}")

        # 3. Seed Retention Policies
        for p_data in RETENTION_POLICIES_DATA:
            stmt = select(RetentionPolicy).where(RetentionPolicy.category == p_data["category"])
            existing_p = (await session.execute(stmt)).scalar_one_or_none()
            if not existing_p:
                new_p = RetentionPolicy(
                    category=p_data["category"],
                    retention_years=p_data["retention_years"],
                    description=p_data["description"],
                )
                session.add(new_p)

        await session.commit()
        print("[Seed] Seeding completed successfully.")


if __name__ == "__main__":
    asyncio.run(seed())
