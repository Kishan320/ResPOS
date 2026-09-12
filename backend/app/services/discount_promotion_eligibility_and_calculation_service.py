"""
Fast discount evaluation: single rule fetch by code / id, O(n) cart lines max once.
No N+1 - products passed in memory or minimal IN query.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.discount_promotion_coupon_and_seasonal_offer_engine import (
    DiscountPromotionRuleDefinition,
    DiscountPromotionScopeType,
    DiscountPromotionValueType,
    DiscountPromotionRedemptionLedgerEntry,
)
from app.models.product import Product


def _money(v: Decimal) -> Decimal:
    return v.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _rule_is_currently_valid(rule: DiscountPromotionRuleDefinition, now: datetime) -> bool:
    if not rule.is_active or rule.is_deleted:
        return False
    if rule.valid_from_utc and now < rule.valid_from_utc:
        return False
    if rule.valid_until_utc and now > rule.valid_until_utc:
        return False
    if (
        rule.maximum_total_redemptions_global is not None
        and rule.current_total_redemption_count >= rule.maximum_total_redemptions_global
    ):
        return False
    return True


def fetch_active_discount_promotion_rule_for_organization_and_optional_coupon(
    db: Session,
    organization_id: int,
    coupon_code: Optional[str] = None,
    rule_id: Optional[int] = None,
) -> Optional[DiscountPromotionRuleDefinition]:
    """Indexed lookup: prefer primary key, else normalized coupon, else none."""
    now = _now()
    if rule_id:
        rule = db.get(DiscountPromotionRuleDefinition, rule_id)
        if not rule or not _rule_is_currently_valid(rule, now):
            return None
        if rule.organization_id not in (None, organization_id) and rule.target_organization_id not in (
            None,
            organization_id,
        ):
            return None
        if rule.is_platform_wide_super_admin_offer and rule.target_organization_id not in (
            None,
            organization_id,
        ):
            return None
        return rule

    if coupon_code:
        code = coupon_code.strip().upper()
        rule = db.execute(
            select(DiscountPromotionRuleDefinition).where(
                DiscountPromotionRuleDefinition.coupon_code_normalized == code,
                DiscountPromotionRuleDefinition.is_deleted.is_(False),
                DiscountPromotionRuleDefinition.is_active.is_(True),
                or_(
                    DiscountPromotionRuleDefinition.organization_id == organization_id,
                    DiscountPromotionRuleDefinition.is_platform_wide_super_admin_offer.is_(True),
                ),
            )
        ).scalar_one_or_none()
        if not rule or not _rule_is_currently_valid(rule, now):
            return None
        if rule.target_organization_id and rule.target_organization_id != organization_id:
            return None
        return rule
    return None


def calculate_cart_discount_amount_for_promotion_rule(
    db: Session,
    organization_id: int,
    rule: DiscountPromotionRuleDefinition,
    cart_lines: list[dict[str, Any]],
    cart_subtotal: Decimal,
) -> dict[str, Any]:
    """
    cart_lines: [{product_id, quantity, unit_price, category_id?}]
    Returns structured discount breakdown.
    """
    if rule.minimum_order_subtotal_amount and cart_subtotal < rule.minimum_order_subtotal_amount:
        raise HTTPException(
            status_code=400,
            detail=f"Minimum order {rule.minimum_order_subtotal_amount} required for this promotion",
        )

    # Fill category_id if missing (one IN query)
    missing = [int(l["product_id"]) for l in cart_lines if l.get("product_id") and "category_id" not in l]
    cat_map: dict[int, Optional[int]] = {}
    if missing:
        for p in db.execute(
            select(Product.id, Product.category_id).where(
                Product.organization_id == organization_id, Product.id.in_(set(missing))
            )
        ).all():
            cat_map[p[0]] = p[1]

    eligible_base = Decimal("0")
    scope = rule.discount_scope_type

    for line in cart_lines:
        pid = int(line["product_id"])
        qty = Decimal(str(line["quantity"]))
        price = Decimal(str(line["unit_price"]))
        line_base = qty * price
        cat_id = line.get("category_id", cat_map.get(pid))

        if scope in (
            DiscountPromotionScopeType.ORDER_LEVEL_CART_TOTAL,
            DiscountPromotionScopeType.COUPON_CODE_REDEEM,
            DiscountPromotionScopeType.SEASONAL_DATE_WINDOW,
            DiscountPromotionScopeType.SUPER_ADMIN_ORGANIZATION_OFFER,
        ):
            eligible_base += line_base
        elif scope == DiscountPromotionScopeType.PRODUCT_ITEM_WISE:
            if rule.applies_to_product_id and pid == rule.applies_to_product_id:
                eligible_base += line_base
        elif scope == DiscountPromotionScopeType.CATEGORY_GROUP_WISE:
            if rule.applies_to_category_id and cat_id == rule.applies_to_category_id:
                eligible_base += line_base

    if eligible_base <= 0:
        raise HTTPException(status_code=400, detail="No cart lines eligible for this promotion")

    if rule.discount_value_type == DiscountPromotionValueType.PERCENTAGE_OF_BASE:
        discount = _money(eligible_base * (rule.discount_value_amount / Decimal("100")))
    else:
        discount = _money(min(rule.discount_value_amount, eligible_base))

    if rule.maximum_discount_cap_amount is not None:
        discount = min(discount, _money(rule.maximum_discount_cap_amount))

    discount = min(discount, _money(cart_subtotal))
    return {
        "discount_promotion_rule_id": rule.id,
        "promotion_display_name": rule.promotion_display_name,
        "coupon_code_normalized": rule.coupon_code_normalized,
        "eligible_base_amount": str(eligible_base),
        "discount_amount": str(discount),
        "discount_scope_type": rule.discount_scope_type.value,
        "discount_value_type": rule.discount_value_type.value,
    }


def record_discount_promotion_redemption_after_successful_checkout(
    db: Session,
    rule_id: int,
    organization_id: int,
    order_id: int,
    discount_amount: Decimal,
    coupon_code: Optional[str],
    customer_id: Optional[int],
) -> None:
    rule = db.get(DiscountPromotionRuleDefinition, rule_id)
    if not rule:
        return
    rule.current_total_redemption_count = (rule.current_total_redemption_count or 0) + 1
    db.add(
        DiscountPromotionRedemptionLedgerEntry(
            discount_promotion_rule_id=rule_id,
            organization_id=organization_id,
            order_id=order_id,
            customer_id=customer_id,
            redeemed_discount_amount=discount_amount,
            coupon_code_used=coupon_code,
        )
    )
