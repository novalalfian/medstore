import asyncio
import sys
sys.path.insert(0, "C:\\Users\\novaa\\Documents\\New folder\\backend")

from app.database import get_db
from app.models.document import Document
from app.models.patient import Patient
from app.models.retention import RetentionPolicy
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

async def test():
    async for db in get_db():
        # Test retention dashboard query
        stmt = (
            select(Document, Patient)
            .join(Patient, Document.patient_id == Patient.id)
            .where(Document.is_deleted == False)
            .where(Document.retention_expires_at.isnot(None))
        )
        result = await db.execute(stmt)
        rows = result.all()
        print(f"Rows with retention: {len(rows)}")
        for doc, patient in rows:
            print(f"  Doc: {doc.id}, expires: {doc.retention_expires_at}, tzinfo: {doc.retention_expires_at.tzinfo if doc.retention_expires_at else None}")
        
        # Test patient timeline query
        patient_id = "93c6e8aa-e078-4c4c-8a46-02f4e77f15d5"
        docs_stmt = (
            select(Document)
            .where(Document.patient_id == patient_id)
            .where(Document.is_deleted == False)
            .order_by(Document.created_at.asc())
        )
        docs_result = await db.execute(docs_stmt)
        documents = docs_result.scalars().all()
        print(f"Documents for patient: {len(documents)}")
        for doc in documents:
            print(f"  Doc: {doc.id}, title: {doc.title}, created: {doc.created_at}, category: {doc.category}")
        break

asyncio.run(test())