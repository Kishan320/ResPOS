"""World multi-currency - base AED, daily rates."""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import BigInteger, Boolean, Date, DateTime, Numeric, String, UniqueConstraint, Index, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import TimestampMixin


class Currency(Base, TimestampMixin):
    __tablename__ = "currencies"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(3), unique=True, nullable=False, index=True)  # AED, USD
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    symbol: Mapped[str] = mapped_column(String(8), nullable=False, default="")
    decimal_places: Mapped[int] = mapped_column(default=2, nullable=False)
    is_base: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)


class ExchangeRate(Base, TimestampMixin):
    """Daily rate: 1 base (AED) = rate * quote currency units? 
    Convention: rate = how many units of `quote_code` for 1 unit of base AED.
    Example: USD rate 0.27 means 1 AED = 0.27 USD.
    """

    __tablename__ = "exchange_rates"
    __table_args__ = (
        UniqueConstraint("base_code", "quote_code", "rate_date", name="uq_fx_base_quote_date"),
        Index("ix_fx_quote_date", "quote_code", "rate_date"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    base_code: Mapped[str] = mapped_column(String(3), nullable=False, default="AED", index=True)
    quote_code: Mapped[str] = mapped_column(String(3), nullable=False, index=True)
    rate: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    rate_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    source: Mapped[Optional[str]] = mapped_column(String(80), nullable=True, default="manual")
