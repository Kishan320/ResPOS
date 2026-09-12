"""Inventory stock levels and movement ledger."""

import enum
from decimal import Decimal
from typing import Optional

from sqlalchemy import BigInteger, ForeignKey, Numeric, String, Text, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enum_types import varchar_enum
from app.models.mixins import TenantMixin, TimestampMixin


class MovementType(str, enum.Enum):
    PURCHASE = "purchase"
    SALE = "sale"
    ADJUSTMENT = "adjustment"
    RETURN = "return"
    TRANSFER = "transfer"
    WASTE = "waste"
    OPENING = "opening"


class InventoryItem(Base, TimestampMixin, TenantMixin):
    __tablename__ = "inventory_items"
    __table_args__ = (
        Index("ix_inventory_org_product", "organization_id", "product_id", unique=True),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    quantity_on_hand: Mapped[Decimal] = mapped_column(Numeric(16, 4), nullable=False, default=0)
    quantity_reserved: Mapped[Decimal] = mapped_column(Numeric(16, 4), nullable=False, default=0)
    reorder_level: Mapped[Optional[Decimal]] = mapped_column(Numeric(16, 4), nullable=True)
    reorder_qty: Mapped[Optional[Decimal]] = mapped_column(Numeric(16, 4), nullable=True)
    warehouse_location: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    product = relationship("Product", back_populates="inventory")


class StockMovement(Base, TimestampMixin, TenantMixin):
    __tablename__ = "stock_movements"
    __table_args__ = (
        Index("ix_stock_mov_org_product_created", "organization_id", "product_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True
    )
    movement_type: Mapped[MovementType] = mapped_column(varchar_enum(MovementType), nullable=False, index=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(16, 4), nullable=False)  # signed delta
    quantity_after: Mapped[Decimal] = mapped_column(Numeric(16, 4), nullable=False)
    reference_type: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)  # order, invoice
    reference_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
