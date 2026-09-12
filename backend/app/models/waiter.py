"""Waiters - restaurant floor staff for POS assignment."""

from typing import Optional

from sqlalchemy import BigInteger, Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import SoftDeleteMixin, TenantMixin, TimestampMixin


class Waiter(Base, TimestampMixin, SoftDeleteMixin, TenantMixin):
    __tablename__ = "waiters"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    code: Mapped[Optional[str]] = mapped_column(String(40), nullable=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
