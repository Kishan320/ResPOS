"""Shared SQLAlchemy enum columns stored as VARCHAR (portable, no MySQL name/value mismatch)."""

from enum import Enum as PyEnum

from sqlalchemy import Enum


def varchar_enum(enum_cls: type[PyEnum], length: int = 40):
    """Store enum *values* (e.g. open) as strings - avoids DRAFT vs draft MySQL ENUM issues."""
    return Enum(
        enum_cls,
        values_callable=lambda obj: [e.value for e in obj],
        native_enum=False,
        length=length,
        validate_strings=True,
    )
