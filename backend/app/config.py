from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://medstore:medstore@localhost:5432/medstore"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "change-me-to-a-random-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    MFA_ISSUER: str = "MedStore"

    # ── TrueNAS integration ──
    # Base URL includes the API path, e.g. https://192.168.1.10/api/v2.0
    TRUENAS_API_URL: str = ""
    TRUENAS_API_KEY: str = ""
    TRUENAS_DATASET: str = "medstore/clinical-data"
    TRUENAS_VERIFY_SSL: bool = True
    TRUENAS_TIMEOUT_SECONDS: float = 10.0

    # ── Document storage backend: LOCAL | SMB ──
    STORAGE_BACKEND: str = "LOCAL"

    # Filesystem path (UNC or mapped drive), e.g. \\192.168.1.10\medstore
    # When set, SMB is accessed through the OS (Windows credentials / mapped drive).
    SMB_MOUNT_PATH: str = ""

    # Explicit SMB credentials (used when SMB_MOUNT_PATH is empty).
    SMB_SERVER: str = ""
    SMB_SHARE: str = "medstore"
    SMB_USERNAME: str = ""
    SMB_PASSWORD: str = ""
    SMB_DOMAIN: str = ""
    SMB_PORT: int = 445
    SMB_ENCRYPT: bool = False
    # Optional subfolder inside the share, e.g. clinical-data
    SMB_PATH_PREFIX: str = ""

    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE: int = 104857600  # 100 MB
    ALLOWED_MIME_TYPES: List[str] = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/tiff",
        "image/bmp",
        "image/webp",
        "application/dicom",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


settings = Settings()
