import asyncio
import sys
sys.path.insert(0, "C:\\Users\\novaa\\Documents\\New folder\\backend")

from app.database import get_db
from app.models.document import Document
from app.models.patient import Patient
from sqlalchemy import select

async def test():
    async for db in get_db():
        # Get all patients
        stmt = select(Patient)
        result = await db.execute(stmt)
        patients = result.scalars().all()
        print(f"Patients: {len(patients)}")
        for p in patients:
            print(f"  Patient: {p.id}, name: {p.full_name}, mrn: {p.medical_record_no}")
            
            # Get documents for this patient
            docs_stmt = select(Document).where(Document.patient_id == p.id).where(Document.is_deleted == False)
            docs_result = await db.execute(docs_stmt)
            docs = docs_result.scalars().all()
            print(f"    Documents: {len(docs)}")
            for d in docs:
                print(f"      Doc: {d.id}, title: {d.title}, category: {d.category}")
        break

asyncio.run(test())