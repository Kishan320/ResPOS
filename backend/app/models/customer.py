"""Customers - optional for walk-in or loyalty."""

from typing import Optional

from sqlalchemy import BigInteger, String, Text, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import SoftDeleteMixin, TenantMixin, TimestampMixin


class Customer(Base, TimestampMixin, SoftDeleteMixin, TenantMixin):
    __tablename__ = "customers"
    __table_args__ = (
        Index("ix_customers_org_phone", "organization_id", "phone"),
        Index("ix_customers_org_email", "organization_id", "email"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    loyalty_code: Mapped[Optional[str]] = mapped_column(String(60), nullable=True, index=True)
