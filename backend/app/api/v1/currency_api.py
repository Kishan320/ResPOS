"""Multi-currency APIs - base AED, daily rates, convert helpers."""

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, desc
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_db, require_staff, require_super_admin
from app.models.currency import Currency, ExchangeRate
from app.models.user import User
from app.schemas.common import ORMModel

router = APIRouter()


class CurrencyOut(ORMModel):
    id: int
    code: str
    name: str
    symbol: str
    decimal_places: int
    is_base: bool
    is_active: bool


class CurrencyIn(BaseModel):
    code: str = Field(min_length=3, max_length=3)
    name: str
    symbol: str = ""
    decimal_places: int = 2
    is_base: bool = False
    is_active: bool = True


class RateIn(BaseModel):
    quote_code: str = Field(min_length=3, max_length=3)
    rate: Decimal = Field(gt=0)
    rate_date: Optional[date] = None
    source: str = "manual"
    base_code: str = "AED"


class RateOut(ORMModel):
    id: int
    base_code: str
    quote_code: str
    rate: Decimal
    rate_date: date
    source: Optional[str] = None


@router.get("/list", response_model=List[CurrencyOut])
def list_currencies(db: Session = Depends(get_db), _: User = Depends(require_staff)):
    rows = db.execute(
        select(Currency).where(Currency.is_active.is_(True)).order_by(Currency.is_base.desc(), Currency.code)
    ).scalars().all()
    return [CurrencyOut.model_validate(r) for r in rows]


@router.get("/base")
def base_currency(db: Session = Depends(get_db)):
    row = db.execute(select(Currency).where(Currency.is_base.is_(True))).scalar_one_or_none()
    code = row.code if row else settings.base_currency
    return {"base": code, "symbol": (row.symbol if row else "د.إ")}


@router.post("/currencies", response_model=CurrencyOut)
def upsert_currency(payload: CurrencyIn, _: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    code = payload.code.upper()
    row = db.execute(select(Currency).where(Currency.code == code)).scalar_one_or_none()
    if not row:
        row = Currency(code=code)
        db.add(row)
    row.name = payload.name
    row.symbol = payload.symbol
    row.decimal_places = payload.decimal_places
    row.is_active = payload.is_active
    if payload.is_base:
        # Only one base
        for c in db.execute(select(Currency)).scalars().all():
            c.is_base = c.code == code
        row.is_base = True
    db.commit()
    db.refresh(row)
    return CurrencyOut.model_validate(row)


@router.get("/rates", response_model=List[RateOut])
def list_rates(
    quote_code: Optional[str] = None,
    on_date: Optional[date] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_staff),
):
    """Latest (or date-specific) rates vs AED - indexed lookup."""
    d = on_date or datetime.now(timezone.utc).date()
    stmt = select(ExchangeRate).where(ExchangeRate.rate_date <= d)
    if quote_code:
        stmt = stmt.where(ExchangeRate.quote_code == quote_code.upper())
    stmt = stmt.order_by(ExchangeRate.quote_code, desc(ExchangeRate.rate_date))
    rows = db.execute(stmt.limit(500)).scalars().all()
    # Keep latest per quote
    seen = set()
    out = []
    for r in rows:
        if r.quote_code in seen:
            continue
        seen.add(r.quote_code)
        out.append(RateOut.model_validate(r))
    return out


@router.post("/rates", response_model=RateOut)
def set_rate(payload: RateIn, _: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    d = payload.rate_date or datetime.now(timezone.utc).date()
    base = (payload.base_code or "AED").upper()
    quote = payload.quote_code.upper()
    row = db.execute(
        select(ExchangeRate).where(
            ExchangeRate.base_code == base,
            ExchangeRate.quote_code == quote,
            ExchangeRate.rate_date == d,
        )
    ).scalar_one_or_none()
    if not row:
        row = ExchangeRate(base_code=base, quote_code=quote, rate_date=d)
        db.add(row)
    row.rate = payload.rate
    row.source = payload.source
    db.commit()
    db.refresh(row)
    return RateOut.model_validate(row)


@router.get("/convert")
def convert(
    amount: Decimal = Query(..., gt=0),
    from_code: str = Query("AED"),
    to_code: str = Query("USD"),
    db: Session = Depends(get_db),
):
    """Convert via AED base: amount_from -> AED -> to."""
    from_code = from_code.upper()
    to_code = to_code.upper()
    if from_code == to_code:
        return {"amount": str(amount), "from": from_code, "to": to_code, "rate": "1"}

    def latest(quote: str) -> Decimal:
        if quote == "AED":
            return Decimal("1")
        r = db.execute(
            select(ExchangeRate)
            .where(ExchangeRate.base_code == "AED", ExchangeRate.quote_code == quote)
            .order_by(desc(ExchangeRate.rate_date))
            .limit(1)
        ).scalar_one_or_none()
        if not r:
            raise HTTPException(status_code=400, detail=f"No rate for {quote}")
        return r.rate

    # rate stored as 1 AED = rate quote
    # from X to AED: amount / rate_from
    # AED to Y: amount_aed * rate_to
    if from_code == "AED":
        rate_to = latest(to_code)
        result = amount * rate_to
        return {"amount": str(result), "from": from_code, "to": to_code, "rate": str(rate_to)}
    if to_code == "AED":
        rate_from = latest(from_code)
        result = amount / rate_from
        return {"amount": str(result), "from": from_code, "to": to_code, "rate": str(rate_from)}
    rate_from = latest(from_code)
    rate_to = latest(to_code)
    aed = amount / rate_from
    result = aed * rate_to
    return {"amount": str(result), "from": from_code, "to": to_code, "via": "AED", "rate_path": f"{rate_from}->{rate_to}"}
