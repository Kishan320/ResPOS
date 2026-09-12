"""Fast offset pagination with total count."""

import math
from typing import TypeVar

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from app.schemas.common import Page, PageMeta

T = TypeVar("T")


def paginate(
    db: Session,
    stmt: Select,
    page: int = 1,
    page_size: int = 50,
    max_page_size: int = 200,
) -> tuple[list, PageMeta]:
    page = max(1, page)
    page_size = min(max(1, page_size), max_page_size)

    count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
    total = db.execute(count_stmt).scalar_one()

    rows = db.execute(stmt.offset((page - 1) * page_size).limit(page_size)).scalars().all()
    total_pages = math.ceil(total / page_size) if page_size else 0
    meta = PageMeta(page=page, page_size=page_size, total=total, total_pages=total_pages)
    return list(rows), meta


def page_response(items: list, meta: PageMeta) -> Page:
    return Page(items=items, meta=meta)
