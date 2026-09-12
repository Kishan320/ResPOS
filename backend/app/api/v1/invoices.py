from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_staff, resolve_organization_id
from app.models.invoice import Invoice
from app.models.user import User
from app.schemas.common import Page
from app.schemas.order import InvoiceOut
from app.utils.pagination import page_response, paginate

router = APIRouter()


@router.get("", response_model=Page[InvoiceOut])
def list_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    q: Optional[str] = None,
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    if not org_id:
        raise HTTPException(status_code=400, detail="Organization context required")
    stmt = select(Invoice).where(Invoice.organization_id == org_id)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            (Invoice.invoice_number.ilike(like)) | (Invoice.customer_name.ilike(like))
        )
    stmt = stmt.order_by(Invoice.id.desc())
    rows, meta = paginate(db, stmt, page, page_size)
    return page_response([InvoiceOut.model_validate(r) for r in rows], meta)


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(
    invoice_id: int,
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    if not org_id:
        raise HTTPException(status_code=400, detail="Organization context required")
    inv = db.get(Invoice, invoice_id)
    if not inv or inv.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return InvoiceOut.model_validate(inv)


def _mark_invoice_printed(invoice_id: int, org_id: Optional[int], db: Session) -> InvoiceOut:
    if not org_id:
        raise HTTPException(status_code=400, detail="Organization context required")
    inv = db.get(Invoice, invoice_id)
    if not inv or inv.organization_id != org_id:
        raise HTTPException(status_code=404, detail="Invoice not found")
    inv.printed_count = (inv.printed_count or 0) + 1
    db.commit()
    db.refresh(inv)
    return InvoiceOut.model_validate(inv)


@router.post("/{invoice_id}/print", response_model=InvoiceOut)
def mark_printed(
    invoice_id: int,
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    return _mark_invoice_printed(invoice_id, org_id, db)


@router.get("/{invoice_id}/print", response_model=InvoiceOut)
def mark_printed_get(
    invoice_id: int,
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    """GET alias so print works from simple links as well as POST from the UI."""
    return _mark_invoice_printed(invoice_id, org_id, db)
