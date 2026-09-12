"""Invoices / bills generated from completed orders."""

from decimal import Decimal
from typing import Optional

from sqlalchemy import BigInteger, ForeignKey, Integer, Numeric, String, Text, JSON, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import TenantMixin, TimestampMixin


class Invoice(Base, TimestampMixin, TenantMixin):
    __tablename__ = "invoices"
    __table_args__ = (
        Index("ix_invoices_org_number", "organization_id", "invoice_number", unique=True),
        Index("ix_invoices_org_created", "organization_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    invoice_number: Mapped[str] = mapped_column(String(40), nullable=False)
    customer_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    customer_phone: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    billing_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    tax_total: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    discount_total: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    grand_total: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    # Snapshot of line items + org branding for reprint without joins
    snapshot: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    printed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    order = relationship("Order", back_populates="invoice")
