"""Restaurant module: waiters, dining tables, taxes, settings (PDF coverage)."""

from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.core.deps import get_db, require_org_admin, require_staff, resolve_organization_id
from app.models.dining_table import DiningTable
from app.models.organization import Organization
from app.models.tax import TaxRate
from app.models.user import User
from app.models.waiter import Waiter
from app.schemas.common import ORMModel, Page
from app.utils.pagination import page_response, paginate
from app.utils.slug import unique_suffix

router = APIRouter()


def _org(org_id: Optional[int]) -> int:
    if not org_id:
        raise HTTPException(status_code=400, detail="Organization context required")
    return org_id


# ── Schemas ─────────────────────────────────────────────────


class WaiterIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    code: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool = True


class WaiterOut(ORMModel):
    id: int
    organization_id: int
    name: str
    code: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool


class TableIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    code: Optional[str] = None
    capacity: int = 4
    area: Optional[str] = None
    is_active: bool = True


class TableOut(ORMModel):
    id: int
    organization_id: int
    name: str
    code: Optional[str] = None
    capacity: int
    area: Optional[str] = None
    is_active: bool
    is_occupied: bool


class TaxIn(BaseModel):
    name: str
    code: str
    rate: Decimal = Field(ge=0)
    is_default: bool = False
    is_active: bool = True
    description: Optional[str] = None


class TaxOut(ORMModel):
    id: int
    organization_id: int
    name: str
    code: str
    rate: Decimal
    is_default: bool
    is_active: bool
    description: Optional[str] = None


class RestaurantSettingsIn(BaseModel):
    bill_header: Optional[str] = None
    bill_footer: Optional[str] = None
    show_tax_on_bill: Optional[bool] = None
    enable_kot: Optional[bool] = None
    enable_table_management: Optional[bool] = None
    enable_waiter: Optional[bool] = None
    currency_symbol: Optional[str] = None
    default_order_type: Optional[str] = None
    logo_url: Optional[str] = None
    extra: Optional[dict] = None


# ── Waiters ─────────────────────────────────────────────────


@router.get("/waiters", response_model=Page[WaiterOut])
def list_waiters(
    page: int = 1,
    page_size: int = 100,
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _org(org_id)
    stmt = (
        select(Waiter)
        .where(Waiter.organization_id == oid, Waiter.is_deleted.is_(False))
        .order_by(Waiter.name)
    )
    rows, meta = paginate(db, stmt, page, page_size)
    return page_response([WaiterOut.model_validate(r) for r in rows], meta)


@router.post("/waiters", response_model=WaiterOut, status_code=201)
def create_waiter(
    payload: WaiterIn,
    user: User = Depends(require_org_admin),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _org(org_id)
    w = Waiter(
        organization_id=oid,
        name=payload.name,
        code=payload.code or f"W-{unique_suffix(4).upper()}",
        phone=payload.phone,
        is_active=payload.is_active,
    )
    db.add(w)
    db.commit()
    db.refresh(w)
    return WaiterOut.model_validate(w)


@router.patch("/waiters/{waiter_id}", response_model=WaiterOut)
def update_waiter(
    waiter_id: int,
    payload: WaiterIn,
    user: User = Depends(require_org_admin),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _org(org_id)
    w = db.get(Waiter, waiter_id)
    if not w or w.organization_id != oid or w.is_deleted:
        raise HTTPException(status_code=404, detail="Waiter not found")
    for k, v in payload.model_dump().items():
        setattr(w, k, v)
    db.commit()
    db.refresh(w)
    return WaiterOut.model_validate(w)


# ── Tables ──────────────────────────────────────────────────


@router.get("/tables", response_model=Page[TableOut])
def list_tables(
    page: int = 1,
    page_size: int = 100,
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _org(org_id)
    stmt = (
        select(DiningTable)
        .where(DiningTable.organization_id == oid, DiningTable.is_deleted.is_(False))
        .order_by(DiningTable.name)
    )
    rows, meta = paginate(db, stmt, page, page_size)
    return page_response([TableOut.model_validate(r) for r in rows], meta)


@router.post("/tables", response_model=TableOut, status_code=201)
def create_table(
    payload: TableIn,
    user: User = Depends(require_org_admin),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _org(org_id)
    t = DiningTable(
        organization_id=oid,
        name=payload.name,
        code=payload.code or f"T-{unique_suffix(4).upper()}",
        capacity=payload.capacity,
        area=payload.area,
        is_active=payload.is_active,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return TableOut.model_validate(t)


@router.patch("/tables/{table_id}", response_model=TableOut)
def update_table(
    table_id: int,
    payload: TableIn,
    user: User = Depends(require_org_admin),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _org(org_id)
    t = db.get(DiningTable, table_id)
    if not t or t.organization_id != oid or t.is_deleted:
        raise HTTPException(status_code=404, detail="Table not found")
    for k, v in payload.model_dump().items():
        setattr(t, k, v)
    db.commit()
    db.refresh(t)
    return TableOut.model_validate(t)


# ── Taxes ───────────────────────────────────────────────────


@router.get("/taxes", response_model=Page[TaxOut])
def list_taxes(
    page: int = 1,
    page_size: int = 100,
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _org(org_id)
    stmt = (
        select(TaxRate)
        .where(TaxRate.organization_id == oid, TaxRate.is_deleted.is_(False))
        .order_by(TaxRate.name)
    )
    rows, meta = paginate(db, stmt, page, page_size)
    return page_response([TaxOut.model_validate(r) for r in rows], meta)


@router.post("/taxes", response_model=TaxOut, status_code=201)
def create_tax(
    payload: TaxIn,
    user: User = Depends(require_org_admin),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _org(org_id)
    tax = TaxRate(organization_id=oid, **payload.model_dump())
    db.add(tax)
    db.commit()
    db.refresh(tax)
    return TaxOut.model_validate(tax)


@router.patch("/taxes/{tax_id}", response_model=TaxOut)
def update_tax(
    tax_id: int,
    payload: TaxIn,
    user: User = Depends(require_org_admin),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _org(org_id)
    tax = db.get(TaxRate, tax_id)
    if not tax or tax.organization_id != oid or tax.is_deleted:
        raise HTTPException(status_code=404, detail="Tax not found")
    for k, v in payload.model_dump().items():
        setattr(tax, k, v)
    db.commit()
    db.refresh(tax)
    return TaxOut.model_validate(tax)


# ── Restaurant settings ─────────────────────────────────────


@router.get("/settings")
def get_settings(
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _org(org_id)
    org = db.get(Organization, oid)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    defaults = {
        "bill_header": org.name,
        "bill_footer": "Thank you! Visit again.",
        "show_tax_on_bill": True,
        "enable_kot": True,
        "enable_table_management": True,
        "enable_waiter": True,
        "currency_symbol": org.currency_code or "AED",
        "default_order_type": "dine_in",
        "logo_url": org.logo_url,
    }
    settings = {**defaults, **(org.settings or {})}
    return {"organization_id": oid, "name": org.name, "settings": settings}


@router.patch("/settings")
def update_settings(
    payload: RestaurantSettingsIn,
    user: User = Depends(require_org_admin),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _org(org_id)
    org = db.get(Organization, oid)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    current = dict(org.settings or {})
    data = payload.model_dump(exclude_unset=True)
    extra = data.pop("extra", None) or {}
    current.update({k: v for k, v in data.items() if v is not None})
    if isinstance(extra, dict):
        current.update(extra)
    if payload.logo_url is not None:
        org.logo_url = payload.logo_url
    org.settings = current
    flag_modified(org, "settings")
    db.add(org)
    db.commit()
    db.refresh(org)
    return {"message": "Settings updated", "settings": org.settings or current}
