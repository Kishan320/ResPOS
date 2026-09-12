from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_org_admin, require_staff, resolve_organization_id
from app.models.category import Category
from app.models.inventory import InventoryItem
from app.models.product import Product
from app.models.user import User, UserRole
from app.schemas.catalog import (
    CategoryCreate,
    CategoryOut,
    CategoryUpdate,
    ProductCreate,
    ProductOut,
    ProductUpdate,
    StockAdjustRequest,
)
from app.schemas.common import Page
from app.services.inventory_service import adjust_stock
from app.utils.pagination import page_response, paginate
from app.utils.slug import slugify, unique_suffix

router = APIRouter()


def _require_org(org_id: Optional[int]) -> int:
    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization context required (X-Organization-Id for super admin)",
        )
    return org_id


# ── Categories ──────────────────────────────────────────────


@router.get("/categories", response_model=Page[CategoryOut])
def list_categories(
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=200),
    q: Optional[str] = None,
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _require_org(org_id)
    stmt = select(Category).where(
        Category.organization_id == oid, Category.is_deleted.is_(False)
    )
    if q:
        stmt = stmt.where(Category.name.ilike(f"%{q}%"))
    stmt = stmt.order_by(Category.sort_order, Category.name)
    rows, meta = paginate(db, stmt, page, page_size)
    return page_response([CategoryOut.model_validate(r) for r in rows], meta)


@router.post("/categories", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    user: User = Depends(require_org_admin),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _require_org(org_id)
    cat = Category(
        organization_id=oid,
        parent_id=payload.parent_id,
        name=payload.name,
        slug=f"{slugify(payload.name)}-{unique_suffix(4)}",
        description=payload.description,
        color=payload.color,
        image_url=payload.image_url,
        sort_order=payload.sort_order,
        is_active=payload.is_active,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return CategoryOut.model_validate(cat)


@router.patch("/categories/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    user: User = Depends(require_org_admin),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _require_org(org_id)
    cat = db.get(Category, category_id)
    if not cat or cat.organization_id != oid or cat.is_deleted:
        raise HTTPException(status_code=404, detail="Category not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(cat, k, v)
    db.commit()
    db.refresh(cat)
    return CategoryOut.model_validate(cat)


# ── Products ────────────────────────────────────────────────


@router.get("/products", response_model=Page[ProductOut])
def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    q: Optional[str] = None,
    category_id: Optional[int] = None,
    barcode: Optional[str] = None,
    is_active: Optional[bool] = None,
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _require_org(org_id)
    stmt = select(Product).where(Product.organization_id == oid, Product.is_deleted.is_(False))
    if is_active is not None:
        stmt = stmt.where(Product.is_active.is_(is_active))
    if category_id:
        stmt = stmt.where(Product.category_id == category_id)
    if barcode:
        stmt = stmt.where(Product.barcode == barcode)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(Product.name.ilike(like), Product.sku.ilike(like), Product.barcode.ilike(like))
        )
    stmt = stmt.order_by(Product.sort_order, Product.name)
    rows, meta = paginate(db, stmt, page, page_size)
    return page_response([ProductOut.model_validate(r) for r in rows], meta)


@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    user: User = Depends(require_org_admin),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _require_org(org_id)
    product = Product(
        organization_id=oid,
        category_id=payload.category_id,
        name=payload.name,
        sku=payload.sku,
        barcode=payload.barcode,
        description=payload.description,
        price=payload.price,
        cost_price=payload.cost_price,
        tax_rate=payload.tax_rate,
        unit=payload.unit,
        image_url=payload.image_url,
        is_active=payload.is_active,
        is_track_inventory=payload.is_track_inventory,
        is_sold_by_weight=payload.is_sold_by_weight,
        low_stock_threshold=payload.low_stock_threshold,
        attributes=payload.attributes or {},
        sort_order=payload.sort_order,
    )
    db.add(product)
    db.flush()

    stock = payload.initial_stock if payload.initial_stock is not None else Decimal("0")
    inv = InventoryItem(
        organization_id=oid,
        product_id=product.id,
        quantity_on_hand=stock,
        reorder_level=payload.low_stock_threshold,
    )
    db.add(inv)
    db.commit()
    db.refresh(product)
    return ProductOut.model_validate(product)


@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(
    product_id: int,
    user: User = Depends(require_staff),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _require_org(org_id)
    product = db.get(Product, product_id)
    if not product or product.organization_id != oid or product.is_deleted:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductOut.model_validate(product)


@router.patch("/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    user: User = Depends(require_org_admin),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _require_org(org_id)
    product = db.get(Product, product_id)
    if not product or product.organization_id != oid or product.is_deleted:
        raise HTTPException(status_code=404, detail="Product not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(product, k, v)
    db.commit()
    db.refresh(product)
    return ProductOut.model_validate(product)


@router.post("/inventory/adjust")
def inventory_adjust(
    payload: StockAdjustRequest,
    user: User = Depends(require_org_admin),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _require_org(org_id)
    inv = adjust_stock(
        db,
        oid,
        payload.product_id,
        payload.quantity_delta,
        user.id,
        payload.notes,
        payload.movement_type,
    )
    return {
        "product_id": inv.product_id,
        "quantity_on_hand": inv.quantity_on_hand,
        "message": "Stock updated",
    }
