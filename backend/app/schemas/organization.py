from typing import Any, Dict, Optional

from pydantic import BaseModel, Field

from app.models.organization import BusinessType
from app.schemas.common import ORMModel


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: Optional[str] = None
    business_type: BusinessType = BusinessType.OTHER
    email: Optional[str] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = "AE"
    postal_code: Optional[str] = None
    tax_id: Optional[str] = None
    currency_code: str = "AED"
    timezone: str = "Asia/Dubai"
    settings: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    # Optional first org admin
    admin_email: Optional[str] = None
    admin_password: Optional[str] = None
    admin_name: Optional[str] = None


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    business_type: Optional[BusinessType] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    tax_id: Optional[str] = None
    currency_code: Optional[str] = None
    timezone: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class OrganizationOut(ORMModel):
    id: int
    name: str
    slug: str
    business_type: BusinessType
    email: Optional[str] = None
    phone: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    tax_id: Optional[str] = None
    currency_code: str
    timezone: str
    logo_url: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    is_active: bool
    notes: Optional[str] = None
