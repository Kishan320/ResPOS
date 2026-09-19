from typing import Optional

from pydantic import BaseModel, Field

from app.models.user import UserRole
from app.schemas.common import ORMModel


class LoginRequest(BaseModel):
    """Login with username OR email + password."""
    username: Optional[str] = Field(default=None, min_length=2)
    email: Optional[str] = Field(default=None, min_length=2)
    password: str = Field(min_length=4)

    def identity(self) -> str:
        value = (self.username or self.email or "").strip()
        if not value:
            raise ValueError("username or email is required")
        return value


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(ORMModel):
    id: int
    email: str
    username: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    organization_id: Optional[int] = None
    is_active: bool
    language: Optional[str] = None


class LanguageUpdateRequest(BaseModel):
    """Persist the signed-in user's preferred UI language ('en' | 'de')."""

    language: str = Field(min_length=2, max_length=5)


class LoginResponse(BaseModel):
    tokens: TokenResponse
    user: UserOut


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)
