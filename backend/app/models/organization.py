"""Organization (tenant) - restaurant, cafe, grocery, kirana, supermarket, etc."""

import enum
from typing import Optional

from sqlalchemy import BigInteger, Boolean, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enum_types import varchar_enum
from app.models.mixins import SoftDeleteMixin, TimestampMixin


class BusinessType(str, enum.Enum):
    RESTAURANT = "restaurant"
    CAFE = "cafe"
    FAST_FOOD = "fast_food"
    GROCERY = "grocery"
    KIRANA = "kirana"
    SUPERMARKET = "supermarket"
    RETAIL = "retail"
    BAKERY = "bakery"
    OTHER = "other"


class Organization(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False, index=True)
    business_type: Mapped[BusinessType] = mapped_column(
        varchar_enum(BusinessType, 40), default=BusinessType.OTHER, nullable=False, index=True
    )
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    address_line1: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address_line2: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default="AE")
    postal_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    tax_id: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    currency_code: Mapped[str] = mapped_column(String(3), default="AED", nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Dubai", nullable=False)
    logo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    # Fully dynamic per-tenant settings (receipt footer, POS prefs, tax inclusive, etc.)
    settings: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    users = relationship("User", back_populates="organization", lazy="selectin")
    categories = relationship("Category", back_populates="organization", lazy="noload")
    products = relationship("Product", back_populates="organization", lazy="noload")
    terminals = relationship("Terminal", back_populates="organization", lazy="noload")

    def __repr__(self) -> str:
        return f"<Organization id={self.id} name={self.name!r}>"
