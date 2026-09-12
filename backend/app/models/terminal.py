"""POS terminals / machines - cash drawer, printer, etc."""

from decimal import Decimal
from typing import Optional

from sqlalchemy import BigInteger, Boolean, Numeric, String, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.mixins import SoftDeleteMixin, TenantMixin, TimestampMixin


class Terminal(Base, TimestampMixin, SoftDeleteMixin, TenantMixin):
    __tablename__ = "terminals"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    code: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Opening cash float for the terminal
    cash_float: Mapped[Decimal] = mapped_column(Numeric(14, 4), default=0, nullable=False)
    printer_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    config: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, default=dict)

    organization = relationship("Organization", back_populates="terminals")
