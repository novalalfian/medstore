import asyncio
import asyncpg


async def fix():
    try:
        conn = await asyncpg.connect("postgresql://medstore:medstore_secret@localhost:5432/medstore")
    except Exception as e:
        print("Failed to connect:", e)
        return

    print("Connected to PostgreSQL database 'medstore'!")
    rows = await conn.fetch("SELECT typname FROM pg_type WHERE typname IN ('audit_result', 'audit_result_type', 'storage_backend', 'storage_backend_type')")
    types = [r["typname"] for r in rows]
    print("Found existing types:", types)

    if "audit_result_type" in types and "audit_result" not in types:
        await conn.execute("ALTER TYPE audit_result_type RENAME TO audit_result;")
        print("Success: Renamed audit_result_type -> audit_result")
    elif "audit_result" not in types:
        await conn.execute("CREATE TYPE audit_result AS ENUM ('SUCCESS', 'FAIL', 'DENIED');")
        print("Success: Created audit_result enum")
    else:
        print("audit_result already exists.")

    if "storage_backend_type" in types and "storage_backend" not in types:
        await conn.execute("ALTER TYPE storage_backend_type RENAME TO storage_backend;")
        print("Success: Renamed storage_backend_type -> storage_backend")
    elif "storage_backend" not in types:
        await conn.execute("CREATE TYPE storage_backend AS ENUM ('SMB', 'NFS', 'S3', 'LOCAL');")
        print("Success: Created storage_backend enum")
    else:
        print("storage_backend already exists.")

    # Check if admin user exists in DB
    users = await conn.fetch("SELECT id, email, is_active FROM users;")
    print("Existing users in DB:", [(u["email"], u["is_active"]) for u in users])

    await conn.close()


if __name__ == "__main__":
    asyncio.run(fix())
