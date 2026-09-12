from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.models.order import BillType, OrderStatus, OrderType
from app.models.payment import PaymentMethod, PaymentStatus
from app.schemas.common import ORMModel


class OrderItemIn(BaseModel):
    product_id: int
    quantity: Decimal = Field(gt=0)
    unit_price: Optional[Decimal] = None
    discount_amount: Decimal = Field(default=Decimal("0"), ge=0)
    notes: Optional[str] = None


class OrderCreate(BaseModel):
    order_type: OrderType = OrderType.RETAIL
    bill_type: BillType = BillType.CASH
    status: Optional[OrderStatus] = None  # draft | open
    terminal_id: Optional[int] = None
    customer_id: Optional[int] = None
    waiter_id: Optional[int] = None
    dining_table_id: Optional[int] = None
    table_label: Optional[str] = None
    guest_count: Optional[int] = None
    notes: Optional[str] = None
    discount_total: Decimal = Field(default=Decimal("0"), ge=0)
    items: List[OrderItemIn] = Field(min_length=1)


class PaymentIn(BaseModel):
    method: PaymentMethod
    amount: Decimal = Field(gt=0)
    tendered_amount: Optional[Decimal] = None
    reference: Optional[str] = None


class CheckoutRequest(BaseModel):
    payments: List[PaymentIn] = Field(min_length=1)
    print_invoice: bool = True
    bill_type: Optional[BillType] = None
    # Optional promotion redemption (does not replace discount_total already on order)
    applied_discount_promotion_rule_id: Optional[int] = None
    applied_coupon_code_normalized: Optional[str] = None


class OrderItemOut(ORMModel):
    id: int
    product_id: Optional[int] = None
    product_name: str
    sku: Optional[str] = None
    quantity: Decimal
    unit_price: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    line_total: Decimal
    notes: Optional[str] = None


class PaymentOut(ORMModel):
    id: int
    method: PaymentMethod
    status: PaymentStatus
    amount: Decimal
    tendered_amount: Optional[Decimal] = None
    change_amount: Optional[Decimal] = None
    reference: Optional[str] = None


class InvoiceOut(ORMModel):
    id: int
    order_id: int
    invoice_number: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    subtotal: Decimal
    tax_total: Decimal
    discount_total: Decimal
    grand_total: Decimal
    snapshot: Optional[Dict[str, Any]] = None
    printed_count: int


class OrderOut(ORMModel):
    id: int
    organization_id: int
    order_number: str
    sales_code: Optional[str] = None
    status: OrderStatus
    order_type: OrderType
    bill_type: BillType = BillType.CASH
    terminal_id: Optional[int] = None
    customer_id: Optional[int] = None
    cashier_id: Optional[int] = None
    waiter_id: Optional[int] = None
    dining_table_id: Optional[int] = None
    table_label: Optional[str] = None
    guest_count: Optional[int] = None
    kot_number: Optional[str] = None
    kot_printed: bool = False
    bill_printed: bool = False
    subtotal: Decimal
    tax_total: Decimal
    discount_total: Decimal
    grand_total: Decimal
    amount_paid: Decimal
    amount_due: Decimal
    notes: Optional[str] = None
    items: List[OrderItemOut] = []
    payments: List[PaymentOut] = []
    invoice: Optional[InvoiceOut] = None
