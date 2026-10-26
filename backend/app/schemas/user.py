import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: str = Field(..., max_length=255)
    full_name: str = Field(..., max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    role_names: List[str] = Field(default_factory=list)


class UserLogin(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    mfa_required: bool = False
    mfa_token: Optional[str] = None


class MFASetup(BaseModel):
    secret: str
    provisioning_uri: str


class MFAVerify(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)
    mfa_token: Optional[str] = None


class RoleResponse(BaseModel):
    id: uuid.UUID
    name: str
    permissions: list

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    is_active: bool
    mfa_enabled: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    roles: List[RoleResponse] = []

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    email: Optional[str] = Field(None, max_length=255)
    full_name: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None
    role_names: Optional[List[str]] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    mfa_required: bool = False
    temp_token: Optional[str] = None
    token: Optional[TokenResponse] = None
    user: Optional[UserResponse] = None
    message: Optional[str] = None


class MFAVerifyRequest(BaseModel):
    temp_token: str
    code: str = Field(..., min_length=6, max_length=6)


class MFASetupResponse(BaseModel):
    secret: str
    qr_code_uri: str


class MFAEnableRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6)
