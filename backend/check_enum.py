import asyncio
import asyncpg

async def check():
    conn = await asyncpg.connect('postgresql://medstore:medstore_secret@localhost:5432/medstore')
    rows = await conn.fetch("SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'gender_type')")
    print([r['enumlabel'] for r in rows])
    await conn.close()

asyncio.run(check())