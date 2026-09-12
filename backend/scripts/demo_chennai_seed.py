#!/usr/bin/env python3
"""
Demo wipe + seed for customer demos (Chennai).

- Removes existing transactional + org/user data
- Super admin: superadmin@yopmail.com / superadmin@yopmail.com
- Three orgs in Chennai with org admins (email = password)
- ~45 products each with images
- ~40-50 completed orders per day per org for last 30 days (incl. today)
  with order items, payments, invoices

Run on server:
  cd ~/POSProject/pos/backend && source .venv/bin/activate
  python scripts/demo_chennai_seed.py
"""
from __future__ import annotations

import json
import random
import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

# ensure backend root on path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import text

from app.core.security import hash_password
from app.database import SessionLocal, engine

IST = timezone(timedelta(hours=5, minutes=30))
NOW = datetime.now(IST)
DAYS = 30
ORDERS_MIN = 40
ORDERS_MAX = 50

IMAGES = [
    "/landing/hero-restaurant.jpg",
    "/landing/fine-dine.jpg",
    "/landing/restaurant.jpg",
    "/landing/cafe.jpg",
    "/landing/grocery.jpg",
    "/landing/retail.jpg",
    "/landing/pos.jpg",
    "/landing/checkout.jpg",
    "/landing/kot.jpg",
    "/landing/tables.jpg",
    "/landing/hd-1.jpg",
    "/landing/hd-2.jpg",
    "/landing/hd-3.jpg",
    "/landing/hd-4.jpg",
    "/landing/hd-5.jpg",
    "/landing/hd-6.jpg",
    "/landing/hd-7.jpg",
    "/landing/hd-8.jpg",
    "/landing/hd-9.jpg",
    "/landing/hd-10.jpg",
    "/landing/hd-11.jpg",
    "/landing/hd-12.jpg",
    "/landing/hd-13.jpg",
    "/landing/hd-14.jpg",
    "/landing/discounts.jpg",
    "/landing/invoices.jpg",
    "/landing/inventory.jpg",
    "/landing/analytics.jpg",
    "/landing/dashboard.jpg",
    "/landing/reports.jpg",
]

# menus: category -> list of (name, price INR, unit)
BURGER_KING = {
    "Burgers": [
        ("Whopper", 219), ("Whopper Jr", 149), ("Chicken Whopper", 229),
        ("Veg Whopper", 189), ("Crispy Chicken Burger", 169), ("Paneer Royale", 179),
        ("Mutton Burger", 249), ("Double Cheese Burger", 199), ("Fish Burger", 209),
        ("Spicy Bean Burger", 159),
    ],
    "Chicken": [
        ("Chicken Fries 9pc", 119), ("Chicken Fries 15pc", 179),
        ("Hot & Crispy 2pc", 149), ("Hot & Crispy 4pc", 259),
        ("Chicken Nuggets 6pc", 129), ("Chicken Nuggets 9pc", 169),
        ("Peri Peri Wings 4pc", 189), ("Grilled Chicken Wrap", 159),
    ],
    "Sides": [
        ("French Fries Regular", 79), ("French Fries Medium", 99),
        ("French Fries Large", 119), ("Onion Rings", 89),
        ("Cheesy Fries", 129), ("Hash Brown", 69), ("Corn Cup", 59),
    ],
    "Beverages": [
        ("Pepsi Regular", 60), ("Pepsi Medium", 80), ("Pepsi Large", 99),
        ("Mirinda", 60), ("7UP", 60), ("Iced Tea", 70), ("Cold Coffee", 99),
        ("Bottled Water", 30), ("Mango Shake", 110),
    ],
    "Desserts": [
        ("Soft Serve Cone", 49), ("Chocolate Sundae", 79),
        ("Brownie With Ice Cream", 129), ("Apple Pie", 69),
        ("Choco Lava Cake", 99), ("Oreo Shake", 139),
    ],
    "Combos": [
        ("King Meal Veg", 249), ("King Meal Chicken", 299),
        ("Family Bucket", 799), ("Couple Combo", 449),
        ("Kids Meal", 199), ("Office Lunch Box", 219),
    ],
}

MUSHARAF = {
    "Breads": [
        ("White Bread Loaf", 45), ("Brown Bread Loaf", 55), ("Multigrain Loaf", 65),
        ("Pav Pack 6", 30), ("Burger Buns 4", 40), ("Kulcha 4pc", 50),
        ("Croissant Butter", 60), ("Garlic Bread Stick", 45), ("Baguette", 70),
    ],
    "Cakes": [
        ("Black Forest Slice", 90), ("Chocolate Truffle Slice", 100),
        ("Red Velvet Slice", 110), ("Pineapple Cake 500g", 350),
        ("Butterscotch Cake 500g", 380), ("Chocolate Cake 1kg", 650),
        ("Cupcake Vanilla", 45), ("Cupcake Choco", 50), ("Cheesecake Slice", 140),
        ("Fruit Cake", 80),
    ],
    "Cookies & Biscuits": [
        ("Butter Cookies 200g", 120), ("Chocolate Chip Cookies", 140),
        ("Nankhatai 250g", 110), ("Jeera Biscuits", 90),
        ("Almond Cookies", 160), ("Khari Puff Pack", 70),
    ],
    "Savories": [
        ("Veg Puff", 25), ("Egg Puff", 30), ("Chicken Puff", 40),
        ("Samosa", 20), ("Cutlet", 30), ("Veg Roll", 35),
        ("Chicken Roll", 50), ("Sandwich Veg", 60), ("Sandwich Chicken", 80),
        ("Pizza Slice", 70),
    ],
    "Sweets": [
        ("Gulab Jamun 2pc", 40), ("Rasgulla 2pc", 40), ("Mysore Pak", 60),
        ("Laddu Besan", 50), ("Jalebi 100g", 45), ("Milk Cake 100g", 55),
    ],
    "Beverages": [
        ("Filter Coffee", 40), ("Tea", 25), ("Badam Milk", 50),
        ("Fresh Lime Soda", 45), ("Mango Lassi", 60), ("Rose Milk", 50),
        ("Cold Coffee", 70), ("Bottled Water", 20),
    ],
}

GROCERY = {
    "Staples": [
        ("Sona Masoori Rice 5kg", 320), ("Basmati Rice 1kg", 140),
        ("Toor Dal 1kg", 160), ("Urad Dal 1kg", 150), ("Moong Dal 1kg", 145),
        ("Chana Dal 1kg", 120), ("Wheat Atta 5kg", 250), ("Rava 1kg", 60),
        ("Poha 1kg", 70), ("Idli Rice 2kg", 110),
    ],
    "Oils & Ghee": [
        ("Sunflower Oil 1L", 160), ("Groundnut Oil 1L", 210),
        ("Coconut Oil 500ml", 140), ("Ghee 500ml", 320), ("Mustard Oil 1L", 180),
    ],
    "Spices": [
        ("Turmeric Powder 200g", 45), ("Red Chilli Powder 200g", 55),
        ("Coriander Powder 200g", 50), ("Garam Masala 100g", 60),
        ("Sambar Powder 200g", 70), ("Rasam Powder 200g", 70),
        ("Black Pepper 100g", 90), ("Cumin Seeds 100g", 45),
        ("Mustard Seeds 100g", 35), ("Hing 50g", 55),
    ],
    "Dairy": [
        ("Aavin Milk 500ml", 28), ("Curd 400g", 35), ("Paneer 200g", 90),
        ("Butter 100g", 58), ("Cheese Cubes 200g", 120), ("Ghee Packet 200ml", 140),
    ],
    "Snacks": [
        ("Lays Classic 50g", 20), ("Kurkure 50g", 20), ("Good Day Biscuits", 30),
        ("Parle-G Family Pack", 40), ("Haldiram Mixture 200g", 60),
        ("Banana Chips 200g", 70), ("Murukku Pack", 50),
    ],
    "Beverages": [
        ("Tata Tea 250g", 130), ("Bru Coffee 100g", 140), ("Horlicks 500g", 280),
        ("Bournvita 500g", 260), ("Soft Drink 750ml", 40), ("Mineral Water 1L", 20),
        ("Fruit Juice 1L", 110),
    ],
    "Household": [
        ("Dishwash Liquid 500ml", 90), ("Surf Excel 1kg", 140),
        ("Vim Bar 3pk", 45), ("Toilet Cleaner 500ml", 80),
        ("Handwash 250ml", 70), ("Tissue Roll 2pk", 60),
    ],
    "Produce": [
        ("Tomato 1kg", 40), ("Onion 1kg", 35), ("Potato 1kg", 30),
        ("Carrot 500g", 30), ("Beans 500g", 40), ("Banana Dozen", 50),
        ("Apple 1kg", 180), ("Lemon 6pc", 25),
    ],
}

ORGS = [
    {
        "name": "Burger King",
        "slug": "burger-king-chennai",
        "business_type": "fast_food",
        "email": "burgerking@yopmail.com",
        "phone": "+91 44 4001 1001",
        "address": "No. 12, Express Avenue Mall, Royapettah",
        "admin_email": "burgerking@yopmail.com",
        "admin_name": "Burger King Admin",
        "admin_username": "burgerking",
        "menu": BURGER_KING,
        "order_types": ["dine_in", "takeaway", "delivery", "pickup"],
        "tax_rate": Decimal("5.000"),
    },
    {
        "name": "Musharaf Bakers",
        "slug": "musharaf-bakers-chennai",
        "business_type": "bakery",
        "email": "musharafbakers@yopmail.com",
        "phone": "+91 44 4002 2002",
        "address": "45, Usman Road, T. Nagar",
        "admin_email": "musharafbakers@yopmail.com",
        "admin_name": "Musharaf Admin",
        "admin_username": "musharafbakers",
        "menu": MUSHARAF,
        "order_types": ["retail", "takeaway", "pickup"],
        "tax_rate": Decimal("5.000"),
    },
    {
        "name": "Shree Raam Prasad Grocereis",
        "slug": "shree-raam-prasad-grocereis-chennai",
        "business_type": "grocery",
        "email": "shreeraamprasad@yopmail.com",
        "phone": "+91 44 4003 3003",
        "address": "78, Ranganathan Street, T. Nagar",
        "admin_email": "shreeraamprasad@yopmail.com",
        "admin_name": "Shree Raam Admin",
        "admin_username": "shreeraamprasad",
        "menu": GROCERY,
        "order_types": ["retail", "delivery", "pickup"],
        "tax_rate": Decimal("0.000"),
    },
]

TRUNCATE_TABLES = [
    "payments",
    "order_items",
    "invoices",
    "stock_movements",
    "inventory_items",
    "orders",
    "products",
    "categories",
    "terminals",
    "customers",
    "dining_tables",
    "waiters",
    "tax_rates",
    "discount_promotion_redemption_ledger_entries",
    "discount_promotion_rule_definitions",
    "org_module_access",
    "user_module_access",
    "organization_daily_order_sequence_counters",
    "organization_daily_sales_fact_rollups",
    "audit_logs",
    "contact_submissions",
    "users",
    "organizations",
]


def money(x) -> Decimal:
    return Decimal(str(x)).quantize(Decimal("0.0001"))


def wipe(conn):
    conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))
    for t in TRUNCATE_TABLES:
        try:
            conn.execute(text(f"TRUNCATE TABLE `{t}`"))
            print(f"  truncated {t}")
        except Exception as e:
            print(f"  skip {t}: {e}")
    conn.execute(text("SET FOREIGN_KEY_CHECKS=1"))


def seed():
    random.seed(20260807)
    db = SessionLocal()
    try:
        print("=== WIPE ===")
        wipe(db.connection())
        db.commit()

        print("=== SUPER ADMIN ===")
        sa_email = "superadmin@yopmail.com"
        sa_pass = "superadmin@yopmail.com"
        sa_hash = hash_password(sa_pass)
        db.execute(
            text(
                """
                INSERT INTO users
                (organization_id, email, username, full_name, hashed_password, phone, role,
                 is_active, pin_code, is_deleted, created_at, updated_at)
                VALUES
                (NULL, :email, 'superadmin', 'Super Admin', :hp, '+91 98765 00000', 'super_admin',
                 1, '0000', 0, :now, :now)
                """
            ),
            {"email": sa_email, "hp": sa_hash, "now": NOW.astimezone(timezone.utc)},
        )
        db.commit()
        sa_id = db.execute(text("SELECT id FROM users WHERE email=:e"), {"e": sa_email}).scalar()
        print(f"  super admin id={sa_id} {sa_email}")

        totals = {"orgs": 0, "products": 0, "orders": 0, "items": 0, "invoices": 0}

        for org_spec in ORGS:
            print(f"\n=== ORG {org_spec['name']} ===")
            db.execute(
                text(
                    """
                    INSERT INTO organizations
                    (name, slug, business_type, email, phone, address_line1, city, state, country,
                     postal_code, tax_id, currency_code, timezone, is_active, notes,
                     is_deleted, created_at, updated_at)
                    VALUES
                    (:name, :slug, :bt, :email, :phone, :addr, 'Chennai', 'Tamil Nadu', 'IN',
                     '600017', :tax, 'INR', 'Asia/Kolkata', 1, :notes,
                     0, :now, :now)
                    """
                ),
                {
                    "name": org_spec["name"],
                    "slug": org_spec["slug"],
                    "bt": org_spec["business_type"],
                    "email": org_spec["email"],
                    "phone": org_spec["phone"],
                    "addr": org_spec["address"],
                    "tax": f"33AABCT{random.randint(1000,9999)}D1Z{random.randint(1,9)}",
                    "notes": "Chennai demo store for customer presentation",
                    "now": NOW.astimezone(timezone.utc),
                },
            )
            db.commit()
            org_id = db.execute(
                text("SELECT id FROM organizations WHERE slug=:s"), {"s": org_spec["slug"]}
            ).scalar()
            totals["orgs"] += 1

            admin_email = org_spec["admin_email"]
            admin_pass = admin_email  # same as email
            db.execute(
                text(
                    """
                    INSERT INTO users
                    (organization_id, email, username, full_name, hashed_password, phone, role,
                     is_active, pin_code, is_deleted, created_at, updated_at)
                    VALUES
                    (:oid, :email, :uname, :fname, :hp, :phone, 'org_admin',
                     1, '1234', 0, :now, :now)
                    """
                ),
                {
                    "oid": org_id,
                    "email": admin_email,
                    "uname": org_spec["admin_username"],
                    "fname": org_spec["admin_name"],
                    "hp": hash_password(admin_pass),
                    "phone": org_spec["phone"],
                    "now": NOW.astimezone(timezone.utc),
                },
            )
            db.commit()
            admin_id = db.execute(
                text("SELECT id FROM users WHERE email=:e"), {"e": admin_email}
            ).scalar()
            print(f"  admin id={admin_id} {admin_email}")

            # cashier helper for variety
            cash_email = org_spec["admin_username"] + ".cashier@yopmail.com"
            db.execute(
                text(
                    """
                    INSERT INTO users
                    (organization_id, email, username, full_name, hashed_password, phone, role,
                     is_active, pin_code, is_deleted, created_at, updated_at)
                    VALUES
                    (:oid, :email, :uname, :fname, :hp, :phone, 'cashier',
                     1, '4321', 0, :now, :now)
                    """
                ),
                {
                    "oid": org_id,
                    "email": cash_email,
                    "uname": org_spec["admin_username"] + "_cashier",
                    "fname": org_spec["name"] + " Cashier",
                    "hp": hash_password(cash_email),
                    "phone": org_spec["phone"],
                    "now": NOW.astimezone(timezone.utc),
                },
            )
            db.commit()
            cashier_id = db.execute(
                text("SELECT id FROM users WHERE email=:e"), {"e": cash_email}
            ).scalar()

            # terminals
            term_ids = []
            for i, (tname, tcode) in enumerate(
                [("Counter 1", "C1"), ("Counter 2", "C2"), ("Takeaway Desk", "TA")], start=1
            ):
                db.execute(
                    text(
                        """
                        INSERT INTO terminals
                        (organization_id, name, code, location, is_active, cash_float, printer_name,
                         is_deleted, created_at, updated_at)
                        VALUES
                        (:oid, :name, :code, 'Chennai store floor', 1, 2000, :prn, 0, :now, :now)
                        """
                    ),
                    {
                        "oid": org_id,
                        "name": tname,
                        "code": tcode,
                        "prn": f"Printer-{i}",
                        "now": NOW.astimezone(timezone.utc),
                    },
                )
            db.commit()
            rows = db.execute(
                text("SELECT id FROM terminals WHERE organization_id=:o"), {"o": org_id}
            ).fetchall()
            term_ids = [r[0] for r in rows]

            # tax rate
            db.execute(
                text(
                    """
                    INSERT INTO tax_rates
                    (organization_id, name, code, rate, country_code, tax_type, is_compound, is_inclusive,
                     is_default, is_active, is_deleted, created_at, updated_at)
                    VALUES
                    (:oid, :name, :code, :rate, 'IN', 'gst', 0, 0, 1, 1, 0, :now, :now)
                    """
                ),
                {
                    "oid": org_id,
                    "name": "GST 5%" if org_spec["tax_rate"] > 0 else "GST 0%",
                    "code": "GST5" if org_spec["tax_rate"] > 0 else "GST0",
                    "rate": org_spec["tax_rate"],
                    "now": NOW.astimezone(timezone.utc),
                },
            )
            db.commit()

            # tables for restaurant-like
            if org_spec["business_type"] in ("fast_food", "restaurant", "bakery"):
                for n in range(1, 9):
                    db.execute(
                        text(
                            """
                            INSERT INTO dining_tables
                            (organization_id, name, code, capacity, area, is_active, is_occupied,
                             is_deleted, created_at, updated_at)
                            VALUES
                            (:oid, :name, :code, :cap, :area, 1, 0, 0, :now, :now)
                            """
                        ),
                        {
                            "oid": org_id,
                            "name": f"T{n}",
                            "code": f"T{n}",
                            "cap": 2 + (n % 4) * 2,
                            "area": "AC Hall" if n <= 4 else "Outdoor",
                            "now": NOW.astimezone(timezone.utc),
                        },
                    )
                db.commit()

            # customers
            for ci in range(1, 16):
                db.execute(
                    text(
                        """
                        INSERT INTO customers
                        (organization_id, name, phone, email, address, notes, is_deleted, created_at, updated_at)
                        VALUES
                        (:oid, :name, :phone, :email, :addr, 'Demo guest', 0, :now, :now)
                        """
                    ),
                    {
                        "oid": org_id,
                        "name": f"Guest {ci}",
                        "phone": f"+91 98{random.randint(10000000,99999999)}",
                        "email": f"guest{ci}.{org_spec['slug'][:12]}@yopmail.com",
                        "addr": f"{ci * 3}, Chennai, Tamil Nadu",
                        "now": NOW.astimezone(timezone.utc),
                    },
                )
            db.commit()
            cust_ids = [
                r[0]
                for r in db.execute(
                    text("SELECT id FROM customers WHERE organization_id=:o"), {"o": org_id}
                ).fetchall()
            ]

            # categories + products
            products = []  # list of dicts
            sort = 0
            for cat_name, items in org_spec["menu"].items():
                slug = cat_name.lower().replace(" ", "-").replace("&", "and")
                db.execute(
                    text(
                        """
                        INSERT INTO categories
                        (organization_id, name, slug, description, color, sort_order, is_active,
                         is_deleted, created_at, updated_at)
                        VALUES
                        (:oid, :name, :slug, :desc, :color, :so, 1, 0, :now, :now)
                        """
                    ),
                    {
                        "oid": org_id,
                        "name": cat_name,
                        "slug": slug,
                        "desc": f"{cat_name} for {org_spec['name']}",
                        "color": random.choice(
                            ["#10b981", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6"]
                        ),
                        "so": sort,
                        "now": NOW.astimezone(timezone.utc),
                    },
                )
                sort += 1
            db.commit()
            cat_map = {
                r[0]: r[1]
                for r in db.execute(
                    text("SELECT name, id FROM categories WHERE organization_id=:o"),
                    {"o": org_id},
                ).fetchall()
            }

            pidx = 0
            for cat_name, items in org_spec["menu"].items():
                cat_id = cat_map[cat_name]
                for name, price in items:
                    pidx += 1
                    sku = f"{org_spec['slug'][:6].upper()}-{pidx:03d}"
                    barcode = f"890{org_id:02d}{pidx:06d}"
                    cost = money(price * 0.55)
                    img = IMAGES[pidx % len(IMAGES)]
                    db.execute(
                        text(
                            """
                            INSERT INTO products
                            (organization_id, category_id, name, sku, barcode, description, price,
                             cost_price, tax_rate, unit, image_url, is_active, is_track_inventory,
                             is_sold_by_weight, low_stock_threshold, sort_order, is_deleted,
                             created_at, updated_at)
                            VALUES
                            (:oid, :cid, :name, :sku, :bc, :desc, :price, :cost, :tax, 'pcs', :img,
                             1, 1, 0, 10, :so, 0, :now, :now)
                            """
                        ),
                        {
                            "oid": org_id,
                            "cid": cat_id,
                            "name": name,
                            "sku": sku,
                            "bc": barcode,
                            "desc": f"{name} from {org_spec['name']}, Chennai",
                            "price": money(price),
                            "cost": cost,
                            "tax": org_spec["tax_rate"],
                            "img": img,
                            "so": pidx,
                            "now": NOW.astimezone(timezone.utc),
                        },
                    )
            db.commit()
            prod_rows = db.execute(
                text(
                    """
                    SELECT id, name, sku, price, tax_rate, cost_price
                    FROM products WHERE organization_id=:o AND is_deleted=0
                    """
                ),
                {"o": org_id},
            ).fetchall()
            products = [
                {
                    "id": r[0],
                    "name": r[1],
                    "sku": r[2],
                    "price": Decimal(str(r[3])),
                    "tax_rate": Decimal(str(r[4])),
                    "cost": Decimal(str(r[5] or 0)),
                }
                for r in prod_rows
            ]
            totals["products"] += len(products)
            print(f"  products={len(products)}")

            # inventory
            for p in products:
                qty = random.randint(40, 400)
                db.execute(
                    text(
                        """
                        INSERT INTO inventory_items
                        (organization_id, product_id, quantity_on_hand, quantity_reserved,
                         reorder_level, reorder_qty, created_at, updated_at)
                        VALUES
                        (:oid, :pid, :q, 0, 10, 50, :now, :now)
                        """
                    ),
                    {
                        "oid": org_id,
                        "pid": p["id"],
                        "q": money(qty),
                        "now": NOW.astimezone(timezone.utc),
                    },
                )
            db.commit()

            # 30 days of orders
            org_orders = 0
            seq = 0
            methods = ["cash", "card", "upi", "wallet"]
            method_w = [0.35, 0.30, 0.30, 0.05]

            for day_offset in range(DAYS - 1, -1, -1):
                day = (NOW - timedelta(days=day_offset)).date()
                n_orders = random.randint(ORDERS_MIN, ORDERS_MAX)
                for _ in range(n_orders):
                    seq += 1
                    hour = random.randint(8, 22)
                    minute = random.randint(0, 59)
                    second = random.randint(0, 59)
                    created = datetime(
                        day.year, day.month, day.day, hour, minute, second, tzinfo=IST
                    ).astimezone(timezone.utc)

                    otype = random.choice(org_spec["order_types"])
                    term_id = random.choice(term_ids)
                    cashier = random.choice([admin_id, cashier_id])
                    cust_id = random.choice(cust_ids) if random.random() < 0.35 else None
                    n_lines = random.randint(1, 4)
                    line_products = random.sample(products, k=min(n_lines, len(products)))

                    subtotal = Decimal("0")
                    tax_total = Decimal("0")
                    lines = []
                    for lp in line_products:
                        qty = Decimal(str(random.randint(1, 3)))
                        unit = money(lp["price"])
                        line_sub = money(unit * qty)
                        tax_amt = money(line_sub * lp["tax_rate"] / Decimal("100"))
                        disc = money(0)
                        if random.random() < 0.08:
                            disc = money(min(line_sub * Decimal("0.05"), Decimal("20")))
                        line_total = money(line_sub + tax_amt - disc)
                        subtotal += line_sub
                        tax_total += tax_amt
                        lines.append(
                            {
                                "product_id": lp["id"],
                                "product_name": lp["name"],
                                "sku": lp["sku"],
                                "quantity": qty,
                                "unit_price": unit,
                                "tax_rate": lp["tax_rate"],
                                "tax_amount": tax_amt,
                                "discount_amount": disc,
                                "line_total": line_total,
                            }
                        )

                    discount_total = money(sum(x["discount_amount"] for x in lines))
                    grand = money(subtotal + tax_total - discount_total)
                    order_number = f"ORD-{org_id}-{day.strftime('%Y%m%d')}-{seq:05d}"
                    inv_number = f"INV-{org_id}-{day.strftime('%Y%m%d')}-{seq:05d}"
                    sales_code = f"SC{org_id}{seq:06d}"

                    status = "completed"
                    # sprinkle a few open/held/cancelled for realism
                    rroll = random.random()
                    if day_offset == 0 and rroll < 0.04:
                        status = "held"
                    elif rroll < 0.02:
                        status = "cancelled"

                    table_label = None
                    if otype == "dine_in":
                        table_label = f"T{random.randint(1, 8)}"

                    db.execute(
                        text(
                            """
                            INSERT INTO orders
                            (organization_id, order_number, sales_code, status, order_type, bill_type,
                             terminal_id, customer_id, cashier_id, table_label, guest_count,
                             kot_printed, bill_printed, subtotal, tax_total, discount_total,
                             grand_total, amount_paid, amount_due, notes, created_at, updated_at)
                            VALUES
                            (:oid, :onum, :scode, :status, :otype, 'cash',
                             :tid, :cid, :cash, :tlab, :gc,
                             1, 1, :sub, :tax, :disc,
                             :grand, :paid, :due, :notes, :created, :created)
                            """
                        ),
                        {
                            "oid": org_id,
                            "onum": order_number,
                            "scode": sales_code,
                            "status": status,
                            "otype": otype,
                            "tid": term_id,
                            "cid": cust_id,
                            "cash": cashier,
                            "tlab": table_label,
                            "gc": random.randint(1, 4) if otype == "dine_in" else None,
                            "sub": subtotal,
                            "tax": tax_total,
                            "disc": discount_total,
                            "grand": grand,
                            "paid": grand if status == "completed" else money(0),
                            "due": money(0) if status == "completed" else grand,
                            "notes": "Demo order",
                            "created": created,
                        },
                    )
                    order_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()

                    for ln in lines:
                        db.execute(
                            text(
                                """
                                INSERT INTO order_items
                                (organization_id, order_id, product_id, product_name, sku, quantity,
                                 unit_price, tax_rate, tax_amount, discount_amount, line_total,
                                 created_at, updated_at)
                                VALUES
                                (:oid, :oidx, :pid, :pname, :sku, :qty,
                                 :up, :tr, :ta, :da, :lt, :created, :created)
                                """
                            ),
                            {
                                "oid": org_id,
                                "oidx": order_id,
                                "pid": ln["product_id"],
                                "pname": ln["product_name"],
                                "sku": ln["sku"],
                                "qty": ln["quantity"],
                                "up": ln["unit_price"],
                                "tr": ln["tax_rate"],
                                "ta": ln["tax_amount"],
                                "da": ln["discount_amount"],
                                "lt": ln["line_total"],
                                "created": created,
                            },
                        )
                        totals["items"] += 1

                    if status == "completed":
                        method = random.choices(methods, weights=method_w, k=1)[0]
                        tendered = grand
                        change = money(0)
                        if method == "cash":
                            tendered = money(grand + Decimal(random.choice([0, 10, 20, 50, 100])))
                            change = money(tendered - grand)
                        db.execute(
                            text(
                                """
                                INSERT INTO payments
                                (organization_id, order_id, method, status, amount, tendered_amount,
                                 change_amount, reference, terminal_id, received_by, created_at, updated_at)
                                VALUES
                                (:oid, :oidx, :method, 'completed', :amt, :tend, :chg, :ref,
                                 :tid, :recv, :created, :created)
                                """
                            ),
                            {
                                "oid": org_id,
                                "oidx": order_id,
                                "method": method,
                                "amt": grand,
                                "tend": tendered,
                                "chg": change,
                                "ref": f"PAY-{order_id}",
                                "tid": term_id,
                                "recv": cashier,
                                "created": created,
                            },
                        )

                        snapshot = {
                            "organization": {
                                "name": org_spec["name"],
                                "address": org_spec["address"],
                                "city": "Chennai",
                                "state": "Tamil Nadu",
                                "country": "IN",
                                "phone": org_spec["phone"],
                                "email": org_spec["email"],
                                "tax_id": None,
                                "currency_code": "INR",
                            },
                            "invoice_number": inv_number,
                            "order_number": order_number,
                            "order_type": otype,
                            "table_label": table_label,
                            "items": [
                                {
                                    "name": ln["product_name"],
                                    "quantity": float(ln["quantity"]),
                                    "unit_price": float(ln["unit_price"]),
                                    "tax_amount": float(ln["tax_amount"]),
                                    "discount_amount": float(ln["discount_amount"]),
                                    "line_total": float(ln["line_total"]),
                                }
                                for ln in lines
                            ],
                            "subtotal": float(subtotal),
                            "tax_total": float(tax_total),
                            "discount_total": float(discount_total),
                            "grand_total": float(grand),
                            "payment_method": method,
                        }
                        db.execute(
                            text(
                                """
                                INSERT INTO invoices
                                (organization_id, order_id, invoice_number, customer_name, customer_phone,
                                 subtotal, tax_total, discount_total, grand_total, snapshot, notes,
                                 printed_count, created_at, updated_at)
                                VALUES
                                (:oid, :oidx, :inum, :cname, :cphone,
                                 :sub, :tax, :disc, :grand, :snap, 'Demo invoice',
                                 1, :created, :created)
                                """
                            ),
                            {
                                "oid": org_id,
                                "oidx": order_id,
                                "inum": inv_number,
                                "cname": f"Walk-in {seq % 50}" if not cust_id else None,
                                "cphone": None,
                                "sub": subtotal,
                                "tax": tax_total,
                                "disc": discount_total,
                                "grand": grand,
                                "snap": json.dumps(snapshot),
                                "created": created,
                            },
                        )
                        totals["invoices"] += 1

                    org_orders += 1
                    totals["orders"] += 1

                    if org_orders % 200 == 0:
                        db.commit()
                        print(f"    ... {org_orders} orders")

                db.commit()

            print(f"  orders total for org: {org_orders}")

        print("\n=== DONE ===")
        print(totals)
        # verify counts
        for q in [
            "SELECT COUNT(*) FROM organizations",
            "SELECT COUNT(*) FROM users",
            "SELECT COUNT(*) FROM products",
            "SELECT COUNT(*) FROM orders",
            "SELECT COUNT(*) FROM invoices",
            "SELECT COUNT(*) FROM payments",
            "SELECT COUNT(*) FROM order_items",
        ]:
            print(q, "->", db.execute(text(q)).scalar())
        print("\nLOGIN CREDENTIALS (email = password):")
        print("  Super Admin: superadmin@yopmail.com")
        for o in ORGS:
            print(f"  {o['name']}: {o['admin_email']}")
            print(f"    cashier: {o['admin_username']}.cashier@yopmail.com")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
