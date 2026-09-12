"""World tax rates - dynamic per org/country/jurisdiction (not India-only)."""

from decimal import Decimal
from typing import Optional

from sqlalchemy import BigInteger, Boolean, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import SoftDeleteMixin, TenantMixin, TimestampMixin


class TaxRate(Base, TimestampMixin, SoftDeleteMixin, TenantMixin):
    __tablename__ = "tax_rates"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(40), nullable=False)
    rate: Mapped[Decimal] = mapped_column(Numeric(6, 3), nullable=False)  # percent
    # World tax metadata (all optional / dynamic)
    country_code: Mapped[Optional[str]] = mapped_column(String(2), nullable=True, index=True)  # AE, US, IN
    tax_type: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)  # vat, gst, sales_tax, service
    jurisdiction: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)  # state/emirate/city
    is_compound: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_inclusive: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
