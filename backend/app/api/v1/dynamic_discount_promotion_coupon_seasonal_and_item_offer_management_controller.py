"""
HTTP controller: dynamic discounts, coupons, seasonal windows, item/category offers,
and super-admin → organization promotional offers.

Endpoint path prefixes are long on purpose for self-documentation.
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_org_admin, require_staff, require_super_admin, resolve_organization_id
from app.models.discount_promotion_coupon_and_seasonal_offer_engine import (
    DiscountPromotionRuleDefinition,
    DiscountPromotionScopeType,
    DiscountPromotionValueType,
)
from app.models.user import User, UserRole
from app.schemas.common import ORMModel
from app.services.discount_promotion_eligibility_and_calculation_service import (
    calculate_cart_discount_amount_for_promotion_rule,
    fetch_active_discount_promotion_rule_for_organization_and_optional_coupon,
)

router = APIRouter()


class DiscountPromotionRuleCreateOrUpdateRequestBody(BaseModel):
    promotion_display_name: str = Field(min_length=1, max_length=200)
    promotion_internal_description: Optional[str] = None
    coupon_code_normalized: Optional[str] = None
    discount_scope_type: DiscountPromotionScopeType
    discount_value_type: DiscountPromotionValueType
    discount_value_amount: Decimal = Field(gt=0)
    applies_to_product_id: Optional[int] = None
    applies_to_category_id: Optional[int] = None
    minimum_order_subtotal_amount: Optional[Decimal] = None
    maximum_discount_cap_amount: Optional[Decimal] = None
    valid_from_utc: Optional[datetime] = None
    valid_until_utc: Optional[datetime] = None
    maximum_total_redemptions_global: Optional[int] = None
    maximum_redemptions_per_customer: Optional[int] = None
    is_stackable_with_other_promotions: bool = False
    is_active: bool = True
    # super admin only
    is_platform_wide_super_admin_offer: bool = False
    target_organization_id: Optional[int] = None


class DiscountPromotionRuleResponseBody(ORMModel):
    id: int
    organization_id: Optional[int] = None
    target_organization_id: Optional[int] = None
    is_platform_wide_super_admin_offer: bool
    promotion_display_name: str
    promotion_internal_description: Optional[str] = None
    coupon_code_normalized: Optional[str] = None
    discount_scope_type: DiscountPromotionScopeType
    discount_value_type: DiscountPromotionValueType
    discount_value_amount: Decimal
    applies_to_product_id: Optional[int] = None
    applies_to_category_id: Optional[int] = None
    minimum_order_subtotal_amount: Optional[Decimal] = None
    maximum_discount_cap_amount: Optional[Decimal] = None
    valid_from_utc: Optional[datetime] = None
    valid_until_utc: Optional[datetime] = None
    maximum_total_redemptions_global: Optional[int] = None
    current_total_redemption_count: int
    is_stackable_with_other_promotions: bool
    is_active: bool


class CartLineForDiscountPreviewRequestBody(BaseModel):
    product_id: int
    quantity: Decimal = Field(gt=0)
    unit_price: Decimal = Field(ge=0)
    category_id: Optional[int] = None


class EvaluateDiscountPromotionForCartRequestBody(BaseModel):
    coupon_code_normalized: Optional[str] = None
    discount_promotion_rule_id: Optional[int] = None
    cart_subtotal: Decimal = Field(ge=0)
    cart_lines: List[CartLineForDiscountPreviewRequestBody] = Field(min_length=1)


def _require_org_context(org_id: Optional[int]) -> int:
    if not org_id:
        raise HTTPException(status_code=400, detail="Organization context required")
    return org_id


@router.get(
    "/list-organization-owned-and-applicable-super-admin-offers",
    response_model=List[DiscountPromotionRuleResponseBody],
)
def list_organization_owned_and_applicable_super_admin_discount_promotion_rules(
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _require_org_context(org_id)
    rows = (
        db.execute(
            select(DiscountPromotionRuleDefinition)
            .where(
                DiscountPromotionRuleDefinition.is_deleted.is_(False),
                or_(
                    DiscountPromotionRuleDefinition.organization_id == oid,
                    DiscountPromotionRuleDefinition.is_platform_wide_super_admin_offer.is_(True),
                ),
            )
            .order_by(DiscountPromotionRuleDefinition.id.desc())
            .limit(500)
        )
        .scalars()
        .all()
    )
    # Filter target org for platform offers
    out = []
    for r in rows:
        if r.is_platform_wide_super_admin_offer and r.target_organization_id not in (None, oid):
            continue
        out.append(DiscountPromotionRuleResponseBody.model_validate(r))
    return out


@router.post(
    "/create-organization-level-discount-promotion-rule",
    response_model=DiscountPromotionRuleResponseBody,
    status_code=201,
)
def create_organization_level_discount_promotion_rule_for_restaurant_admin(
    payload: DiscountPromotionRuleCreateOrUpdateRequestBody,
    user: User = Depends(require_org_admin),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    if user.role == UserRole.SUPER_ADMIN and not org_id and not payload.is_platform_wide_super_admin_offer:
        raise HTTPException(status_code=400, detail="Organization context or platform offer flag required")

    oid = org_id
    is_platform = False
    if user.role == UserRole.SUPER_ADMIN and payload.is_platform_wide_super_admin_offer:
        is_platform = True
        oid = None
    else:
        oid = _require_org_context(org_id)

    code = payload.coupon_code_normalized.strip().upper() if payload.coupon_code_normalized else None
    row = DiscountPromotionRuleDefinition(
        organization_id=oid,
        target_organization_id=payload.target_organization_id if is_platform else None,
        is_platform_wide_super_admin_offer=is_platform,
        promotion_display_name=payload.promotion_display_name,
        promotion_internal_description=payload.promotion_internal_description,
        coupon_code_normalized=code,
        discount_scope_type=payload.discount_scope_type,
        discount_value_type=payload.discount_value_type,
        discount_value_amount=payload.discount_value_amount,
        applies_to_product_id=payload.applies_to_product_id,
        applies_to_category_id=payload.applies_to_category_id,
        minimum_order_subtotal_amount=payload.minimum_order_subtotal_amount,
        maximum_discount_cap_amount=payload.maximum_discount_cap_amount,
        valid_from_utc=payload.valid_from_utc,
        valid_until_utc=payload.valid_until_utc,
        maximum_total_redemptions_global=payload.maximum_total_redemptions_global,
        maximum_redemptions_per_customer=payload.maximum_redemptions_per_customer,
        is_stackable_with_other_promotions=payload.is_stackable_with_other_promotions,
        is_active=payload.is_active,
        created_by_user_id=user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return DiscountPromotionRuleResponseBody.model_validate(row)


@router.post(
    "/super-admin-create-platform-offer-targeted-to-organization",
    response_model=DiscountPromotionRuleResponseBody,
    status_code=201,
)
def super_admin_create_platform_wide_or_organization_targeted_promotional_offer(
    payload: DiscountPromotionRuleCreateOrUpdateRequestBody,
    user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    payload.is_platform_wide_super_admin_offer = True
    # reuse create with super admin
    code = payload.coupon_code_normalized.strip().upper() if payload.coupon_code_normalized else None
    row = DiscountPromotionRuleDefinition(
        organization_id=None,
        target_organization_id=payload.target_organization_id,
        is_platform_wide_super_admin_offer=True,
        promotion_display_name=payload.promotion_display_name,
        promotion_internal_description=payload.promotion_internal_description,
        coupon_code_normalized=code,
        discount_scope_type=payload.discount_scope_type
        or DiscountPromotionScopeType.SUPER_ADMIN_ORGANIZATION_OFFER,
        discount_value_type=payload.discount_value_type,
        discount_value_amount=payload.discount_value_amount,
        applies_to_product_id=payload.applies_to_product_id,
        applies_to_category_id=payload.applies_to_category_id,
        minimum_order_subtotal_amount=payload.minimum_order_subtotal_amount,
        maximum_discount_cap_amount=payload.maximum_discount_cap_amount,
        valid_from_utc=payload.valid_from_utc,
        valid_until_utc=payload.valid_until_utc,
        maximum_total_redemptions_global=payload.maximum_total_redemptions_global,
        maximum_redemptions_per_customer=payload.maximum_redemptions_per_customer,
        is_stackable_with_other_promotions=payload.is_stackable_with_other_promotions,
        is_active=payload.is_active,
        created_by_user_id=user.id,
    )
    # force scope for clarity when super admin offer
    if row.discount_scope_type not in (
        DiscountPromotionScopeType.SUPER_ADMIN_ORGANIZATION_OFFER,
        DiscountPromotionScopeType.COUPON_CODE_REDEEM,
        DiscountPromotionScopeType.SEASONAL_DATE_WINDOW,
        DiscountPromotionScopeType.ORDER_LEVEL_CART_TOTAL,
    ):
        row.discount_scope_type = DiscountPromotionScopeType.SUPER_ADMIN_ORGANIZATION_OFFER
    db.add(row)
    db.commit()
    db.refresh(row)
    return DiscountPromotionRuleResponseBody.model_validate(row)


@router.post("/evaluate-discount-promotion-against-shopping-cart-preview")
def evaluate_discount_promotion_against_shopping_cart_preview(
    payload: EvaluateDiscountPromotionForCartRequestBody,
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _require_org_context(org_id)
    rule = fetch_active_discount_promotion_rule_for_organization_and_optional_coupon(
        db,
        oid,
        coupon_code=payload.coupon_code_normalized,
        rule_id=payload.discount_promotion_rule_id,
    )
    if not rule:
        raise HTTPException(status_code=404, detail="Promotion not found or not valid now")
    lines = [l.model_dump() for l in payload.cart_lines]
    result = calculate_cart_discount_amount_for_promotion_rule(
        db, oid, rule, lines, payload.cart_subtotal
    )
    return result


@router.patch(
    "/update-discount-promotion-rule-by-identifier/{discount_promotion_rule_id}",
    response_model=DiscountPromotionRuleResponseBody,
)
def update_discount_promotion_rule_by_identifier(
    discount_promotion_rule_id: int,
    payload: DiscountPromotionRuleCreateOrUpdateRequestBody,
    user: User = Depends(require_org_admin),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    row = db.get(DiscountPromotionRuleDefinition, discount_promotion_rule_id)
    if not row or row.is_deleted:
        raise HTTPException(status_code=404, detail="Promotion not found")
    if user.role != UserRole.SUPER_ADMIN:
        if row.organization_id != user.organization_id:
            raise HTTPException(status_code=403, detail="Not your organization promotion")
    elif not row.is_platform_wide_super_admin_offer and org_id and row.organization_id != org_id:
        raise HTTPException(status_code=403, detail="Organization mismatch")

    data = payload.model_dump()
    if data.get("coupon_code_normalized"):
        data["coupon_code_normalized"] = data["coupon_code_normalized"].strip().upper()
    # org admins cannot flip platform flag
    if user.role != UserRole.SUPER_ADMIN:
        data.pop("is_platform_wide_super_admin_offer", None)
        data.pop("target_organization_id", None)
    for k, v in data.items():
        if hasattr(row, k):
            setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return DiscountPromotionRuleResponseBody.model_validate(row)
