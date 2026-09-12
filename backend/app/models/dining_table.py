"""Dining tables for dine-in POS (floor plan / table selection)."""

from typing import Optional

from sqlalchemy import BigInteger, Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import SoftDeleteMixin, TenantMixin, TimestampMixin


class DiningTable(Base, TimestampMixin, SoftDeleteMixin, TenantMixin):
    __tablename__ = "dining_tables"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)  # T1, Table 5
    code: Mapped[Optional[str]] = mapped_column(String(40), nullable=True, index=True)
    capacity: Mapped[int] = mapped_column(Integer, default=4, nullable=False)
    area: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)  # AC Hall, Rooftop
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    is_occupied: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
