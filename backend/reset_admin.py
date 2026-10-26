"""Force-reset the MedStore superadmin password.

Usage (from backend/):
    python reset_admin.py                 # resets admin@medstore.local to Admin123!
    python reset_admin.py email@x.local NewPass123!

Use this when the account exists with an unknown/invalid hash.
"""
import asyncio
import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.database import async_session_factory
from app.models.user import Role, User

DEFAULT_EMAIL = "admin@medstore.local"
DEFAULT_PASSWORD = "Admin123!"


async def main() -> None:
    email = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_EMAIL
    password = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_PASSWORD

    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user is None:
            role_result = await session.execute(select(Role).where(Role.name == "SUPERADMIN"))
            role = role_result.scalar_one_or_none()
            user = User(
                email=email,
                full_name="System Superadmin",
                hashed_password=hash_password(password),
                is_active=True,
                mfa_enabled=False,
                roles=[role] if role else [],
            )
            session.add(user)
            print(f"Created {email} with the provided password.")
        else:
            user.hashed_password = hash_password(password)
            user.is_active = True
            print(f"Password reset for {email}.")

        await session.commit()


if __name__ == "__main__":
    asyncio.run(main())
