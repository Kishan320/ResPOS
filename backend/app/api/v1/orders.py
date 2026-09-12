from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_staff, resolve_organization_id
from app.models.order import Order, OrderStatus
from app.models.user import User
from app.schemas.common import Page
from app.schemas.order import CheckoutRequest, OrderCreate, OrderOut
from app.services.order_service import cancel_order, checkout_order, create_order, print_kot
from app.utils.pagination import page_response, paginate

router = APIRouter()


def _require_org(org_id: Optional[int]) -> int:
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization context required (X-Organization-Id for super admin)",
        )
    return org_id


@router.get("", response_model=Page[OrderOut])
def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    status_filter: Optional[OrderStatus] = Query(None, alias="status"),
    terminal_id: Optional[int] = None,
    q: Optional[str] = None,
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _require_org(org_id)
    stmt = select(Order).where(Order.organization_id == oid)
    if status_filter:
        stmt = stmt.where(Order.status == status_filter)
    if terminal_id:
        stmt = stmt.where(Order.terminal_id == terminal_id)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(
                Order.order_number.ilike(like),
                Order.sales_code.ilike(like),
                Order.table_label.ilike(like),
            )
        )
    stmt = stmt.order_by(Order.id.desc())
    rows, meta = paginate(db, stmt, page, page_size)
    return page_response([OrderOut.model_validate(r) for r in rows], meta)


@router.get("/ongoing", response_model=Page[OrderOut])
def ongoing_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    """PDF: Ongoing tab - draft / open / held orders."""
    oid = _require_org(org_id)
    stmt = (
        select(Order)
        .where(
            Order.organization_id == oid,
            Order.status.in_([OrderStatus.DRAFT, OrderStatus.OPEN, OrderStatus.HELD]),
        )
        .order_by(Order.id.desc())
    )
    rows, meta = paginate(db, stmt, page, page_size)
    return page_response([OrderOut.model_validate(r) for r in rows], meta)


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_new_order(
    payload: OrderCreate,
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _require_org(org_id)
    order = create_order(db, oid, payload, user)
    return OrderOut.model_validate(order)


@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: int,
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _require_org(org_id)
    order = db.get(Order, order_id)
    if not order or order.organization_id != oid:
        raise HTTPException(status_code=404, detail="Order not found")
    return OrderOut.model_validate(order)


@router.post("/{order_id}/checkout", response_model=OrderOut)
def checkout(
    order_id: int,
    payload: CheckoutRequest,
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _require_org(org_id)
    order = db.get(Order, order_id)
    if not order or order.organization_id != oid:
        raise HTTPException(status_code=404, detail="Order not found")
    order = checkout_order(db, order, payload, user)
    return OrderOut.model_validate(order)


@router.post("/{order_id}/hold", response_model=OrderOut)
def hold_order(
    order_id: int,
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _require_org(org_id)
    order = db.get(Order, order_id)
    if not order or order.organization_id != oid:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status not in (OrderStatus.OPEN, OrderStatus.DRAFT):
        raise HTTPException(status_code=400, detail="Only open/draft orders can be held")
    order.status = OrderStatus.HELD
    db.commit()
    db.refresh(order)
    return OrderOut.model_validate(order)


@router.post("/{order_id}/kot", response_model=OrderOut)
def kot_print(
    order_id: int,
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    """PDF: KOT print."""
    oid = _require_org(org_id)
    order = db.get(Order, order_id)
    if not order or order.organization_id != oid:
        raise HTTPException(status_code=404, detail="Order not found")
    order = print_kot(db, order)
    return OrderOut.model_validate(order)


@router.post("/{order_id}/cancel", response_model=OrderOut)
def cancel(
    order_id: int,
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _require_org(org_id)
    order = db.get(Order, order_id)
    if not order or order.organization_id != oid:
        raise HTTPException(status_code=404, detail="Order not found")
    order = cancel_order(db, order)
    return OrderOut.model_validate(order)
