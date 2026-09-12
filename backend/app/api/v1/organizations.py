from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_super_admin
from app.core.security import hash_password
from app.models.organization import Organization
from app.models.user import User, UserRole
from app.schemas.common import Page
from app.schemas.organization import OrganizationCreate, OrganizationOut, OrganizationUpdate
from app.utils.pagination import page_response, paginate
from app.utils.slug import make_unique_slug, slugify

router = APIRouter()


@router.get("", response_model=Page[OrganizationOut])
def list_organizations(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    q: Optional[str] = None,
    business_type: Optional[str] = None,
    is_active: Optional[bool] = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(Organization).where(Organization.is_deleted.is_(False))
    if user.role != UserRole.SUPER_ADMIN:
        if not user.organization_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No organization")
        stmt = stmt.where(Organization.id == user.organization_id)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(Organization.name.ilike(like), Organization.slug.ilike(like), Organization.city.ilike(like))
        )
    if business_type:
        stmt = stmt.where(Organization.business_type == business_type)
    if is_active is not None:
        stmt = stmt.where(Organization.is_active.is_(is_active))
    stmt = stmt.order_by(Organization.id.desc())
    rows, meta = paginate(db, stmt, page, page_size)
    return page_response([OrganizationOut.model_validate(r) for r in rows], meta)


@router.post("", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED)
def create_organization(
    payload: OrganizationCreate,
    _: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    base_slug = payload.slug or slugify(payload.name)
    slug = base_slug
    exists = db.execute(select(Organization.id).where(Organization.slug == slug)).scalar_one_or_none()
    if exists:
        slug = make_unique_slug(payload.name)

    org = Organization(
        name=payload.name,
        slug=slug,
        business_type=payload.business_type,
        email=payload.email,
        phone=payload.phone,
        address_line1=payload.address_line1,
        address_line2=payload.address_line2,
        city=payload.city,
        state=payload.state,
        country=payload.country or "AE",
        postal_code=payload.postal_code,
        tax_id=payload.tax_id,
        currency_code=payload.currency_code or "AED",
        timezone=payload.timezone or "Asia/Dubai",
        settings=payload.settings or {},
        notes=payload.notes,
        is_active=True,
    )
    db.add(org)
    db.flush()

    if payload.admin_email and payload.admin_password:
        admin = User(
            organization_id=org.id,
            email=payload.admin_email,
            username=payload.admin_email.split("@")[0][:80],
            full_name=payload.admin_name or "Organization Admin",
            hashed_password=hash_password(payload.admin_password),
            role=UserRole.ORG_ADMIN,
            is_active=True,
        )
        db.add(admin)

    # Default RBAC: grant all non-super modules (super admin can refine later)
    try:
        from app.models.rbac import AppModule, OrgModuleAccess

        mods = db.execute(
            select(AppModule).where(AppModule.is_active.is_(True), AppModule.super_only.is_(False))
        ).scalars().all()
        for m in mods:
            db.add(
                OrgModuleAccess(
                    organization_id=org.id,
                    module_id=m.id,
                    can_view=True,
                    can_create=True,
                    can_edit=True,
                    can_delete=False,
                    can_export=True,
                    is_active=True,
                )
            )
    except Exception:
        pass  # non-fatal if RBAC tables not ready

    db.commit()
    db.refresh(org)
    return OrganizationOut.model_validate(org)


@router.get("/{org_id}", response_model=OrganizationOut)
def get_organization(
    org_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org = db.get(Organization, org_id)
    if not org or org.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    if user.role != UserRole.SUPER_ADMIN and user.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return OrganizationOut.model_validate(org)


@router.patch("/{org_id}", response_model=OrganizationOut)
def update_organization(
    org_id: int,
    payload: OrganizationUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    org = db.get(Organization, org_id)
    if not org or org.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    if user.role not in (UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    if user.role != UserRole.SUPER_ADMIN and user.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(org, k, v)
    db.commit()
    db.refresh(org)
    return OrganizationOut.model_validate(org)
