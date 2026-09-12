"""
High-scale support tables for multi-tenant POS at extreme volume.

Design goals (100k orgs × high daily order volume):
- Always filter by organization_id first (tenant isolation + partition key).
- Daily rollup facts avoid scanning raw `orders` for dashboards.
- Per-org daily sequences avoid hot global locks on order numbers.

These tables are additive - existing order/invoice flows remain source of truth.
"""

from datetime import date
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Date,
    Index,
    Integer,
    Numeric,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import TimestampMixin


class OrganizationDailyOrderSequenceCounter(Base, TimestampMixin):
    """Atomic per-org per-day counter for order numbering under concurrency."""

    __tablename__ = "organization_daily_order_sequence_counters"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "business_calendar_date",
            name="uq_org_daily_order_sequence_date",
        ),
        Index("ix_org_daily_seq_org_date", "organization_id", "business_calendar_date"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    business_calendar_date: Mapped[date] = mapped_column(Date, nullable=False)
    last_issued_sequence_number: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class OrganizationDailySalesFactRollup(Base, TimestampMixin):
    """
    Pre-aggregated daily sales facts for O(1) dashboard / platform rollups.
    Updated on order completion (idempotent upsert by org+date).
    """

    __tablename__ = "organization_daily_sales_fact_rollups"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "business_calendar_date",
            name="uq_org_daily_sales_fact_date",
        ),
        Index("ix_org_daily_fact_date", "business_calendar_date"),
        Index("ix_org_daily_fact_org_date", "organization_id", "business_calendar_date"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    business_calendar_date: Mapped[date] = mapped_column(Date, nullable=False)

    completed_orders_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cancelled_orders_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    gross_sales_subtotal_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=0)
    tax_collected_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=0)
    discount_given_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=0)
    net_grand_total_amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=0)
    amount_paid_total: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=0)
    items_sold_quantity_total: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=0)
