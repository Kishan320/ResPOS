"""
Discount / promotion / coupon / seasonal / item-wise / platform-to-org offers.

Naming is intentionally long so business intent is obvious without reading bodies.
"""

import enum
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Index,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.enum_types import varchar_enum
from app.models.mixins import SoftDeleteMixin, TimestampMixin


class DiscountPromotionScopeType(str, enum.Enum):
    """Where the promotion applies."""

    ORDER_LEVEL_CART_TOTAL = "order_level_cart_total"
    PRODUCT_ITEM_WISE = "product_item_wise"
    CATEGORY_GROUP_WISE = "category_group_wise"
    COUPON_CODE_REDEEM = "coupon_code_redeem"
    SEASONAL_DATE_WINDOW = "seasonal_date_window"
    SUPER_ADMIN_ORGANIZATION_OFFER = "super_admin_organization_offer"


class DiscountPromotionValueType(str, enum.Enum):
    PERCENTAGE_OF_BASE = "percentage_of_base"
    FIXED_AMOUNT_OFF = "fixed_amount_off"


class DiscountPromotionRuleDefinition(Base, TimestampMixin, SoftDeleteMixin):
    """
    Master promotion rule.

    - organization_id set  → owned/managed by that restaurant org admin
    - organization_id null + is_platform_wide_super_admin_offer
        → super admin offer, optionally limited to target_organization_id
    """

    __tablename__ = "discount_promotion_rule_definitions"
    __table_args__ = (
        Index("ix_discount_promo_org_active", "organization_id", "is_active"),
        Index("ix_discount_promo_code", "coupon_code_normalized"),
        Index("ix_discount_promo_valid_window", "valid_from_utc", "valid_until_utc"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)

    # null = platform (super admin) scoped definition
    organization_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True
    )
    # when super admin gives offer to one org
    target_organization_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True, index=True
    )
    is_platform_wide_super_admin_offer: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True
    )

    promotion_display_name: Mapped[str] = mapped_column(String(200), nullable=False)
    promotion_internal_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    coupon_code_normalized: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    discount_scope_type: Mapped[DiscountPromotionScopeType] = mapped_column(
        varchar_enum(DiscountPromotionScopeType, 64),
        nullable=False,
        index=True,
    )
    discount_value_type: Mapped[DiscountPromotionValueType] = mapped_column(
        varchar_enum(DiscountPromotionValueType, 40),
        nullable=False,
    )
    discount_value_amount: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)

    applies_to_product_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    applies_to_category_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)

    minimum_order_subtotal_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4), nullable=True)
    maximum_discount_cap_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4), nullable=True)

    valid_from_utc: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_until_utc: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    maximum_total_redemptions_global: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    maximum_redemptions_per_customer: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    current_total_redemption_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    is_stackable_with_other_promotions: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    created_by_user_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)


class DiscountPromotionRedemptionLedgerEntry(Base, TimestampMixin):
    """Immutable-ish usage log for audit / limits (fast count via rule_id index)."""

    __tablename__ = "discount_promotion_redemption_ledger_entries"
    __table_args__ = (
        Index("ix_discount_redeem_rule_created", "discount_promotion_rule_id", "created_at"),
        Index("ix_discount_redeem_org_created", "organization_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    discount_promotion_rule_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("discount_promotion_rule_definitions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organization_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    order_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    customer_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    redeemed_discount_amount: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    coupon_code_used: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
