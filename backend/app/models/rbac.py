"""Deep RBAC - super admin (malik) assigns modules to orgs and users."""

from typing import Optional

from sqlalchemy import BigInteger, Boolean, ForeignKey, String, Text, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import TimestampMixin


class AppModule(Base, TimestampMixin):
    __tablename__ = "app_modules"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(60), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    route_path: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    icon_key: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    sort_order: Mapped[int] = mapped_column(default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # super_admin_only modules hidden from org assignment UI defaults
    super_only: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class OrgModuleAccess(Base, TimestampMixin):
    """Which modules an organization (restaurant) may use."""

    __tablename__ = "org_module_access"
    __table_args__ = (
        UniqueConstraint("organization_id", "module_id", name="uq_org_module"),
        Index("ix_org_module_org", "organization_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False
    )
    module_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("app_modules.id", ondelete="CASCADE"), nullable=False
    )
    can_view: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_create: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_edit: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_delete: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_export: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class UserModuleAccess(Base, TimestampMixin):
    """Optional per-user override within an org (fine-grained)."""

    __tablename__ = "user_module_access"
    __table_args__ = (
        UniqueConstraint("user_id", "module_id", name="uq_user_module"),
        Index("ix_user_module_user", "user_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    organization_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    module_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("app_modules.id", ondelete="CASCADE"), nullable=False
    )
    can_view: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    can_create: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_edit: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_delete: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    can_export: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
