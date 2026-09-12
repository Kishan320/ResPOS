"""Slug and number generators - tenant-safe, no hard-coded names."""

import re
import secrets
import string
from datetime import datetime, timezone


def slugify(value: str, max_length: int = 100) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^\w\s-]", "", value)
    value = re.sub(r"[\s_-]+", "-", value).strip("-")
    if not value:
        value = "item"
    return value[:max_length]


def unique_suffix(length: int = 6) -> str:
    alphabet = string.ascii_lowercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def make_unique_slug(base: str) -> str:
    return f"{slugify(base)}-{unique_suffix(5)}"


def generate_order_number(org_id: int) -> str:
    ts = datetime.now(timezone.utc).strftime("%y%m%d%H%M%S")
    return f"O{org_id}-{ts}-{unique_suffix(4).upper()}"


def generate_invoice_number(org_id: int) -> str:
    ts = datetime.now(timezone.utc).strftime("%y%m%d%H%M%S")
    return f"INV{org_id}-{ts}-{unique_suffix(4).upper()}"


def generate_terminal_code() -> str:
    return f"T-{unique_suffix(8).upper()}"
