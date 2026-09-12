"""Order lifecycle: create, price, stock, pay, invoice - optimized for high volume."""

from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.customer import Customer
from app.models.inventory import InventoryItem, MovementType, StockMovement
from app.models.invoice import Invoice
from app.models.order import BillType, Order, OrderItem, OrderStatus
from app.models.organization import Organization
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.product import Product
from app.models.user import User
from app.schemas.order import CheckoutRequest, OrderCreate
from app.utils.slug import generate_invoice_number, generate_order_number, unique_suffix

FOUR = Decimal("0.0001")


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _line_totals(
    qty: Decimal, unit_price: Decimal, tax_rate: Decimal, discount: Decimal
) -> tuple[Decimal, Decimal, Decimal]:
    base = _money(qty * unit_price) - discount
    if base < 0:
        base = Decimal("0")
    tax = _money(base * (tax_rate / Decimal("100")))
    total = base + tax
    return base, tax, total


def create_order(
    db: Session,
    org_id: int,
    payload: OrderCreate,
    cashier: User,
) -> Order:
    product_ids = [i.product_id for i in payload.items]
    products = {
        p.id: p
        for p in db.execute(
            select(Product).where(
                Product.organization_id == org_id,
                Product.id.in_(product_ids),
                Product.is_deleted.is_(False),
                Product.is_active.is_(True),
            )
        )
        .scalars()
        .all()
    }
    if len(products) != len(set(product_ids)):
        missing = set(product_ids) - set(products.keys())
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or inactive products: {sorted(missing)}",
        )

    status_val = payload.status if payload.status in (OrderStatus.DRAFT, OrderStatus.OPEN, OrderStatus.HELD) else OrderStatus.OPEN
    # Prefer per-org daily sequence (scales under concurrent cashiers); fallback to random suffix
    try:
        from app.services.high_scale_daily_sales_fact_rollup_update_service import (
            next_organization_daily_order_sequence_number,
        )

        seq = next_organization_daily_order_sequence_number(db, org_id)
        from datetime import datetime, timezone

        day = datetime.now(timezone.utc).strftime("%y%m%d")
        order_number = f"O{org_id}-{day}-{seq:06d}"
        sales_code = f"S{org_id}-{day}-{seq:06d}"
    except Exception:
        order_number = generate_order_number(org_id)
        sales_code = f"S{org_id}-{unique_suffix(6).upper()}"
    order = Order(
        organization_id=org_id,
        order_number=order_number,
        sales_code=sales_code,
        status=status_val,
        order_type=payload.order_type,
        bill_type=payload.bill_type or BillType.CASH,
        terminal_id=payload.terminal_id,
        customer_id=payload.customer_id,
        cashier_id=cashier.id,
        waiter_id=payload.waiter_id,
        dining_table_id=payload.dining_table_id,
        table_label=payload.table_label,
        guest_count=payload.guest_count,
        notes=payload.notes,
        discount_total=payload.discount_total,
        kot_number=f"KOT-{unique_suffix(5).upper()}",
        kot_printed=False,
        bill_printed=False,
    )

    subtotal = Decimal("0")
    tax_total = Decimal("0")
    items: List[OrderItem] = []

    for line in payload.items:
        product = products[line.product_id]
        unit_price = line.unit_price if line.unit_price is not None else product.price
        base, tax, line_total = _line_totals(
            line.quantity, unit_price, product.tax_rate, line.discount_amount
        )
        items.append(
            OrderItem(
                organization_id=org_id,
                product_id=product.id,
                product_name=product.name,
                sku=product.sku,
                quantity=line.quantity,
                unit_price=unit_price,
                tax_rate=product.tax_rate,
                tax_amount=tax,
                discount_amount=line.discount_amount,
                line_total=line_total,
                notes=line.notes,
            )
        )
        subtotal += base
        tax_total += tax

    # Order-level discount applied after lines (simple model)
    discount = payload.discount_total or Decimal("0")
    grand = subtotal + tax_total - discount
    if grand < 0:
        grand = Decimal("0")

    order.subtotal = _money(subtotal)
    order.tax_total = _money(tax_total)
    order.discount_total = _money(discount)
    order.grand_total = _money(grand)
    order.amount_due = order.grand_total
    order.amount_paid = Decimal("0")
    order.items = items

    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def _deduct_stock(db: Session, order: Order, user_id: Optional[int]) -> None:
    for item in order.items:
        if not item.product_id:
            continue
        product = db.get(Product, item.product_id)
        if not product or not product.is_track_inventory:
            continue
        inv = db.execute(
            select(InventoryItem).where(
                InventoryItem.organization_id == order.organization_id,
                InventoryItem.product_id == item.product_id,
            )
        ).scalar_one_or_none()
        if not inv:
            inv = InventoryItem(
                organization_id=order.organization_id,
                product_id=item.product_id,
                quantity_on_hand=Decimal("0"),
            )
            db.add(inv)
            db.flush()
        inv.quantity_on_hand = (inv.quantity_on_hand or Decimal("0")) - item.quantity
        db.add(
            StockMovement(
                organization_id=order.organization_id,
                product_id=item.product_id,
                movement_type=MovementType.SALE,
                quantity=-item.quantity,
                quantity_after=inv.quantity_on_hand,
                reference_type="order",
                reference_id=order.id,
                notes=f"Sale order {order.order_number}",
                created_by=user_id,
            )
        )


def _build_invoice(db: Session, order: Order) -> Invoice:
    org = db.get(Organization, order.organization_id)
    customer_name = None
    customer_phone = None
    if order.customer_id:
        cust = db.get(Customer, order.customer_id)
        if cust:
            customer_name = cust.name
            customer_phone = cust.phone

    cashier_name = None
    if order.cashier_id:
        cashier = db.get(User, order.cashier_id)
        if cashier:
            cashier_name = cashier.full_name or cashier.username

    served_at = None
    if getattr(order, "updated_at", None):
        served_at = order.updated_at.isoformat()
    elif getattr(order, "created_at", None):
        served_at = order.created_at.isoformat()

    snapshot = {
        "organization": {
            "name": org.name if org else "",
            "phone": org.phone if org else None,
            "email": org.email if org else None,
            "address": org.address_line1 if org else None,
            "address_line2": org.address_line2 if org else None,
            "city": org.city if org else None,
            "state": org.state if org else None,
            "country": org.country if org else None,
            "postal_code": org.postal_code if org else None,
            "tax_id": org.tax_id if org else None,
            "currency": org.currency_code if org else "AED",
            "business_type": (
                org.business_type.value
                if org and getattr(org.business_type, "value", None)
                else (str(org.business_type) if org and org.business_type else None)
            ),
        },
        "order_number": order.order_number,
        "order_type": order.order_type.value if order.order_type else None,
        "table_label": order.table_label,
        "notes": order.notes,
        "cashier_name": cashier_name,
        "served_at": served_at,
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "items": [
            {
                "name": i.product_name,
                "sku": i.sku,
                "qty": str(i.quantity),
                "unit_price": str(i.unit_price),
                "tax": str(i.tax_amount),
                "discount": str(i.discount_amount),
                "total": str(i.line_total),
            }
            for i in order.items
        ],
        "payments": [
            {
                "method": p.method.value,
                "amount": str(p.amount),
                "tendered": str(p.tendered_amount) if p.tendered_amount is not None else None,
                "change": str(p.change_amount) if p.change_amount is not None else None,
            }
            for p in order.payments
        ],
        "subtotal": str(order.subtotal),
        "tax_total": str(order.tax_total),
        "discount_total": str(order.discount_total),
        "grand_total": str(order.grand_total),
    }

    inv_number = generate_invoice_number(order.organization_id)
    snapshot["invoice_number"] = inv_number

    invoice = Invoice(
        organization_id=order.organization_id,
        order_id=order.id,
        invoice_number=inv_number,
        customer_name=customer_name,
        customer_phone=customer_phone,
        subtotal=order.subtotal,
        tax_total=order.tax_total,
        discount_total=order.discount_total,
        grand_total=order.grand_total,
        snapshot=snapshot,
        printed_count=1 if True else 0,
    )
    db.add(invoice)
    return invoice


def checkout_order(
    db: Session,
    order: Order,
    payload: CheckoutRequest,
    user: User,
) -> Order:
    if order.status not in (OrderStatus.OPEN, OrderStatus.HELD, OrderStatus.DRAFT):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot checkout order in status {order.status}",
        )

    if payload.bill_type:
        order.bill_type = payload.bill_type

    paid = Decimal("0")
    for p in payload.payments:
        change = None
        tendered = p.tendered_amount
        if p.method == PaymentMethod.CASH and tendered is not None:
            change = tendered - p.amount
            if change < 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cash tendered is less than payment amount",
                )
        payment = Payment(
            organization_id=order.organization_id,
            order_id=order.id,
            method=p.method,
            status=PaymentStatus.COMPLETED,
            amount=p.amount,
            tendered_amount=tendered,
            change_amount=change,
            reference=p.reference,
            terminal_id=order.terminal_id,
            received_by=user.id,
        )
        db.add(payment)
        paid += p.amount

    order.amount_paid = _money(order.amount_paid + paid)
    order.amount_due = _money(order.grand_total - order.amount_paid)
    if order.amount_due < 0:
        order.amount_due = Decimal("0")

    if order.amount_paid + Decimal("0.01") < order.grand_total:
        # Partial payment - keep open
        order.status = OrderStatus.OPEN
    else:
        order.status = OrderStatus.COMPLETED
        order.bill_printed = bool(payload.print_invoice)
        _deduct_stock(db, order, user.id)
        if payload.print_invoice and not order.invoice:
            inv = _build_invoice(db, order)
            inv.printed_count = 1
        # High-scale daily fact rollup (dashboard O(1) reads)
        try:
            from app.services.high_scale_daily_sales_fact_rollup_update_service import (
                apply_completed_order_to_organization_daily_sales_fact_rollup,
            )

            apply_completed_order_to_organization_daily_sales_fact_rollup(db, order)
        except Exception:
            pass
        # Record promotion redemption if provided (non-breaking optional path)
        if getattr(payload, "applied_discount_promotion_rule_id", None):
            try:
                from app.services.discount_promotion_eligibility_and_calculation_service import (
                    record_discount_promotion_redemption_after_successful_checkout,
                )
                from decimal import Decimal as _D

                record_discount_promotion_redemption_after_successful_checkout(
                    db,
                    int(payload.applied_discount_promotion_rule_id),
                    order.organization_id,
                    order.id,
                    _D(str(order.discount_total or 0)),
                    getattr(payload, "applied_coupon_code_normalized", None),
                    order.customer_id,
                )
            except Exception:
                pass  # never block checkout on promo ledger

    db.commit()
    db.refresh(order)
    return order


def print_kot(db: Session, order: Order) -> Order:
    if order.status == OrderStatus.CANCELLED:
        raise HTTPException(status_code=400, detail="Cannot print KOT for cancelled order")
    if not order.kot_number:
        order.kot_number = f"KOT-{unique_suffix(5).upper()}"
    order.kot_printed = True
    db.commit()
    db.refresh(order)
    return order


def cancel_order(db: Session, order: Order) -> Order:
    if order.status == OrderStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Completed orders cannot be cancelled; use refund flow",
        )
    order.status = OrderStatus.CANCELLED
    order.amount_due = Decimal("0")
    db.commit()
    db.refresh(order)
    return order
