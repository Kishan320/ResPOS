"""Restaurant reports from PDF: cashier, daily sales, detail, item-wise."""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_staff, resolve_organization_id
from app.models.order import BillType, Order, OrderItem, OrderStatus
from app.models.payment import Payment
from app.models.user import User

router = APIRouter()


def _range(date_from: Optional[str], date_to: Optional[str], days: int = 30):
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)
    if date_from:
        start = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
    if date_to:
        end = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
    return start, end


def _org(org_id: Optional[int]) -> int:
    if not org_id:
        raise HTTPException(status_code=400, detail="Organization context required")
    return org_id


@router.get("/cashier")
def cashier_report(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    """PDF: cash / credit / guest bill counts + totals + tax."""
    oid = _org(org_id)
    start, end = _range(date_from, date_to, days)
    base = (
        select(
            Order.bill_type,
            func.count(Order.id),
            func.coalesce(func.sum(Order.grand_total), 0),
            func.coalesce(func.sum(Order.tax_total), 0),
            func.coalesce(func.sum(Order.amount_paid), 0),
        )
        .where(
            Order.organization_id == oid,
            Order.status == OrderStatus.COMPLETED,
            Order.created_at >= start,
            Order.created_at <= end,
        )
        .group_by(Order.bill_type)
    )
    rows = db.execute(base).all()
    by_type = [
        {
            "bill_type": (r[0].value if hasattr(r[0], "value") else str(r[0])),
            "bills": r[1],
            "total_value": str(r[2]),
            "tax_total": str(r[3]),
            "paid_total": str(r[4]),
        }
        for r in rows
    ]
    pay = db.execute(
        select(Payment.method, func.count(), func.coalesce(func.sum(Payment.amount), 0))
        .join(Order, Order.id == Payment.order_id)
        .where(
            Payment.organization_id == oid,
            Order.status == OrderStatus.COMPLETED,
            Payment.created_at >= start,
            Payment.created_at <= end,
        )
        .group_by(Payment.method)
    ).all()
    return {
        "from": start.isoformat(),
        "to": end.isoformat(),
        "by_bill_type": by_type,
        "by_payment_method": [
            {
                "method": r[0].value if hasattr(r[0], "value") else str(r[0]),
                "count": r[1],
                "amount": str(r[2]),
            }
            for r in pay
        ],
        "totals": {
            "bills": sum(x["bills"] for x in by_type),
            "value": str(sum(float(x["total_value"]) for x in by_type)),
            "tax": str(sum(float(x["tax_total"]) for x in by_type)),
        },
    }


@router.get("/daily-sales")
def daily_sales(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    bill_type: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _org(org_id)
    start, end = _range(date_from, date_to, days)
    stmt = select(Order).where(
        Order.organization_id == oid,
        Order.status == OrderStatus.COMPLETED,
        Order.created_at >= start,
        Order.created_at <= end,
    )
    if bill_type:
        stmt = stmt.where(Order.bill_type == bill_type)
    stmt = stmt.order_by(Order.created_at.desc()).limit(500)
    orders = db.execute(stmt).scalars().all()
    return {
        "from": start.isoformat(),
        "to": end.isoformat(),
        "rows": [
            {
                "id": o.id,
                "bill_no": o.order_number,
                "sales_code": o.sales_code or o.order_number,
                "date": o.created_at.isoformat() if o.created_at else None,
                "customer_id": o.customer_id,
                "bill_type": o.bill_type.value if o.bill_type else None,
                "order_type": o.order_type.value if o.order_type else None,
                "bill_amount": str(o.subtotal),
                "tax_amount": str(o.tax_total),
                "discount": str(o.discount_total),
                "grand_total": str(o.grand_total),
                "paid": str(o.amount_paid),
                "balance": str(o.amount_due),
                "status": o.status.value if o.status else None,
            }
            for o in orders
        ],
    }


@router.get("/sales-detailed")
def sales_detailed(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    bill_type: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    """PDF: detailed sales with line items."""
    oid = _org(org_id)
    start, end = _range(date_from, date_to, days)
    stmt = select(Order).where(
        Order.organization_id == oid,
        Order.status == OrderStatus.COMPLETED,
        Order.created_at >= start,
        Order.created_at <= end,
    )
    if bill_type:
        stmt = stmt.where(Order.bill_type == bill_type)
    stmt = stmt.order_by(Order.created_at.desc()).limit(200)
    orders = db.execute(stmt).scalars().all()
    return {
        "from": start.isoformat(),
        "to": end.isoformat(),
        "rows": [
            {
                "id": o.id,
                "bill_no": o.order_number,
                "sales_code": o.sales_code or o.order_number,
                "date": o.created_at.isoformat() if o.created_at else None,
                "bill_type": o.bill_type.value if o.bill_type else None,
                "grand_total": str(o.grand_total),
                "tax_amount": str(o.tax_total),
                "items": [
                    {
                        "name": i.product_name,
                        "qty": str(i.quantity),
                        "price": str(i.unit_price),
                        "tax": str(i.tax_amount),
                        "total": str(i.line_total),
                    }
                    for i in (o.items or [])
                ],
            }
            for o in orders
        ],
    }


@router.get("/item-wise")
def item_wise_sales(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    item_name: Optional[str] = None,
    days: int = Query(30, ge=1, le=365),
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _org(org_id)
    start, end = _range(date_from, date_to, days)
    stmt = (
        select(
            OrderItem.product_name,
            func.sum(OrderItem.quantity),
            func.sum(OrderItem.line_total),
            func.sum(OrderItem.tax_amount),
            func.count(func.distinct(OrderItem.order_id)),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .where(
            Order.organization_id == oid,
            Order.status == OrderStatus.COMPLETED,
            Order.created_at >= start,
            Order.created_at <= end,
        )
        .group_by(OrderItem.product_name)
        .order_by(func.sum(OrderItem.line_total).desc())
    )
    if item_name:
        stmt = stmt.where(OrderItem.product_name.ilike(f"%{item_name}%"))
    rows = db.execute(stmt).all()
    return {
        "from": start.isoformat(),
        "to": end.isoformat(),
        "rows": [
            {
                "item": r[0],
                "quantity": str(r[1]),
                "sales_value": str(r[2]),
                "tax_amount": str(r[3]),
                "bills": r[4],
            }
            for r in rows
        ],
    }


@router.get("/todays-sale")
def todays_sale(
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    """PDF: POS Today’s Sale popup."""
    oid = _org(org_id)
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    rows = db.execute(
        select(
            Order.bill_type,
            func.count(Order.id),
            func.coalesce(func.sum(Order.grand_total), 0),
        )
        .where(
            Order.organization_id == oid,
            Order.status == OrderStatus.COMPLETED,
            Order.created_at >= today,
        )
        .group_by(Order.bill_type)
    ).all()
    open_count = db.execute(
        select(func.count())
        .select_from(Order)
        .where(
            Order.organization_id == oid,
            Order.status.in_([OrderStatus.OPEN, OrderStatus.HELD, OrderStatus.DRAFT]),
        )
    ).scalar_one()
    return {
        "date": today.date().isoformat(),
        "open_orders": open_count,
        "by_bill_type": [
            {
                "bill_type": r[0].value if hasattr(r[0], "value") else str(r[0]),
                "bills": r[1],
                "total": str(r[2]),
            }
            for r in rows
        ],
        "grand_total": str(sum(float(r[2] or 0) for r in rows)),
        "bill_count": sum(r[1] for r in rows),
    }
