from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.config import settings


async def validate_file(file: UploadFile) -> None:
    if file.content_type not in settings.ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"MIME type '{file.content_type}' is not allowed. Allowed: {settings.ALLOWED_MIME_TYPES}",
        )

    # Read content to check size, then seek back
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size {len(content)} exceeds maximum {settings.MAX_FILE_SIZE} bytes",
        )
    await file.seek(0)
