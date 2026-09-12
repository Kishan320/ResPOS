"""Products / menu items / SKUs - dynamic per tenant."""

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
from app.models.mixins import SoftDeleteMixin, TenantMixin, TimestampMixin


class Product(Base, TimestampMixin, SoftDeleteMixin, TenantMixin):
    __tablename__ = "products"
    __table_args__ = (
        Index("ix_products_org_sku", "organization_id", "sku", unique=True),
        Index("ix_products_org_barcode", "organization_id", "barcode"),
        Index("ix_products_org_name", "organization_id", "name"),
        Index("ix_products_org_active", "organization_id", "is_active"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    category_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    sku: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    barcode: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Selling price
    price: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=0)
    cost_price: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4), nullable=True)
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(6, 3), nullable=False, default=0)  # percent
    unit: Mapped[str] = mapped_column(String(40), default="pcs", nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_track_inventory: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_sold_by_weight: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    low_stock_threshold: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4), nullable=True)
    # Dynamic attributes: spice level, size variants, brand, etc.
    attributes: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, default=dict)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    organization = relationship("Organization", back_populates="products")
    category = relationship("Category", back_populates="products")
    inventory = relationship("InventoryItem", back_populates="product", uselist=False, lazy="joined")
