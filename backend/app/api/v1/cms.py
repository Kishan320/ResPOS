"""Public CMS read + super-admin CMS write (landing, careers, social, contact)."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_super_admin
from app.models.cms import CareerPost, CmsContent, ContactSubmission, SocialLink
from app.models.user import User
from app.schemas.common import ORMModel
from app.utils.slug import make_unique_slug, slugify

router = APIRouter()

DEFAULT_CONTACT_FIELDS = [
    {
        "key": "name",
        "label": "Name",
        "type": "text",
        "required": False,
        "enabled": True,
        "placeholder": "Your full name",
    },
    {
        "key": "email",
        "label": "Email",
        "type": "email",
        "required": True,
        "enabled": True,
        "placeholder": "you@company.com",
    },
    {
        "key": "phone",
        "label": "Phone",
        "type": "tel",
        "required": False,
        "enabled": True,
        "placeholder": "+971 ...",
    },
    {
        "key": "message",
        "label": "Message and requirements",
        "type": "textarea",
        "required": False,
        "enabled": True,
        "placeholder": "Tell us about your store and what you need",
    },
]


def _contact_config_from_section(section: Optional[CmsContent]) -> dict:
    extra = (section.extra_json if section else None) or {}
    fields = extra.get("fields") if isinstance(extra.get("fields"), list) else DEFAULT_CONTACT_FIELDS
    # Always ensure email field exists and is usable
    keys = {str(f.get("key")) for f in fields if isinstance(f, dict)}
    if "email" not in keys:
        fields = list(fields) + [f for f in DEFAULT_CONTACT_FIELDS if f["key"] == "email"]
    return {
        "title": (section.title if section else None) or "Contact us",
        "subtitle": (section.subtitle if section else None)
        or "Share your name, email and requirements. We will get back to you.",
        "body": section.body if section else None,
        "badge_text": (section.badge_text if section else None) or "Contact",
        "cta_label": (section.cta_label if section else None) or "Contact",
        "submit_label": extra.get("submit_label") or "Send message",
        "success_message": extra.get("success_message")
        or "Thank you. Your message was received and our team will contact you soon.",
        "show_on_landing": extra.get("show_on_landing", True) is not False,
        "fields": fields,
        "is_active": True if section is None else bool(section.is_active),
    }


class CmsIn(BaseModel):
    section_key: str
    title: Optional[str] = None
    subtitle: Optional[str] = None
    body: Optional[str] = None
    cta_label: Optional[str] = None
    cta_url: Optional[str] = None
    image_url: Optional[str] = None
    image_url_2: Optional[str] = None
    image_url_3: Optional[str] = None
    image_url_4: Optional[str] = None
    badge_text: Optional[str] = None
    extra_json: Optional[dict] = None
    sort_order: int = 0
    is_active: bool = True


class CmsOut(ORMModel):
    id: int
    section_key: str
    title: Optional[str] = None
    subtitle: Optional[str] = None
    body: Optional[str] = None
    cta_label: Optional[str] = None
    cta_url: Optional[str] = None
    image_url: Optional[str] = None
    image_url_2: Optional[str] = None
    image_url_3: Optional[str] = None
    image_url_4: Optional[str] = None
    badge_text: Optional[str] = None
    extra_json: Optional[dict] = None
    sort_order: int
    is_active: bool


class CareerIn(BaseModel):
    title: str
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = "full_time"
    description: Optional[str] = None
    requirements: Optional[str] = None
    salary_range: Optional[str] = None
    apply_email: Optional[str] = None
    apply_url: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0


class CareerOut(ORMModel):
    id: int
    title: str
    slug: str
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    salary_range: Optional[str] = None
    apply_email: Optional[str] = None
    apply_url: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool
    sort_order: int


class SocialIn(BaseModel):
    platform: str
    label: str
    url: str
    icon_key: Optional[str] = None
    image_url: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class SocialOut(ORMModel):
    id: int
    platform: str
    label: str
    url: str
    icon_key: Optional[str] = None
    image_url: Optional[str] = None
    sort_order: int
    is_active: bool


# ── Public (landing) ────────────────────────────────────────


class ContactSubmitIn(BaseModel):
    """Public contact form payload. Core fields + any CMS custom field keys."""

    name: Optional[str] = Field(default=None, max_length=200)
    email: Optional[str] = Field(default=None, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=60)
    message: Optional[str] = None
    fields: Optional[Dict[str, Any]] = None  # custom key -> value from CMS fields


class ContactSubmissionOut(ORMModel):
    id: int
    name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    message: Optional[str] = None
    payload_json: Optional[dict] = None
    status: str
    is_resolved: bool
    resolved_at: Optional[datetime] = None
    resolved_by_user_id: Optional[int] = None
    admin_note: Optional[str] = None
    source: Optional[str] = None
    created_at: Optional[datetime] = None


class ContactResolveIn(BaseModel):
    is_resolved: bool = True
    admin_note: Optional[str] = None


@router.get("/public/bundle")
def public_bundle(db: Session = Depends(get_db)):
    """Single fast payload for landing - one round-trip."""
    sections = db.execute(
        select(CmsContent).where(CmsContent.is_active.is_(True)).order_by(CmsContent.sort_order, CmsContent.id)
    ).scalars().all()
    careers = db.execute(
        select(CareerPost)
        .where(CareerPost.is_active.is_(True), CareerPost.is_deleted.is_(False))
        .order_by(CareerPost.sort_order, CareerPost.id.desc())
        .limit(50)
    ).scalars().all()
    social = db.execute(
        select(SocialLink)
        .where(SocialLink.is_active.is_(True), SocialLink.is_deleted.is_(False))
        .order_by(SocialLink.sort_order, SocialLink.id)
    ).scalars().all()
    contact_section = next((s for s in sections if s.section_key == "contact"), None)
    if contact_section is None:
        # include inactive lookup so defaults still work when never seeded
        contact_section = db.execute(
            select(CmsContent).where(CmsContent.section_key == "contact")
        ).scalar_one_or_none()
    return {
        "sections": [CmsOut.model_validate(s).model_dump() for s in sections],
        "careers": [CareerOut.model_validate(c).model_dump() for c in careers],
        "social": [SocialOut.model_validate(s).model_dump() for s in social],
        "contact": _contact_config_from_section(contact_section),
    }


@router.post("/public/contact", status_code=201)
def submit_contact(payload: ContactSubmitIn, request: Request, db: Session = Depends(get_db)):
    """Public landing contact form - validates against CMS field config, stores lead."""
    section = db.execute(select(CmsContent).where(CmsContent.section_key == "contact")).scalar_one_or_none()
    if section and not section.is_active:
        raise HTTPException(status_code=403, detail="Contact form is currently disabled")
    cfg = _contact_config_from_section(section)
    fields_cfg = [f for f in cfg["fields"] if isinstance(f, dict) and f.get("enabled", True) is not False]
    merged: Dict[str, Any] = {}
    if payload.fields:
        merged.update(payload.fields)
    # Prefer top-level standard keys when provided
    for k in ("name", "email", "phone", "message"):
        v = getattr(payload, k, None)
        if v is not None and str(v).strip() != "":
            merged[k] = v

    errors: Dict[str, str] = {}
    for f in fields_cfg:
        key = str(f.get("key") or "").strip()
        if not key:
            continue
        val = merged.get(key)
        text = "" if val is None else str(val).strip()
        required = bool(f.get("required"))
        # Email is always required at product level
        if key == "email":
            required = True
        if required and not text:
            errors[key] = f"{f.get('label') or key} is required"
            continue
        ftype = str(f.get("type") or "text")
        if text and ftype == "email":
            if "@" not in text or "." not in text.split("@")[-1]:
                errors[key] = "Enter a valid email address"
        if text and key == "email":
            if "@" not in text or "." not in text.split("@")[-1]:
                errors[key] = "Enter a valid email address"
    if errors:
        raise HTTPException(status_code=422, detail={"fields": errors})

    email = str(merged.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=422, detail={"fields": {"email": "Email is required"}})

    name = (str(merged.get("name")).strip() if merged.get("name") is not None else None) or None
    phone = (str(merged.get("phone")).strip() if merged.get("phone") is not None else None) or None
    message = (str(merged.get("message")).strip() if merged.get("message") is not None else None) or None

    client_ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    row = ContactSubmission(
        name=name[:200] if name else None,
        email=email[:255],
        phone=phone[:60] if phone else None,
        message=message,
        payload_json=merged,
        status="open",
        is_resolved=False,
        source="landing",
        ip_address=client_ip,
        user_agent=(ua[:500] if ua else None),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "message": cfg.get("success_message")
        or "Thank you. Your message was received and our team will contact you soon.",
        "id": row.id,
    }


# ── Super admin CMS ─────────────────────────────────────────


@router.get("/sections", response_model=List[CmsOut])
def list_sections(_: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    rows = db.execute(select(CmsContent).order_by(CmsContent.sort_order, CmsContent.id)).scalars().all()
    return [CmsOut.model_validate(r) for r in rows]


@router.post("/sections", response_model=CmsOut)
def upsert_section(payload: CmsIn, _: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    row = db.execute(select(CmsContent).where(CmsContent.section_key == payload.section_key)).scalar_one_or_none()
    if not row:
        row = CmsContent(section_key=payload.section_key)
        db.add(row)
    for k, v in payload.model_dump(exclude={"section_key"}).items():
        setattr(row, k, v)
    row.published_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return CmsOut.model_validate(row)


@router.get("/careers", response_model=List[CareerOut])
def list_careers_admin(_: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    rows = db.execute(
        select(CareerPost).where(CareerPost.is_deleted.is_(False)).order_by(CareerPost.sort_order, CareerPost.id.desc())
    ).scalars().all()
    return [CareerOut.model_validate(r) for r in rows]


@router.post("/careers", response_model=CareerOut, status_code=201)
def create_career(payload: CareerIn, _: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    slug = make_unique_slug(payload.title)
    row = CareerPost(slug=slug, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return CareerOut.model_validate(row)


@router.patch("/careers/{career_id}", response_model=CareerOut)
def update_career(
    career_id: int, payload: CareerIn, _: User = Depends(require_super_admin), db: Session = Depends(get_db)
):
    row = db.get(CareerPost, career_id)
    if not row or row.is_deleted:
        raise HTTPException(status_code=404, detail="Career not found")
    for k, v in payload.model_dump().items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return CareerOut.model_validate(row)


@router.delete("/careers/{career_id}")
def delete_career(career_id: int, _: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    row = db.get(CareerPost, career_id)
    if not row:
        raise HTTPException(status_code=404, detail="Career not found")
    row.is_deleted = True
    row.is_active = False
    db.commit()
    return {"message": "Deleted"}


@router.get("/social", response_model=List[SocialOut])
def list_social_admin(_: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    rows = db.execute(
        select(SocialLink).where(SocialLink.is_deleted.is_(False)).order_by(SocialLink.sort_order)
    ).scalars().all()
    return [SocialOut.model_validate(r) for r in rows]


@router.post("/social", response_model=SocialOut, status_code=201)
def create_social(payload: SocialIn, _: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    row = SocialLink(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return SocialOut.model_validate(row)


@router.patch("/social/{sid}", response_model=SocialOut)
def update_social(sid: int, payload: SocialIn, _: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    row = db.get(SocialLink, sid)
    if not row or row.is_deleted:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in payload.model_dump().items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return SocialOut.model_validate(row)


# ── Super admin contact inbox ───────────────────────────────


@router.get("/contacts", response_model=List[ContactSubmissionOut])
def list_contacts(
    status: Optional[str] = None,
    _: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    q = select(ContactSubmission).order_by(ContactSubmission.id.desc())
    if status == "open":
        q = q.where(ContactSubmission.is_resolved.is_(False))
    elif status == "resolved":
        q = q.where(ContactSubmission.is_resolved.is_(True))
    rows = db.execute(q.limit(500)).scalars().all()
    return [ContactSubmissionOut.model_validate(r) for r in rows]


@router.patch("/contacts/{contact_id}", response_model=ContactSubmissionOut)
def resolve_contact(
    contact_id: int,
    payload: ContactResolveIn,
    user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    row = db.get(ContactSubmission, contact_id)
    if not row:
        raise HTTPException(status_code=404, detail="Contact not found")
    row.is_resolved = bool(payload.is_resolved)
    row.status = "resolved" if row.is_resolved else "open"
    if row.is_resolved:
        row.resolved_at = datetime.now(timezone.utc)
        row.resolved_by_user_id = user.id
    else:
        row.resolved_at = None
        row.resolved_by_user_id = None
    if payload.admin_note is not None:
        row.admin_note = payload.admin_note
    db.commit()
    db.refresh(row)
    return ContactSubmissionOut.model_validate(row)


@router.delete("/contacts/{contact_id}")
def delete_contact(contact_id: int, _: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    row = db.get(ContactSubmission, contact_id)
    if not row:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(row)
    db.commit()
    return {"message": "Deleted"}
