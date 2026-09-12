from typing import Optional

from pydantic import BaseModel, Field

from app.models.user import UserRole
from app.schemas.common import ORMModel


class UserCreate(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    username: str = Field(min_length=2, max_length=80)
    full_name: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=6)
    phone: Optional[str] = None
    role: UserRole = UserRole.CASHIER
    organization_id: Optional[int] = None
    pin_code: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    pin_code: Optional[str] = None
    password: Optional[str] = None


class UserOut(ORMModel):
    id: int
    email: str
    username: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    organization_id: Optional[int] = None
    is_active: bool
