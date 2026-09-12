"""Orders and line items - high-volume table design (restaurant + retail)."""

import enum
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    JSON,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enum_types import varchar_enum
from app.models.mixins import TenantMixin, TimestampMixin


class OrderStatus(str, enum.Enum):
    DRAFT = "draft"
    OPEN = "open"
    HELD = "held"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class OrderType(str, enum.Enum):
    DINE_IN = "dine_in"
    TAKEAWAY = "takeaway"
    DELIVERY = "delivery"
    PICKUP = "pickup"
    RETAIL = "retail"


class BillType(str, enum.Enum):
    """PDF: cash bill / credit bill / guest bill."""
    CASH = "cash"
    CREDIT = "credit"
    GUEST = "guest"


class Order(Base, TimestampMixin, TenantMixin):
    __tablename__ = "orders"
    __table_args__ = (
        Index("ix_orders_org_number", "organization_id", "order_number", unique=True),
        Index("ix_orders_org_status_created", "organization_id", "status", "created_at"),
        Index("ix_orders_org_terminal_created", "organization_id", "terminal_id", "created_at"),
        Index("ix_orders_org_created", "organization_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    order_number: Mapped[str] = mapped_column(String(40), nullable=False)
    sales_code: Mapped[Optional[str]] = mapped_column(String(40), nullable=True, index=True)
    status: Mapped[OrderStatus] = mapped_column(
        varchar_enum(OrderStatus),
        default=OrderStatus.OPEN,
        nullable=False,
        index=True,
    )
    order_type: Mapped[OrderType] = mapped_column(
        varchar_enum(OrderType),
        default=OrderType.RETAIL,
        nullable=False,
    )
    bill_type: Mapped[BillType] = mapped_column(
        varchar_enum(BillType),
        default=BillType.CASH,
        nullable=False,
        index=True,
    )
    terminal_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("terminals.id", ondelete="SET NULL"), nullable=True, index=True
    )
    customer_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    cashier_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    waiter_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    dining_table_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    table_label: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    guest_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    kot_number: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    kot_printed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    bill_printed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=0, nullable=False)
    tax_total: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=0, nullable=False)
    discount_total: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=0, nullable=False)
    grand_total: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=0, nullable=False)
    amount_paid: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=0, nullable=False)
    amount_due: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=0, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    meta: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, default=dict)

    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    payments = relationship("Payment", back_populates="order", lazy="selectin")
    invoice = relationship("Invoice", back_populates="order", uselist=False, lazy="selectin")


class OrderItem(Base, TimestampMixin, TenantMixin):
    __tablename__ = "order_items"
    __table_args__ = (Index("ix_order_items_order", "order_id"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True
    )
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(16, 4), nullable=False, default=1)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(6, 3), default=0, nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=0, nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=0, nullable=False)
    line_total: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    meta: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    order = relationship("Order", back_populates="items")
