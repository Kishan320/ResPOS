from decimal import Decimal
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    parent_id: Optional[int] = None
    description: Optional[str] = None
    color: Optional[str] = None
    image_url: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[int] = None
    description: Optional[str] = None
    color: Optional[str] = None
    image_url: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class CategoryOut(ORMModel):
    id: int
    organization_id: int
    parent_id: Optional[int] = None
    name: str
    slug: str
    description: Optional[str] = None
    color: Optional[str] = None
    image_url: Optional[str] = None
    sort_order: int
    is_active: bool


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category_id: Optional[int] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    description: Optional[str] = None
    price: Decimal = Field(ge=0)
    cost_price: Optional[Decimal] = None
    tax_rate: Decimal = Field(default=Decimal("0"), ge=0)
    unit: str = "pcs"
    image_url: Optional[str] = None
    is_active: bool = True
    is_track_inventory: bool = True
    is_sold_by_weight: bool = False
    low_stock_threshold: Optional[Decimal] = None
    attributes: Optional[Dict[str, Any]] = None
    initial_stock: Optional[Decimal] = Field(default=None, ge=0)
    sort_order: int = 0


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    sku: Optional[str] = None
    barcode: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    tax_rate: Optional[Decimal] = None
    unit: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None
    is_track_inventory: Optional[bool] = None
    is_sold_by_weight: Optional[bool] = None
    low_stock_threshold: Optional[Decimal] = None
    attributes: Optional[Dict[str, Any]] = None
    sort_order: Optional[int] = None


class InventoryOut(ORMModel):
    id: int
    product_id: int
    quantity_on_hand: Decimal
    quantity_reserved: Decimal
    reorder_level: Optional[Decimal] = None
    warehouse_location: Optional[str] = None


class ProductOut(ORMModel):
    id: int
    organization_id: int
    category_id: Optional[int] = None
    name: str
    sku: Optional[str] = None
    barcode: Optional[str] = None
    description: Optional[str] = None
    price: Decimal
    cost_price: Optional[Decimal] = None
    tax_rate: Decimal
    unit: str
    image_url: Optional[str] = None
    is_active: bool
    is_track_inventory: bool
    is_sold_by_weight: bool
    low_stock_threshold: Optional[Decimal] = None
    attributes: Optional[Dict[str, Any]] = None
    sort_order: int
    inventory: Optional[InventoryOut] = None


class StockAdjustRequest(BaseModel):
    product_id: int
    quantity_delta: Decimal
    notes: Optional[str] = None
    movement_type: str = "adjustment"
