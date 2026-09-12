"""Payments - cash, card, UPI, wallet, split tenders."""

import enum
from decimal import Decimal
from typing import Optional

from sqlalchemy import BigInteger, ForeignKey, Numeric, String, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enum_types import varchar_enum
from app.models.mixins import TenantMixin, TimestampMixin


class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CARD = "card"
    UPI = "upi"
    WALLET = "wallet"
    BANK_TRANSFER = "bank_transfer"
    CREDIT = "credit"
    OTHER = "other"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class Payment(Base, TimestampMixin, TenantMixin):
    __tablename__ = "payments"
    __table_args__ = (
        Index("ix_payments_org_order", "organization_id", "order_id"),
        Index("ix_payments_org_created", "organization_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    method: Mapped[PaymentMethod] = mapped_column(varchar_enum(PaymentMethod), nullable=False, index=True)
    status: Mapped[PaymentStatus] = mapped_column(
        varchar_enum(PaymentStatus), default=PaymentStatus.COMPLETED, nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    tendered_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4), nullable=True)
    change_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4), nullable=True)
    reference: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    terminal_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    received_by: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)

    order = relationship("Order", back_populates="payments")
