from decimal import Decimal
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class TerminalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    code: Optional[str] = None
    location: Optional[str] = None
    cash_float: Decimal = Decimal("0")
    printer_name: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class TerminalUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None
    cash_float: Optional[Decimal] = None
    printer_name: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class TerminalOut(ORMModel):
    id: int
    organization_id: int
    name: str
    code: str
    location: Optional[str] = None
    is_active: bool
    cash_float: Decimal
    printer_name: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class CustomerOut(ORMModel):
    id: int
    organization_id: int
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
