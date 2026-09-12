from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_org_admin, require_staff, resolve_organization_id
from app.models.customer import Customer
from app.models.terminal import Terminal
from app.models.user import User
from app.schemas.common import Page
from app.schemas.terminal import (
    CustomerCreate,
    CustomerOut,
    TerminalCreate,
    TerminalOut,
    TerminalUpdate,
)
from app.utils.pagination import page_response, paginate
from app.utils.slug import generate_terminal_code

router = APIRouter()


def _require_org(org_id: Optional[int]) -> int:
    if not org_id:
        raise HTTPException(status_code=400, detail="Organization context required")
    return org_id


@router.get("", response_model=Page[TerminalOut])
def list_terminals(
    page: int = 1,
    page_size: int = 50,
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _require_org(org_id)
    stmt = (
        select(Terminal)
        .where(Terminal.organization_id == oid, Terminal.is_deleted.is_(False))
        .order_by(Terminal.name)
    )
    rows, meta = paginate(db, stmt, page, page_size)
    return page_response([TerminalOut.model_validate(r) for r in rows], meta)


@router.post("", response_model=TerminalOut, status_code=status.HTTP_201_CREATED)
def create_terminal(
    payload: TerminalCreate,
    user: User = Depends(require_org_admin),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _require_org(org_id)
    term = Terminal(
        organization_id=oid,
        name=payload.name,
        code=payload.code or generate_terminal_code(),
        location=payload.location,
        cash_float=payload.cash_float,
        printer_name=payload.printer_name,
        config=payload.config or {},
        is_active=True,
    )
    db.add(term)
    db.commit()
    db.refresh(term)
    return TerminalOut.model_validate(term)


@router.patch("/{terminal_id}", response_model=TerminalOut)
def update_terminal(
    terminal_id: int,
    payload: TerminalUpdate,
    user: User = Depends(require_org_admin),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _require_org(org_id)
    term = db.get(Terminal, terminal_id)
    if not term or term.organization_id != oid or term.is_deleted:
        raise HTTPException(status_code=404, detail="Terminal not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(term, k, v)
    db.commit()
    db.refresh(term)
    return TerminalOut.model_validate(term)


@router.get("/customers", response_model=Page[CustomerOut])
def list_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    q: Optional[str] = None,
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _require_org(org_id)
    stmt = select(Customer).where(Customer.organization_id == oid, Customer.is_deleted.is_(False))
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            (Customer.name.ilike(like)) | (Customer.phone.ilike(like)) | (Customer.email.ilike(like))
        )
    stmt = stmt.order_by(Customer.name)
    rows, meta = paginate(db, stmt, page, page_size)
    return page_response([CustomerOut.model_validate(r) for r in rows], meta)


@router.post("/customers", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: CustomerCreate,
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _require_org(org_id)
    cust = Customer(
        organization_id=oid,
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
        notes=payload.notes,
    )
    db.add(cust)
    db.commit()
    db.refresh(cust)
    return CustomerOut.model_validate(cust)
