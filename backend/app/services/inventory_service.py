"""Inventory adjustments and stock queries."""

from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.inventory import InventoryItem, MovementType, StockMovement
from app.models.product import Product


def adjust_stock(
    db: Session,
    org_id: int,
    product_id: int,
    quantity_delta: Decimal,
    user_id: int | None,
    notes: str | None = None,
    movement_type: str = "adjustment",
) -> InventoryItem:
    product = db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.organization_id == org_id,
            Product.is_deleted.is_(False),
        )
    ).scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    inv = db.execute(
        select(InventoryItem).where(
            InventoryItem.organization_id == org_id,
            InventoryItem.product_id == product_id,
        )
    ).scalar_one_or_none()
    if not inv:
        inv = InventoryItem(
            organization_id=org_id,
            product_id=product_id,
            quantity_on_hand=Decimal("0"),
        )
        db.add(inv)
        db.flush()

    try:
        mtype = MovementType(movement_type)
    except ValueError:
        mtype = MovementType.ADJUSTMENT

    inv.quantity_on_hand = (inv.quantity_on_hand or Decimal("0")) + quantity_delta
    db.add(
        StockMovement(
            organization_id=org_id,
            product_id=product_id,
            movement_type=mtype,
            quantity=quantity_delta,
            quantity_after=inv.quantity_on_hand,
            reference_type="manual",
            notes=notes,
            created_by=user_id,
        )
    )
    db.commit()
    db.refresh(inv)
    return inv
