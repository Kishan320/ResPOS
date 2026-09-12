"""CMS - landing, careers, social - super-admin controlled."""

from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Boolean, DateTime, Integer, String, Text, JSON, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base
from app.models.mixins import SoftDeleteMixin, TimestampMixin


class CmsContent(Base, TimestampMixin):
    """Single-row-style CMS blobs keyed by section (landing hero, features, etc.)."""

    __tablename__ = "cms_contents"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    section_key: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    subtitle: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cta_label: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    cta_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    image_url_2: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    image_url_3: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    image_url_4: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    badge_text: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    extra_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class CareerPost(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "career_posts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(280), unique=True, nullable=False, index=True)
    department: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, index=True)
    location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    employment_type: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)  # full_time, remote
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    requirements: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    salary_range: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    apply_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    apply_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    published_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=True
    )


class SocialLink(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "social_links"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    platform: Mapped[str] = mapped_column(String(80), nullable=False, index=True)  # linkedin, x, instagram
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    url: Mapped[str] = mapped_column(String(512), nullable=False)
    icon_key: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)


class ContactSubmission(Base, TimestampMixin):
    """Public landing contact form leads - super admin inbox."""

    __tablename__ = "contact_submissions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, index=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(60), nullable=True)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Full payload including any CMS-custom fields
    payload_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="open", nullable=False, index=True)  # open | resolved
    is_resolved: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_by_user_id: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True, index=True)
    admin_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(80), nullable=True, default="landing")
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
