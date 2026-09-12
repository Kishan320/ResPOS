"""
Organization owner (org_admin) creates managers/cashiers/staff with module RBAC.
Super admin may also create org users when X-Organization-Id is set.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_org_admin, resolve_organization_id
from app.core.security import hash_password
from app.models.rbac import AppModule, OrgModuleAccess, UserModuleAccess
from app.models.user import User, UserRole
from app.schemas.common import ORMModel, Page
from app.utils.pagination import page_response, paginate

router = APIRouter()

ALLOWED_ORG_ROLES = {UserRole.ORG_ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.STAFF}


class OrganizationStaffModulePermissionGrantRequestBody(BaseModel):
    module_code: str
    can_view: bool = True
    can_create: bool = False
    can_edit: bool = False
    can_delete: bool = False
    can_export: bool = False


class OrganizationOwnerCreateStaffUserWithModulePermissionsRequestBody(BaseModel):
    email: str
    username: str = Field(min_length=2, max_length=80)
    full_name: str
    password: str = Field(min_length=6)
    phone: Optional[str] = None
    role: UserRole = UserRole.CASHIER
    pin_code: Optional[str] = None
    module_permission_grants: List[OrganizationStaffModulePermissionGrantRequestBody] = Field(
        default_factory=list
    )


class OrganizationStaffUserResponseBody(ORMModel):
    id: int
    email: str
    username: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    organization_id: Optional[int] = None
    is_active: bool


def _require_org(org_id: Optional[int]) -> int:
    if not org_id:
        raise HTTPException(status_code=400, detail="Organization context required")
    return org_id


@router.get(
    "/list-staff-users-belonging-to-current-organization",
    response_model=Page[OrganizationStaffUserResponseBody],
)
def list_staff_users_belonging_to_current_organization(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    user: User = Depends(require_org_admin),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _require_org(org_id if user.role == UserRole.SUPER_ADMIN else user.organization_id)
    stmt = (
        select(User)
        .where(User.is_deleted.is_(False), User.organization_id == oid)
        .order_by(User.id.desc())
    )
    rows, meta = paginate(db, stmt, page, page_size)
    return page_response([OrganizationStaffUserResponseBody.model_validate(r) for r in rows], meta)


@router.post(
    "/create-organization-staff-user-with-module-permission-grants",
    response_model=OrganizationStaffUserResponseBody,
    status_code=201,
)
def create_organization_staff_user_with_module_permission_grants(
    payload: OrganizationOwnerCreateStaffUserWithModulePermissionsRequestBody,
    actor: User = Depends(require_org_admin),
    org_id: Optional[int] = Depends(resolve_organization_id),
    db: Session = Depends(get_db),
):
    oid = _require_org(org_id if actor.role == UserRole.SUPER_ADMIN else actor.organization_id)

    if payload.role not in ALLOWED_ORG_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role for organization staff")
    if payload.role == UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Cannot create super admin here")
    # Only super admin or org_admin can create another org_admin
    if payload.role == UserRole.ORG_ADMIN and actor.role not in (
        UserRole.SUPER_ADMIN,
        UserRole.ORG_ADMIN,
    ):
        raise HTTPException(status_code=403, detail="Only owner/admin can create org admin")

    if db.execute(select(User.id).where(User.email == payload.email)).scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Org must have module entitlement for grants (fast set membership)
    org_allowed_module_ids = {
        r.module_id
        for r in db.execute(
            select(OrgModuleAccess).where(
                OrgModuleAccess.organization_id == oid,
                OrgModuleAccess.is_active.is_(True),
                OrgModuleAccess.can_view.is_(True),
            )
        ).scalars().all()
    }

    staff = User(
        organization_id=oid,
        email=payload.email,
        username=payload.username,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        phone=payload.phone,
        role=payload.role,
        pin_code=payload.pin_code,
        is_active=True,
    )
    db.add(staff)
    db.flush()

    codes = [g.module_code for g in payload.module_permission_grants]
    modules = {
        m.code: m
        for m in db.execute(select(AppModule).where(AppModule.code.in_(codes or ["__none__"]))).scalars().all()
    }

    for grant in payload.module_permission_grants:
        mod = modules.get(grant.module_code)
        if not mod:
            continue
        if org_allowed_module_ids and mod.id not in org_allowed_module_ids:
            # skip modules org is not licensed for
            continue
        if mod.super_only:
            continue
        db.add(
            UserModuleAccess(
                user_id=staff.id,
                organization_id=oid,
                module_id=mod.id,
                can_view=grant.can_view,
                can_create=grant.can_create,
                can_edit=grant.can_edit,
                can_delete=grant.can_delete,
                can_export=grant.can_export,
                is_active=True,
            )
        )

    db.commit()
    db.refresh(staff)
    return OrganizationStaffUserResponseBody.model_validate(staff)
