"""
Super admin (platform malik) creates platform operators with module permissions.
Also lists platform users (organization_id IS NULL).
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_db, require_super_admin
from app.core.security import hash_password
from app.models.rbac import AppModule, UserModuleAccess
from app.models.user import User, UserRole
from app.schemas.common import ORMModel, Page
from app.utils.pagination import page_response, paginate

router = APIRouter()


class PlatformOperatorModulePermissionGrantRequestBody(BaseModel):
    module_code: str
    can_view: bool = True
    can_create: bool = True
    can_edit: bool = True
    can_delete: bool = False
    can_export: bool = True


class SuperAdminCreatePlatformOperatorUserWithModulePermissionsRequestBody(BaseModel):
    email: str
    username: str = Field(min_length=2, max_length=80)
    full_name: str
    password: str = Field(min_length=6)
    phone: Optional[str] = None
    # Platform staff typically manager-like; never another super_admin unless explicit
    assign_as_platform_operations_manager: bool = True
    module_permission_grants: List[PlatformOperatorModulePermissionGrantRequestBody] = Field(
        default_factory=list
    )


class PlatformOperatorUserResponseBody(ORMModel):
    id: int
    email: str
    username: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    organization_id: Optional[int] = None
    is_active: bool


@router.get(
    "/list-all-platform-level-operator-users-without-organization",
    response_model=Page[PlatformOperatorUserResponseBody],
)
def list_all_platform_level_operator_users_without_organization(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    stmt = (
        select(User)
        .where(
            User.is_deleted.is_(False),
            User.organization_id.is_(None),
        )
        .order_by(User.id.desc())
    )
    rows, meta = paginate(db, stmt, page, page_size)
    return page_response([PlatformOperatorUserResponseBody.model_validate(r) for r in rows], meta)


@router.post(
    "/create-platform-operator-user-with-full-module-permission-grants",
    response_model=PlatformOperatorUserResponseBody,
    status_code=201,
)
def create_platform_operator_user_with_full_module_permission_grants(
    payload: SuperAdminCreatePlatformOperatorUserWithModulePermissionsRequestBody,
    actor: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    exists = db.execute(select(User.id).where(User.email == payload.email)).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")
    # Platform operators are not org-bound; role manager for ops (super stays unique)
    role = UserRole.MANAGER if payload.assign_as_platform_operations_manager else UserRole.STAFF
    user = User(
        organization_id=None,
        email=payload.email,
        username=payload.username,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        phone=payload.phone,
        role=role,
        is_active=True,
    )
    db.add(user)
    db.flush()

    # Map module codes → ids in one query
    codes = [g.module_code for g in payload.module_permission_grants]
    modules = {}
    if codes:
        for m in db.execute(select(AppModule).where(AppModule.code.in_(codes))).scalars().all():
            modules[m.code] = m

    for grant in payload.module_permission_grants:
        mod = modules.get(grant.module_code)
        if not mod:
            continue
        db.add(
            UserModuleAccess(
                user_id=user.id,
                organization_id=None,
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
    db.refresh(user)
    return PlatformOperatorUserResponseBody.model_validate(user)
