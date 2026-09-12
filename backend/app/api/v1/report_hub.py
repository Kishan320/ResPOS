"""
Deep report catalog (25+) + Excel/PDF download.
Uses indexed aggregates - no N+1, limited scans.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import func, select, desc
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_staff, resolve_organization_id, require_super_admin
from app.models.order import Order, OrderItem, OrderStatus
from app.models.payment import Payment
from app.models.product import Product
from app.models.inventory import InventoryItem
from app.models.invoice import Invoice
from app.models.customer import Customer
from app.models.user import User, UserRole
from app.models.organization import Organization
from app.models.category import Category
from app.services.report_export import rows_to_pdf, rows_to_xlsx

router = APIRouter()

REPORT_CATALOG = [
    {"code": "cashier_summary", "name": "Cashier summary", "scope": "org"},
    {"code": "daily_sales", "name": "Daily sales register", "scope": "org"},
    {"code": "sales_detailed", "name": "Sales detailed (line items)", "scope": "org"},
    {"code": "item_wise_sales", "name": "Item-wise sales", "scope": "org"},
    {"code": "category_wise_sales", "name": "Category-wise sales", "scope": "org"},
    {"code": "payment_mix", "name": "Payment method mix", "scope": "org"},
    {"code": "bill_type_summary", "name": "Bill type (cash/credit/guest)", "scope": "org"},
    {"code": "order_type_summary", "name": "Order type summary", "scope": "org"},
    {"code": "hourly_sales", "name": "Hourly sales heatmap", "scope": "org"},
    {"code": "tax_collected", "name": "Tax collected report", "scope": "org"},
    {"code": "discount_report", "name": "Discounts given", "scope": "org"},
    {"code": "void_cancel", "name": "Cancelled / void orders", "scope": "org"},
    {"code": "open_held", "name": "Open & held orders", "scope": "org"},
    {"code": "invoice_register", "name": "Invoice register", "scope": "org"},
    {"code": "customer_sales", "name": "Customer-wise sales", "scope": "org"},
    {"code": "cashier_performance", "name": "Cashier performance", "scope": "org"},
    {"code": "terminal_sales", "name": "Terminal / POS machine sales", "scope": "org"},
    {"code": "stock_on_hand", "name": "Stock on hand", "scope": "org"},
    {"code": "low_stock", "name": "Low stock alert", "scope": "org"},
    {"code": "product_catalog", "name": "Product catalog export", "scope": "org"},
    {"code": "top_products", "name": "Top products by revenue", "scope": "org"},
    {"code": "slow_products", "name": "Slow / zero movers", "scope": "org"},
    {"code": "margin_proxy", "name": "Margin proxy (price-cost)", "scope": "org"},
    {"code": "sales_by_day", "name": "Sales by calendar day", "scope": "org"},
    {"code": "refunds", "name": "Refunded orders", "scope": "org"},
    # Platform (super admin)
    {"code": "platform_orgs", "name": "All organizations", "scope": "platform"},
    {"code": "platform_revenue", "name": "Platform revenue by org", "scope": "platform"},
    {"code": "platform_orders", "name": "Platform order volume", "scope": "platform"},
    {"code": "platform_users", "name": "Platform users directory", "scope": "platform"},
    {"code": "platform_products_count", "name": "Products count by org", "scope": "platform"},
]


def _range(days: int, date_from: Optional[str], date_to: Optional[str]):
    end = datetime.now(timezone.utc)
    start = end - timedelta(days=days)
    if date_from:
        start = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
    if date_to:
        end = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)
    return start, end


def _org(user: User, org_id: Optional[int], scope: str) -> Optional[int]:
    if scope == "platform":
        if user.role != UserRole.SUPER_ADMIN:
            raise HTTPException(status_code=403, detail="Super admin only")
        return None
    if user.role == UserRole.SUPER_ADMIN:
        if not org_id:
            raise HTTPException(status_code=400, detail="X-Organization-Id required")
        return org_id
    if not user.organization_id:
        raise HTTPException(status_code=400, detail="No organization")
    return user.organization_id


def _build(db: Session, code: str, org_id: Optional[int], start, end) -> tuple[str, list, list]:
    """Return title, headers, rows - optimized queries only."""
    completed = Order.status == OrderStatus.COMPLETED

    if code == "cashier_summary":
        rows = db.execute(
            select(
                Order.bill_type,
                func.count(Order.id),
                func.coalesce(func.sum(Order.grand_total), 0),
                func.coalesce(func.sum(Order.tax_total), 0),
                func.coalesce(func.sum(Order.amount_paid), 0),
            )
            .where(Order.organization_id == org_id, completed, Order.created_at.between(start, end))
            .group_by(Order.bill_type)
        ).all()
        return (
            "Cashier summary",
            ["bill_type", "bills", "grand_total", "tax", "paid"],
            [[getattr(r[0], "value", r[0]), r[1], r[2], r[3], r[4]] for r in rows],
        )

    if code == "daily_sales":
        orders = db.execute(
            select(Order)
            .where(Order.organization_id == org_id, completed, Order.created_at.between(start, end))
            .order_by(desc(Order.id))
            .limit(2000)
        ).scalars().all()
        return (
            "Daily sales",
            ["bill_no", "sales_code", "date", "bill_type", "subtotal", "tax", "discount", "grand", "paid", "due", "status"],
            [
                [
                    o.order_number,
                    o.sales_code,
                    o.created_at,
                    getattr(o.bill_type, "value", o.bill_type),
                    o.subtotal,
                    o.tax_total,
                    o.discount_total,
                    o.grand_total,
                    o.amount_paid,
                    o.amount_due,
                    getattr(o.status, "value", o.status),
                ]
                for o in orders
            ],
        )

    if code == "sales_detailed":
        q = (
            select(
                Order.order_number,
                Order.created_at,
                OrderItem.product_name,
                OrderItem.quantity,
                OrderItem.unit_price,
                OrderItem.tax_amount,
                OrderItem.discount_amount,
                OrderItem.line_total,
            )
            .join(OrderItem, OrderItem.order_id == Order.id)
            .where(Order.organization_id == org_id, completed, Order.created_at.between(start, end))
            .order_by(desc(Order.id))
            .limit(5000)
        )
        rows = db.execute(q).all()
        return (
            "Sales detailed",
            ["bill_no", "date", "item", "qty", "unit_price", "tax", "discount", "line_total"],
            [list(r) for r in rows],
        )

    if code == "item_wise_sales":
        rows = db.execute(
            select(
                OrderItem.product_name,
                func.sum(OrderItem.quantity),
                func.sum(OrderItem.line_total),
                func.sum(OrderItem.tax_amount),
                func.count(func.distinct(Order.id)),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .where(Order.organization_id == org_id, completed, Order.created_at.between(start, end))
            .group_by(OrderItem.product_name)
            .order_by(desc(func.sum(OrderItem.line_total)))
            .limit(1000)
        ).all()
        return (
            "Item-wise sales",
            ["item", "qty", "sales", "tax", "bills"],
            [list(r) for r in rows],
        )

    if code == "category_wise_sales":
        rows = db.execute(
            select(
                func.coalesce(Category.name, "Uncategorized"),
                func.sum(OrderItem.quantity),
                func.sum(OrderItem.line_total),
            )
            .select_from(OrderItem)
            .join(Order, Order.id == OrderItem.order_id)
            .outerjoin(Product, Product.id == OrderItem.product_id)
            .outerjoin(Category, Category.id == Product.category_id)
            .where(Order.organization_id == org_id, completed, Order.created_at.between(start, end))
            .group_by(Category.name)
            .order_by(desc(func.sum(OrderItem.line_total)))
        ).all()
        return ("Category-wise sales", ["category", "qty", "sales"], [list(r) for r in rows])

    if code == "payment_mix":
        rows = db.execute(
            select(Payment.method, func.count(), func.coalesce(func.sum(Payment.amount), 0))
            .where(Payment.organization_id == org_id, Payment.created_at.between(start, end))
            .group_by(Payment.method)
        ).all()
        return (
            "Payment mix",
            ["method", "count", "amount"],
            [[getattr(r[0], "value", r[0]), r[1], r[2]] for r in rows],
        )

    if code == "bill_type_summary":
        rows = db.execute(
            select(Order.bill_type, func.count(), func.coalesce(func.sum(Order.grand_total), 0))
            .where(Order.organization_id == org_id, completed, Order.created_at.between(start, end))
            .group_by(Order.bill_type)
        ).all()
        return (
            "Bill type summary",
            ["bill_type", "bills", "total"],
            [[getattr(r[0], "value", r[0]), r[1], r[2]] for r in rows],
        )

    if code == "order_type_summary":
        rows = db.execute(
            select(Order.order_type, func.count(), func.coalesce(func.sum(Order.grand_total), 0))
            .where(Order.organization_id == org_id, completed, Order.created_at.between(start, end))
            .group_by(Order.order_type)
        ).all()
        return (
            "Order type summary",
            ["order_type", "bills", "total"],
            [[getattr(r[0], "value", r[0]), r[1], r[2]] for r in rows],
        )

    if code == "hourly_sales":
        rows = db.execute(
            select(func.hour(Order.created_at), func.count(), func.coalesce(func.sum(Order.grand_total), 0))
            .where(Order.organization_id == org_id, completed, Order.created_at.between(start, end))
            .group_by(func.hour(Order.created_at))
            .order_by(func.hour(Order.created_at))
        ).all()
        return ("Hourly sales", ["hour", "orders", "revenue"], [list(r) for r in rows])

    if code == "tax_collected":
        rows = db.execute(
            select(func.date(Order.created_at), func.coalesce(func.sum(Order.tax_total), 0), func.count())
            .where(Order.organization_id == org_id, completed, Order.created_at.between(start, end))
            .group_by(func.date(Order.created_at))
            .order_by(func.date(Order.created_at))
        ).all()
        return ("Tax collected", ["date", "tax", "orders"], [list(r) for r in rows])

    if code == "discount_report":
        rows = db.execute(
            select(Order.order_number, Order.created_at, Order.discount_total, Order.grand_total)
            .where(
                Order.organization_id == org_id,
                completed,
                Order.created_at.between(start, end),
                Order.discount_total > 0,
            )
            .order_by(desc(Order.discount_total))
            .limit(2000)
        ).all()
        return ("Discounts", ["bill_no", "date", "discount", "grand"], [list(r) for r in rows])

    if code == "void_cancel":
        rows = db.execute(
            select(Order.order_number, Order.created_at, Order.grand_total, Order.status)
            .where(
                Order.organization_id == org_id,
                Order.status == OrderStatus.CANCELLED,
                Order.created_at.between(start, end),
            )
            .order_by(desc(Order.id))
            .limit(2000)
        ).all()
        return (
            "Cancelled orders",
            ["bill_no", "date", "total", "status"],
            [[r[0], r[1], r[2], getattr(r[3], "value", r[3])] for r in rows],
        )

    if code == "open_held":
        rows = db.execute(
            select(Order.order_number, Order.status, Order.grand_total, Order.table_label, Order.created_at)
            .where(
                Order.organization_id == org_id,
                Order.status.in_([OrderStatus.OPEN, OrderStatus.HELD, OrderStatus.DRAFT]),
            )
            .order_by(desc(Order.id))
            .limit(1000)
        ).all()
        return (
            "Open held draft",
            ["bill_no", "status", "total", "table", "created"],
            [[r[0], getattr(r[1], "value", r[1]), r[2], r[3], r[4]] for r in rows],
        )

    if code == "invoice_register":
        rows = db.execute(
            select(
                Invoice.invoice_number,
                Invoice.created_at,
                Invoice.customer_name,
                Invoice.subtotal,
                Invoice.tax_total,
                Invoice.grand_total,
                Invoice.printed_count,
            )
            .where(Invoice.organization_id == org_id, Invoice.created_at.between(start, end))
            .order_by(desc(Invoice.id))
            .limit(2000)
        ).all()
        return (
            "Invoice register",
            ["invoice", "date", "customer", "subtotal", "tax", "grand", "prints"],
            [list(r) for r in rows],
        )

    if code == "customer_sales":
        rows = db.execute(
            select(
                func.coalesce(Customer.name, "Walk-in"),
                func.count(Order.id),
                func.coalesce(func.sum(Order.grand_total), 0),
            )
            .select_from(Order)
            .outerjoin(Customer, Customer.id == Order.customer_id)
            .where(Order.organization_id == org_id, completed, Order.created_at.between(start, end))
            .group_by(Customer.name)
            .order_by(desc(func.sum(Order.grand_total)))
            .limit(500)
        ).all()
        return ("Customer sales", ["customer", "orders", "revenue"], [list(r) for r in rows])

    if code == "cashier_performance":
        rows = db.execute(
            select(
                Order.cashier_id,
                func.count(Order.id),
                func.coalesce(func.sum(Order.grand_total), 0),
            )
            .where(Order.organization_id == org_id, completed, Order.created_at.between(start, end))
            .group_by(Order.cashier_id)
        ).all()
        return ("Cashier performance", ["cashier_id", "orders", "revenue"], [list(r) for r in rows])

    if code == "terminal_sales":
        rows = db.execute(
            select(
                Order.terminal_id,
                func.count(Order.id),
                func.coalesce(func.sum(Order.grand_total), 0),
            )
            .where(Order.organization_id == org_id, completed, Order.created_at.between(start, end))
            .group_by(Order.terminal_id)
        ).all()
        return ("Terminal sales", ["terminal_id", "orders", "revenue"], [list(r) for r in rows])

    if code == "stock_on_hand":
        rows = db.execute(
            select(Product.name, Product.sku, InventoryItem.quantity_on_hand, Product.unit)
            .join(InventoryItem, InventoryItem.product_id == Product.id)
            .where(Product.organization_id == org_id, Product.is_deleted.is_(False))
            .order_by(Product.name)
            .limit(5000)
        ).all()
        return ("Stock on hand", ["product", "sku", "qty", "unit"], [list(r) for r in rows])

    if code == "low_stock":
        rows = db.execute(
            select(Product.name, InventoryItem.quantity_on_hand, Product.low_stock_threshold, Product.unit)
            .join(InventoryItem, InventoryItem.product_id == Product.id)
            .where(
                Product.organization_id == org_id,
                Product.is_deleted.is_(False),
                Product.low_stock_threshold.is_not(None),
                InventoryItem.quantity_on_hand <= Product.low_stock_threshold,
            )
            .order_by(InventoryItem.quantity_on_hand)
        ).all()
        return ("Low stock", ["product", "on_hand", "threshold", "unit"], [list(r) for r in rows])

    if code == "product_catalog":
        rows = db.execute(
            select(Product.name, Product.sku, Product.barcode, Product.price, Product.tax_rate, Product.is_active)
            .where(Product.organization_id == org_id, Product.is_deleted.is_(False))
            .order_by(Product.name)
            .limit(10000)
        ).all()
        return ("Product catalog", ["name", "sku", "barcode", "price", "tax%", "active"], [list(r) for r in rows])

    if code == "top_products":
        rows = db.execute(
            select(OrderItem.product_name, func.sum(OrderItem.quantity), func.sum(OrderItem.line_total))
            .join(Order, Order.id == OrderItem.order_id)
            .where(Order.organization_id == org_id, completed, Order.created_at.between(start, end))
            .group_by(OrderItem.product_name)
            .order_by(desc(func.sum(OrderItem.line_total)))
            .limit(50)
        ).all()
        return ("Top products", ["item", "qty", "revenue"], [list(r) for r in rows])

    if code == "slow_products":
        # Products with no sales in range
        sold = (
            select(OrderItem.product_id)
            .join(Order, Order.id == OrderItem.order_id)
            .where(
                Order.organization_id == org_id,
                completed,
                Order.created_at.between(start, end),
                OrderItem.product_id.is_not(None),
            )
            .distinct()
            .subquery()
        )
        rows = db.execute(
            select(Product.name, Product.sku, Product.price)
            .where(
                Product.organization_id == org_id,
                Product.is_deleted.is_(False),
                Product.is_active.is_(True),
                Product.id.not_in(select(sold.c.product_id)),
            )
            .order_by(Product.name)
            .limit(2000)
        ).all()
        return ("Slow products", ["name", "sku", "price"], [list(r) for r in rows])

    if code == "margin_proxy":
        rows = db.execute(
            select(
                Product.name,
                Product.price,
                Product.cost_price,
                (Product.price - func.coalesce(Product.cost_price, 0)),
            )
            .where(Product.organization_id == org_id, Product.is_deleted.is_(False))
            .order_by(desc(Product.price - func.coalesce(Product.cost_price, 0)))
            .limit(2000)
        ).all()
        return ("Margin proxy", ["product", "price", "cost", "margin"], [list(r) for r in rows])

    if code == "sales_by_day":
        rows = db.execute(
            select(
                func.date(Order.created_at),
                func.count(Order.id),
                func.coalesce(func.sum(Order.subtotal), 0),
                func.coalesce(func.sum(Order.tax_total), 0),
                func.coalesce(func.sum(Order.grand_total), 0),
            )
            .where(Order.organization_id == org_id, completed, Order.created_at.between(start, end))
            .group_by(func.date(Order.created_at))
            .order_by(func.date(Order.created_at))
        ).all()
        return ("Sales by day", ["date", "orders", "subtotal", "tax", "grand"], [list(r) for r in rows])

    if code == "refunds":
        rows = db.execute(
            select(Order.order_number, Order.created_at, Order.grand_total)
            .where(
                Order.organization_id == org_id,
                Order.status == OrderStatus.REFUNDED,
                Order.created_at.between(start, end),
            )
            .order_by(desc(Order.id))
        ).all()
        return ("Refunds", ["bill_no", "date", "total"], [list(r) for r in rows])

    # Platform
    if code == "platform_orgs":
        rows = db.execute(
            select(
                Organization.id,
                Organization.name,
                Organization.business_type,
                Organization.city,
                Organization.country,
                Organization.currency_code,
                Organization.is_active,
                Organization.created_at,
            )
            .where(Organization.is_deleted.is_(False))
            .order_by(desc(Organization.id))
            .limit(10000)
        ).all()
        return (
            "Organizations",
            ["id", "name", "type", "city", "country", "currency", "active", "created"],
            [[r[0], r[1], getattr(r[2], "value", r[2]), r[3], r[4], r[5], r[6], r[7]] for r in rows],
        )

    if code == "platform_revenue":
        rows = db.execute(
            select(
                Order.organization_id,
                func.count(Order.id),
                func.coalesce(func.sum(Order.grand_total), 0),
            )
            .where(completed, Order.created_at.between(start, end))
            .group_by(Order.organization_id)
            .order_by(desc(func.sum(Order.grand_total)))
        ).all()
        return ("Platform revenue by org", ["org_id", "orders", "revenue"], [list(r) for r in rows])

    if code == "platform_orders":
        rows = db.execute(
            select(func.date(Order.created_at), func.count(), func.coalesce(func.sum(Order.grand_total), 0))
            .where(Order.created_at.between(start, end))
            .group_by(func.date(Order.created_at))
            .order_by(func.date(Order.created_at))
        ).all()
        return ("Platform order volume", ["date", "orders", "revenue"], [list(r) for r in rows])

    if code == "platform_users":
        rows = db.execute(
            select(User.id, User.email, User.username, User.role, User.organization_id, User.is_active, User.created_at)
            .where(User.is_deleted.is_(False))
            .order_by(desc(User.id))
            .limit(10000)
        ).all()
        return (
            "Platform users",
            ["id", "email", "username", "role", "org_id", "active", "created"],
            [[r[0], r[1], r[2], getattr(r[3], "value", r[3]), r[4], r[5], r[6]] for r in rows],
        )

    if code == "platform_products_count":
        rows = db.execute(
            select(Product.organization_id, func.count())
            .where(Product.is_deleted.is_(False))
            .group_by(Product.organization_id)
        ).all()
        return ("Products by org", ["org_id", "products"], [list(r) for r in rows])

    raise HTTPException(status_code=404, detail=f"Unknown report {code}")


@router.get("/catalog")
def catalog(user: User = Depends(require_staff)):
    if user.role == UserRole.SUPER_ADMIN:
        return {"reports": REPORT_CATALOG, "base_currency": "AED"}
    return {"reports": [r for r in REPORT_CATALOG if r["scope"] == "org"], "base_currency": "AED"}


@router.get("/run/{code}")
def run_report(
    code: str,
    days: int = Query(30, ge=1, le=365),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    meta = next((r for r in REPORT_CATALOG if r["code"] == code), None)
    if not meta:
        raise HTTPException(status_code=404, detail="Unknown report")
    oid = _org(user, org_id, meta["scope"])
    start, end = _range(days, date_from, date_to)
    title, headers, rows = _build(db, code, oid, start, end)
    return {
        "code": code,
        "title": title,
        "from": start.isoformat(),
        "to": end.isoformat(),
        "headers": headers,
        "rows": [[("" if c is None else str(c)) for c in r] for r in rows],
        "count": len(rows),
    }


@router.get("/export/{code}")
def export_report(
    code: str,
    fmt: str = Query("xlsx", pattern="^(xlsx|pdf)$"),
    days: int = Query(30, ge=1, le=365),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    meta = next((r for r in REPORT_CATALOG if r["code"] == code), None)
    if not meta:
        raise HTTPException(status_code=404, detail="Unknown report")
    oid = _org(user, org_id, meta["scope"])
    start, end = _range(days, date_from, date_to)
    title, headers, rows = _build(db, code, oid, start, end)
    meta_line = f"{start.date()} → {end.date()} · generated {datetime.now(timezone.utc).isoformat()}"
    if fmt == "pdf":
        data = rows_to_pdf(title, headers, rows, meta_line)
        return Response(
            data,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{code}.pdf"'},
        )
    data = rows_to_xlsx(title, headers, rows)
    return Response(
        data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{code}.xlsx"'},
    )
