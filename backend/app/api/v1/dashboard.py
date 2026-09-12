"""Dashboard & analytics - indexed aggregates for speed at scale."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_staff, resolve_organization_id
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.inventory import InventoryItem
from app.models.invoice import Invoice
from app.models.payment import Payment, PaymentMethod
from app.models.user import User, UserRole
from app.models.organization import Organization
from app.models.category import Category
from app.models.terminal import Terminal
from app.models.customer import Customer

router = APIRouter()


@router.get("/summary")
def dashboard_summary(
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    if user.role == UserRole.SUPER_ADMIN and not org_id:
        org_count = db.execute(
            select(func.count()).select_from(Organization).where(Organization.is_deleted.is_(False))
        ).scalar_one()
        active_orgs = db.execute(
            select(func.count())
            .select_from(Organization)
            .where(Organization.is_deleted.is_(False), Organization.is_active.is_(True))
        ).scalar_one()
        order_count = db.execute(select(func.count()).select_from(Order)).scalar_one()
        revenue = db.execute(
            select(func.coalesce(func.sum(Order.grand_total), 0)).where(
                Order.status == OrderStatus.COMPLETED
            )
        ).scalar_one()
        users = db.execute(
            select(func.count()).select_from(User).where(User.is_deleted.is_(False))
        ).scalar_one()
        products = db.execute(
            select(func.count()).select_from(Product).where(Product.is_deleted.is_(False))
        ).scalar_one()
        by_type = db.execute(
            select(Organization.business_type, func.count())
            .where(Organization.is_deleted.is_(False))
            .group_by(Organization.business_type)
        ).all()
        recent = db.execute(
            select(Organization).where(Organization.is_deleted.is_(False)).order_by(Organization.id.desc()).limit(8)
        ).scalars().all()
        return {
            "scope": "platform",
            "organizations": org_count,
            "active_organizations": active_orgs,
            "orders_total": order_count,
            "revenue_total": str(revenue),
            "users_total": users,
            "products_total": products,
            "by_business_type": [{"type": str(r[0].value if hasattr(r[0], "value") else r[0]), "count": r[1]} for r in by_type],
            "recent_organizations": [
                {
                    "id": o.id,
                    "name": o.name,
                    "business_type": (
                        o.business_type.value
                        if hasattr(o.business_type, "value")
                        else (str(o.business_type) if o.business_type else None)
                    ),
                    "city": o.city,
                    "is_active": o.is_active,
                }
                for o in recent
            ],
        }

    if not org_id:
        raise HTTPException(status_code=400, detail="Organization context required")

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    sales_today = db.execute(
        select(
            func.count(Order.id),
            func.coalesce(func.sum(Order.grand_total), 0),
        ).where(
            Order.organization_id == org_id,
            Order.status == OrderStatus.COMPLETED,
            Order.created_at >= today_start,
        )
    ).one()

    open_orders = db.execute(
        select(func.count())
        .select_from(Order)
        .where(
            Order.organization_id == org_id,
            Order.status.in_([OrderStatus.OPEN, OrderStatus.HELD]),
        )
    ).scalar_one()

    products = db.execute(
        select(func.count())
        .select_from(Product)
        .where(
            Product.organization_id == org_id,
            Product.is_deleted.is_(False),
            Product.is_active.is_(True),
        )
    ).scalar_one()

    categories = db.execute(
        select(func.count())
        .select_from(Category)
        .where(Category.organization_id == org_id, Category.is_deleted.is_(False))
    ).scalar_one()

    terminals = db.execute(
        select(func.count())
        .select_from(Terminal)
        .where(Terminal.organization_id == org_id, Terminal.is_deleted.is_(False), Terminal.is_active.is_(True))
    ).scalar_one()

    customers = db.execute(
        select(func.count())
        .select_from(Customer)
        .where(Customer.organization_id == org_id, Customer.is_deleted.is_(False))
    ).scalar_one()

    low_stock = db.execute(
        select(func.count())
        .select_from(InventoryItem)
        .join(Product, Product.id == InventoryItem.product_id)
        .where(
            InventoryItem.organization_id == org_id,
            Product.low_stock_threshold.is_not(None),
            InventoryItem.quantity_on_hand <= Product.low_stock_threshold,
        )
    ).scalar_one()

    invoices_today = db.execute(
        select(func.count())
        .select_from(Invoice)
        .where(Invoice.organization_id == org_id, Invoice.created_at >= today_start)
    ).scalar_one()

    week_ago = today_start - timedelta(days=6)
    daily = db.execute(
        select(
            func.date(Order.created_at).label("d"),
            func.coalesce(func.sum(Order.grand_total), 0),
            func.count(Order.id),
        )
        .where(
            Order.organization_id == org_id,
            Order.status == OrderStatus.COMPLETED,
            Order.created_at >= week_ago,
        )
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
    ).all()

    # Payment method mix (last 30 days)
    month_ago = today_start - timedelta(days=30)
    pay_mix = db.execute(
        select(Payment.method, func.coalesce(func.sum(Payment.amount), 0), func.count())
        .where(Payment.organization_id == org_id, Payment.created_at >= month_ago)
        .group_by(Payment.method)
    ).all()

    # Top products
    top_products = db.execute(
        select(
            OrderItem.product_name,
            func.sum(OrderItem.quantity).label("qty"),
            func.sum(OrderItem.line_total).label("revenue"),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .where(
            Order.organization_id == org_id,
            Order.status == OrderStatus.COMPLETED,
            Order.created_at >= month_ago,
        )
        .group_by(OrderItem.product_name)
        .order_by(desc("revenue"))
        .limit(8)
    ).all()

    recent_orders = db.execute(
        select(Order)
        .where(Order.organization_id == org_id)
        .order_by(Order.id.desc())
        .limit(8)
    ).scalars().all()

    return {
        "scope": "organization",
        "organization_id": org_id,
        "orders_today": sales_today[0],
        "revenue_today": str(sales_today[1] or Decimal("0")),
        "open_orders": open_orders,
        "active_products": products,
        "categories": categories,
        "active_terminals": terminals,
        "customers": customers,
        "low_stock_count": low_stock,
        "invoices_today": invoices_today,
        "week": [{"date": str(r[0]), "revenue": str(r[1]), "orders": r[2]} for r in daily],
        "payment_mix": [
            {"method": r[0].value if hasattr(r[0], "value") else str(r[0]), "amount": str(r[1]), "count": r[2]}
            for r in pay_mix
        ],
        "top_products": [
            {"name": r[0], "qty": str(r[1]), "revenue": str(r[2])} for r in top_products
        ],
        "recent_orders": [
            {
                "id": o.id,
                "order_number": o.order_number,
                "status": (o.status.value if hasattr(o.status, "value") else str(o.status)) if o.status else None,
                "grand_total": str(o.grand_total),
                "order_type": (
                    o.order_type.value if hasattr(o.order_type, "value") else str(o.order_type)
                )
                if o.order_type
                else None,
            }
            for o in recent_orders
        ],
    }


@router.get("/reports/sales")
def sales_report(
    days: int = Query(30, ge=1, le=365),
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    if not org_id:
        raise HTTPException(status_code=400, detail="Organization context required")
    start = datetime.now(timezone.utc) - timedelta(days=days)
    rows = db.execute(
        select(
            func.date(Order.created_at).label("d"),
            func.count(Order.id),
            func.coalesce(func.sum(Order.subtotal), 0),
            func.coalesce(func.sum(Order.tax_total), 0),
            func.coalesce(func.sum(Order.discount_total), 0),
            func.coalesce(func.sum(Order.grand_total), 0),
        )
        .where(
            Order.organization_id == org_id,
            Order.status == OrderStatus.COMPLETED,
            Order.created_at >= start,
        )
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
    ).all()
    return {
        "days": days,
        "rows": [
            {
                "date": str(r[0]),
                "orders": r[1],
                "subtotal": str(r[2]),
                "tax": str(r[3]),
                "discount": str(r[4]),
                "revenue": str(r[5]),
            }
            for r in rows
        ],
        "totals": {
            "orders": sum(r[1] for r in rows),
            "revenue": str(sum((r[5] or 0) for r in rows)),
        },
    }
