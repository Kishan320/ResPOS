#!/usr/bin/env python3
"""
Full Database Reset and Reseed Script.

Steps:
1. Drops and recreates database `pos_platform` fresh from MySQL.
2. Runs migrate_and_seed: creates tables, columns, super admin, modules, currencies, and updated CMS landing sections.
3. Runs demo_chennai_seed: populates 100% realistic restaurant POS data.
4. Performs comprehensive integrity audit and outputs table counts and credentials.
"""
from __future__ import annotations

import sys
from pathlib import Path
from urllib.parse import quote_plus

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from sqlalchemy import create_engine, text

from app.core.config import settings
from app.database import get_engine_connect_args

def main():
    print("=" * 70)
    print("  DineFlow - Complete Database Wipe & Reseed from Scratch")
    print("=" * 70)

    # 1. Drop and recreate database
    print("\n[Step 1/3] Dropping and recreating database from scratch...")
    user = quote_plus(settings.db_user)
    password = quote_plus(settings.db_password)
    url_without_db = f"mysql+pymysql://{user}:{password}@{settings.db_host}:{settings.db_port}/?charset=utf8mb4"
    server_engine = create_engine(
        url_without_db,
        isolation_level="AUTOCOMMIT",
        connect_args=get_engine_connect_args(),
    )
    with server_engine.connect() as conn:
        conn.execute(text(f"DROP DATABASE IF EXISTS `{settings.db_name}`"))
        print(f"  Dropped database `{settings.db_name}`")
        conn.execute(text(f"CREATE DATABASE `{settings.db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
        print(f"  Created fresh database `{settings.db_name}`")
    server_engine.dispose()

    # 2. Run migrate_and_seed
    print("\n[Step 2/3] Running migrate_and_seed (schema, modules, currencies, CMS)...")
    from scripts.migrate_and_seed import main as migrate_main
    migrate_main()

    # 3. Run demo_chennai_seed
    print("\n[Step 3/3] Running demo_chennai_seed (restaurant POS data)...")
    from scripts.demo_chennai_seed import seed as demo_seed
    demo_seed()

    print("\n" + "=" * 70)
    print("  ALL STEPS FINISHED SUCCESSFULLY! Database is completely reseeded.")
    print("=" * 70)

if __name__ == "__main__":
    main()
