"""
O(1) upsert into daily sales fact rollups after order completion.
Uses single-row SELECT + UPDATE/INSERT keyed by (organization_id, date).
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.high_scale_organization_daily_sales_facts_and_order_sequences import (
    OrganizationDailySalesFactRollup,
)
from app.models.order import Order, OrderStatus


def _business_date_utc(dt: datetime | None) -> date:
    if dt is None:
        return datetime.now(timezone.utc).date()
    if dt.tzinfo is None:
        return dt.date()
    return dt.astimezone(timezone.utc).date()


def apply_completed_order_to_organization_daily_sales_fact_rollup(db: Session, order: Order) -> None:
    """Increment daily facts for a completed order. Safe to call once per completion."""
    if order.status != OrderStatus.COMPLETED:
        return
    d = _business_date_utc(order.created_at)
    row = db.execute(
        select(OrganizationDailySalesFactRollup).where(
            OrganizationDailySalesFactRollup.organization_id == order.organization_id,
            OrganizationDailySalesFactRollup.business_calendar_date == d,
        )
    ).scalar_one_or_none()
    if not row:
        row = OrganizationDailySalesFactRollup(
            organization_id=order.organization_id,
            business_calendar_date=d,
        )
        db.add(row)
        db.flush()

    items_qty = sum((i.quantity or Decimal("0")) for i in (order.items or []))
    row.completed_orders_count = (row.completed_orders_count or 0) + 1
    row.gross_sales_subtotal_amount = (row.gross_sales_subtotal_amount or 0) + (order.subtotal or 0)
    row.tax_collected_amount = (row.tax_collected_amount or 0) + (order.tax_total or 0)
    row.discount_given_amount = (row.discount_given_amount or 0) + (order.discount_total or 0)
    row.net_grand_total_amount = (row.net_grand_total_amount or 0) + (order.grand_total or 0)
    row.amount_paid_total = (row.amount_paid_total or 0) + (order.amount_paid or 0)
    row.items_sold_quantity_total = (row.items_sold_quantity_total or 0) + items_qty


def next_organization_daily_order_sequence_number(db: Session, organization_id: int) -> int:
    """Issue next sequence for org+today (read-modify-write; fine under row lock per org/day)."""
    from app.models.high_scale_organization_daily_sales_facts_and_order_sequences import (
        OrganizationDailyOrderSequenceCounter,
    )

    d = datetime.now(timezone.utc).date()
    # Avoid FOR UPDATE hangs under some MySQL isolation setups; row is unique per org+day
    row = db.execute(
        select(OrganizationDailyOrderSequenceCounter).where(
            OrganizationDailyOrderSequenceCounter.organization_id == organization_id,
            OrganizationDailyOrderSequenceCounter.business_calendar_date == d,
        )
    ).scalar_one_or_none()
    if not row:
        row = OrganizationDailyOrderSequenceCounter(
            organization_id=organization_id,
            business_calendar_date=d,
            last_issued_sequence_number=0,
        )
        db.add(row)
        db.flush()
    row.last_issued_sequence_number = (row.last_issued_sequence_number or 0) + 1
    return int(row.last_issued_sequence_number)
