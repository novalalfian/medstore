import asyncio
import asyncpg

async def check():
    conn = await asyncpg.connect('postgresql://medstore:medstore_secret@localhost:5432/medstore')
    tables = await conn.fetch("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
    for t in tables:
        print(t['tablename'])
    
    # Check audit_log columns
    cols = await conn.fetch("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'audit_log'")
    for c in cols:
        print(f"  {c['column_name']}: {c['data_type']}")
    
    await conn.close()

asyncio.run(check())