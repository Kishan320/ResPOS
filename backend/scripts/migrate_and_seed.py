#!/usr/bin/env python3
"""Schema create + seed: super admin, CMS, currencies (AED base), RBAC modules."""

import sys
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import inspect, or_, select, text

from app.core.config import settings
from app.core.security import hash_password
from app.database import Base, SessionLocal, engine, ensure_database_exists
import app.models  # noqa: F401
from app.models.user import User, UserRole
from app.models.cms import CmsContent, CareerPost, SocialLink
from app.models.currency import Currency, ExchangeRate
from app.models.rbac import AppModule
from app.services.media_service import ensure_upload_root


def _add_column_if_missing(table: str, column: str, ddl: str) -> None:
    insp = inspect(engine)
    if table not in insp.get_table_names():
        return
    cols = {c["name"] for c in insp.get_columns(table)}
    if column in cols:
        return
    with engine.begin() as conn:
        conn.execute(text(f"ALTER TABLE `{table}` ADD COLUMN {ddl}"))
    print(f"[migrate] Added column {table}.{column}")


def ensure_columns() -> None:
    upgrades = [
        ("orders", "sales_code", "`sales_code` VARCHAR(40) NULL"),
        ("orders", "bill_type", "`bill_type` VARCHAR(40) NOT NULL DEFAULT 'cash'"),
        ("orders", "waiter_id", "`waiter_id` BIGINT NULL"),
        ("orders", "dining_table_id", "`dining_table_id` BIGINT NULL"),
        ("orders", "kot_number", "`kot_number` VARCHAR(40) NULL"),
        ("orders", "kot_printed", "`kot_printed` TINYINT(1) NOT NULL DEFAULT 0"),
        ("orders", "bill_printed", "`bill_printed` TINYINT(1) NOT NULL DEFAULT 0"),
        ("tax_rates", "country_code", "`country_code` VARCHAR(2) NULL"),
        ("tax_rates", "tax_type", "`tax_type` VARCHAR(40) NULL"),
        ("tax_rates", "jurisdiction", "`jurisdiction` VARCHAR(120) NULL"),
        ("tax_rates", "is_compound", "`is_compound` TINYINT(1) NOT NULL DEFAULT 0"),
        ("tax_rates", "is_inclusive", "`is_inclusive` TINYINT(1) NOT NULL DEFAULT 0"),
        ("users", "language", "`language` VARCHAR(5) NULL"),
    ]
    for table, col, ddl in upgrades:
        try:
            _add_column_if_missing(table, col, ddl)
        except Exception as e:
            print(f"[migrate] warn {table}.{col}: {e}")


def normalize_mysql_enums_to_varchar() -> None:
    """
    Convert legacy MySQL ENUM (often stored as NAMES like OPEN/SUPER_ADMIN)
    to VARCHAR values (open/super_admin). ALTER first, then LOWER.
    """
    statements = [
        "ALTER TABLE orders MODIFY COLUMN status VARCHAR(40) NOT NULL",
        "ALTER TABLE orders MODIFY COLUMN order_type VARCHAR(40) NOT NULL",
        "ALTER TABLE orders MODIFY COLUMN bill_type VARCHAR(40) NOT NULL DEFAULT 'cash'",
        "UPDATE orders SET status = LOWER(status)",
        "UPDATE orders SET order_type = LOWER(order_type)",
        "UPDATE orders SET bill_type = LOWER(bill_type)",
        "ALTER TABLE payments MODIFY COLUMN method VARCHAR(40) NOT NULL",
        "ALTER TABLE payments MODIFY COLUMN status VARCHAR(40) NOT NULL",
        "UPDATE payments SET method = LOWER(method)",
        "UPDATE payments SET status = LOWER(status)",
        "ALTER TABLE organizations MODIFY COLUMN business_type VARCHAR(40) NOT NULL",
        "UPDATE organizations SET business_type = LOWER(business_type)",
        "ALTER TABLE users MODIFY COLUMN role VARCHAR(40) NOT NULL",
        "UPDATE users SET role = LOWER(role)",
        "ALTER TABLE stock_movements MODIFY COLUMN movement_type VARCHAR(40) NOT NULL",
        "UPDATE stock_movements SET movement_type = LOWER(movement_type)",
    ]
    for sql in statements:
        try:
            with engine.begin() as conn:
                conn.execute(text(sql))
            print(f"[migrate] ok: {sql[:60]}...")
        except Exception as e:
            msg = str(e).lower()
            if "doesn't exist" in msg or "unknown table" in msg:
                continue
            print(f"[migrate] enum-normalize warn: {e}")


def create_schema() -> None:
    print("[migrate] Ensuring database exists...")
    ensure_database_exists()
    print("[migrate] Creating tables...")
    Base.metadata.create_all(bind=engine)
    ensure_columns()
    normalize_mysql_enums_to_varchar()
    ensure_upload_root()
    print("[migrate] Schema ready.")


def seed_super_admin(db) -> None:
    existing = db.execute(
        select(User).where(
            or_(
                User.email == settings.super_admin_email,
                User.username == settings.super_admin_username,
                User.role == UserRole.SUPER_ADMIN,
            )
        )
    ).scalars().first()
    if existing:
        existing.email = settings.super_admin_email
        existing.username = settings.super_admin_username
        existing.full_name = settings.super_admin_name
        existing.hashed_password = hash_password(settings.super_admin_password)
        existing.role = UserRole.SUPER_ADMIN
        existing.is_active = True
        existing.is_deleted = False
        existing.organization_id = None
        db.add(existing)
        print(f"[seed] Super admin updated: {settings.super_admin_username}")
        return
    db.add(
        User(
            organization_id=None,
            email=settings.super_admin_email,
            username=settings.super_admin_username,
            full_name=settings.super_admin_name,
            hashed_password=hash_password(settings.super_admin_password),
            role=UserRole.SUPER_ADMIN,
            is_active=True,
        )
    )
    print(f"[seed] Super admin created: {settings.super_admin_username}")


MODULES = [
    ("dashboard", "Dashboard", "/app", "layout", 10, False),
    ("pos", "POS Terminal", "/app/pos", "cart", 20, False),
    ("products", "Items / Menu", "/app/products", "package", 30, False),
    ("categories", "Categories", "/app/categories", "tags", 40, False),
    ("inventory", "Inventory", "/app/inventory", "warehouse", 50, False),
    ("orders", "Sales / Orders", "/app/orders", "receipt", 60, False),
    ("invoices", "Invoices", "/app/invoices", "file", 70, False),
    ("reports", "Reports", "/app/reports", "chart", 80, False),
    ("restaurant", "Tables Waiters Tax", "/app/restaurant", "utensils", 90, False),
    ("terminals", "POS Machines", "/app/terminals", "monitor", 100, False),
    ("customers", "Customers", "/app/customers", "users", 110, False),
    ("users", "Team & Roles", "/app/users", "user-cog", 120, False),
    ("settings", "Settings", "/app/settings", "settings", 130, False),
    ("currency", "Multi Currency", "/app/currency", "coins", 140, False),
    ("discounts", "Discounts & Promotions", "/app/dynamic-discount-promotion-coupon-seasonal-and-item-offer-management", "percent", 150, False),
    ("org_staff_rbac", "Staff & Permissions", "/app/organization-owner-admin-staff-user-creation-with-full-rbac-permission", "users", 160, False),
    ("organizations", "Organizations", "/app/organizations", "building", 200, True),
    ("cms", "CMS", "/app/cms", "globe", 210, True),
    ("rbac", "Access Control", "/app/rbac", "shield", 220, True),
    ("platform_users_rbac", "Platform Users RBAC", "/app/super-admin-platform-operations-user-and-full-rbac-management", "shield", 225, True),
    ("platform_reports", "Platform Reports", "/app/reports", "bar-chart", 230, True),
]


def seed_modules(db) -> None:
    for code, name, route, icon, sort, super_only in MODULES:
        row = db.execute(select(AppModule).where(AppModule.code == code)).scalar_one_or_none()
        if not row:
            row = AppModule(code=code)
            db.add(row)
        row.name = name
        row.route_path = route
        row.icon_key = icon
        row.sort_order = sort
        row.super_only = super_only
        row.is_active = True
        row.description = name
    print("[seed] RBAC modules ready")


CURRENCIES = [
    ("AED", "UAE Dirham", "د.إ", True),
    ("USD", "US Dollar", "$", False),
    ("EUR", "Euro", "€", False),
    ("GBP", "British Pound", "£", False),
    ("INR", "Indian Rupee", "₹", False),
    ("SAR", "Saudi Riyal", "﷼", False),
    ("QAR", "Qatari Riyal", "﷼", False),
    ("KWD", "Kuwaiti Dinar", "د.ك", False),
    ("BHD", "Bahraini Dinar", "BD", False),
    ("OMR", "Omani Rial", "ر.ع.", False),
    ("PKR", "Pakistani Rupee", "₨", False),
    ("PHP", "Philippine Peso", "₱", False),
    ("SGD", "Singapore Dollar", "S$", False),
    ("MYR", "Malaysian Ringgit", "RM", False),
    ("CNY", "Chinese Yuan", "¥", False),
]


def seed_currencies(db) -> None:
    today = date.today()
    # approximate sample daily rates vs 1 AED (editable by super admin)
    sample_rates = {
        "USD": "0.27230000",
        "EUR": "0.25000000",
        "GBP": "0.21400000",
        "INR": "22.75000000",
        "SAR": "1.02100000",
        "QAR": "0.99100000",
        "KWD": "0.08350000",
        "BHD": "0.10250000",
        "OMR": "0.10470000",
        "PKR": "75.50000000",
        "PHP": "15.20000000",
        "SGD": "0.36500000",
        "MYR": "1.28000000",
        "CNY": "1.97000000",
    }
    for code, name, symbol, is_base in CURRENCIES:
        row = db.execute(select(Currency).where(Currency.code == code)).scalar_one_or_none()
        if not row:
            row = Currency(code=code)
            db.add(row)
        row.name = name
        row.symbol = symbol
        row.is_base = is_base
        row.is_active = True
        row.decimal_places = 3 if code in ("KWD", "BHD", "OMR") else 2
    for quote, rate in sample_rates.items():
        exists = db.execute(
            select(ExchangeRate).where(
                ExchangeRate.base_code == "AED",
                ExchangeRate.quote_code == quote,
                ExchangeRate.rate_date == today,
            )
        ).scalar_one_or_none()
        if not exists:
            db.add(
                ExchangeRate(
                    base_code="AED",
                    quote_code=quote,
                    rate=Decimal(rate),
                    rate_date=today,
                    source="seed",
                )
            )
    print("[seed] Currencies + daily rates (base AED)")



def seed_cms(db) -> None:
    """Upsert full landing CMS from cms_landing_seed.json (all modules + 30 reports)."""
    import json
    from pathlib import Path
    seed_file = Path(__file__).with_name("cms_landing_seed.json")
    if not seed_file.exists():
        print("[seed] WARNING: cms_landing_seed.json missing")
        return
    sections = json.loads(seed_file.read_text(encoding="utf-8"))
    for data in sections:
        key = data["section_key"]
        row = db.execute(select(CmsContent).where(CmsContent.section_key == key)).scalar_one_or_none()
        if not row:
            row = CmsContent(section_key=key)
            db.add(row)
        for field in (
            "title", "subtitle", "body", "badge_text", "cta_label", "cta_url",
            "image_url", "image_url_2", "image_url_3", "image_url_4",
            "extra_json", "sort_order",
        ):
            if field in data:
                setattr(row, field, data[field])
        row.is_active = True
    if not db.execute(select(CareerPost).limit(1)).scalar_one_or_none():
        db.add(CareerPost(
            title="Senior Product Engineer", slug="senior-product-engineer",
            department="Engineering", location="Dubai / Remote", employment_type="full_time",
            description="Ship multi-tenant POS features used by restaurants and retail chains.",
            requirements="Python, TypeScript, MySQL", apply_email="careers@dineflow.org", is_active=True,
        ))
        db.add(CareerPost(
            title="Customer Success Manager", slug="customer-success-manager",
            department="Success", location="Global", employment_type="full_time",
            description="Help restaurants and retail groups adopt DineFlow.",
            apply_email="careers@dineflow.org", is_active=True,
        ))
    else:
        try:
            db.execute(text("UPDATE career_posts SET description = REPLACE(description, 'Rathin POS', 'DineFlow'), apply_email = REPLACE(apply_email, 'dineflow.local', 'dineflow.org')"))
        except Exception:
            pass
    if not db.execute(select(SocialLink).limit(1)).scalar_one_or_none():
        for i, (p, label, url) in enumerate([
            ("linkedin", "LinkedIn", "https://www.linkedin.com"),
            ("x", "X", "https://x.com"),
            ("instagram", "Instagram", "https://instagram.com"),
            ("youtube", "YouTube", "https://youtube.com"),
        ]):
            db.add(SocialLink(platform=p, label=label, url=url, sort_order=i * 10, is_active=True))
    print(f"[seed] CMS landing sections upserted: {len(sections)}")


def main() -> None:
    print("=" * 60)
    print(" DineFlow - Migration & Seed")
    print("=" * 60)
    create_schema()
    db = SessionLocal()
    try:
        seed_super_admin(db)
        seed_modules(db)
        seed_currencies(db)
        seed_cms(db)
        db.commit()
    finally:
        db.close()
    print(f"[done] Super admin password set from env. Base currency AED.")


if __name__ == "__main__":
    main()
