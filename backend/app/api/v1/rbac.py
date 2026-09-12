"""RBAC - super admin assigns modules to orgs & users."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_super_admin
from app.models.rbac import AppModule, OrgModuleAccess, UserModuleAccess
from app.models.user import User, UserRole
from app.schemas.common import ORMModel

router = APIRouter()


class ModuleOut(ORMModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    route_path: Optional[str] = None
    icon_key: Optional[str] = None
    sort_order: int
    is_active: bool
    super_only: bool


class AccessFlags(BaseModel):
    module_id: int
    can_view: bool = True
    can_create: bool = True
    can_edit: bool = True
    can_delete: bool = False
    can_export: bool = True
    is_active: bool = True


class OrgAccessBulk(BaseModel):
    organization_id: int
    modules: List[AccessFlags]


class UserAccessBulk(BaseModel):
    user_id: int
    organization_id: Optional[int] = None
    modules: List[AccessFlags]


class AccessOut(ORMModel):
    id: int
    module_id: int
    can_view: bool
    can_create: bool
    can_edit: bool
    can_delete: bool
    can_export: bool
    is_active: bool


@router.get("/modules", response_model=List[ModuleOut])
def list_modules(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(AppModule).where(AppModule.is_active.is_(True)).order_by(AppModule.sort_order, AppModule.id)
    if user.role != UserRole.SUPER_ADMIN:
        stmt = stmt.where(AppModule.super_only.is_(False))
    rows = db.execute(stmt).scalars().all()
    return [ModuleOut.model_validate(r) for r in rows]


@router.get("/org/{org_id}", response_model=List[AccessOut])
def get_org_access(org_id: int, _: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    rows = db.execute(
        select(OrgModuleAccess).where(OrgModuleAccess.organization_id == org_id)
    ).scalars().all()
    return [AccessOut.model_validate(r) for r in rows]


@router.put("/org")
def set_org_access(payload: OrgAccessBulk, _: User = Depends(require_super_admin), db: Session = Depends(get_db)):
    """Replace org module matrix (fast upsert)."""
    existing = {
        r.module_id: r
        for r in db.execute(
            select(OrgModuleAccess).where(OrgModuleAccess.organization_id == payload.organization_id)
        ).scalars().all()
    }
    keep = set()
    for m in payload.modules:
        keep.add(m.module_id)
        row = existing.get(m.module_id)
        if not row:
            row = OrgModuleAccess(organization_id=payload.organization_id, module_id=m.module_id)
            db.add(row)
        row.can_view = m.can_view
        row.can_create = m.can_create
        row.can_edit = m.can_edit
        row.can_delete = m.can_delete
        row.can_export = m.can_export
        row.is_active = m.is_active
    for mid, row in existing.items():
        if mid not in keep:
            db.delete(row)
    db.commit()
    return {"message": "Organization modules updated", "count": len(payload.modules)}


@router.get("/user/{user_id}", response_model=List[AccessOut])
def get_user_access(user_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != UserRole.SUPER_ADMIN and user.id != user_id:
        if user.role not in (UserRole.ORG_ADMIN, UserRole.MANAGER):
            raise HTTPException(status_code=403, detail="Forbidden")
    rows = db.execute(select(UserModuleAccess).where(UserModuleAccess.user_id == user_id)).scalars().all()
    return [AccessOut.model_validate(r) for r in rows]


@router.put("/user")
def set_user_access(payload: UserAccessBulk, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role not in (UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER):
        raise HTTPException(status_code=403, detail="Forbidden")
    existing = {
        r.module_id: r
        for r in db.execute(select(UserModuleAccess).where(UserModuleAccess.user_id == payload.user_id)).scalars().all()
    }
    keep = set()
    for m in payload.modules:
        keep.add(m.module_id)
        row = existing.get(m.module_id)
        if not row:
            row = UserModuleAccess(user_id=payload.user_id, module_id=m.module_id)
            db.add(row)
        row.organization_id = payload.organization_id
        row.can_view = m.can_view
        row.can_create = m.can_create
        row.can_edit = m.can_edit
        row.can_delete = m.can_delete
        row.can_export = m.can_export
        row.is_active = m.is_active
    for mid, row in existing.items():
        if mid not in keep:
            db.delete(row)
    db.commit()
    return {"message": "User modules updated", "count": len(payload.modules)}


@router.get("/my-access")
def my_access(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Fast nav resolver for logged-in user."""
    if user.role == UserRole.SUPER_ADMIN:
        mods = db.execute(
            select(AppModule).where(AppModule.is_active.is_(True)).order_by(AppModule.sort_order)
        ).scalars().all()
        return {
            "role": user.role.value,
            "modules": [
                {
                    "code": m.code,
                    "name": m.name,
                    "route_path": m.route_path,
                    "can_view": True,
                    "can_create": True,
                    "can_edit": True,
                    "can_delete": True,
                    "can_export": True,
                }
                for m in mods
            ],
        }

    # Prefer user overrides; else org defaults
    user_rows = db.execute(
        select(UserModuleAccess, AppModule)
        .join(AppModule, AppModule.id == UserModuleAccess.module_id)
        .where(UserModuleAccess.user_id == user.id, UserModuleAccess.is_active.is_(True), UserModuleAccess.can_view.is_(True))
    ).all()
    if user_rows:
        return {
            "role": user.role.value,
            "modules": [
                {
                    "code": m.code,
                    "name": m.name,
                    "route_path": m.route_path,
                    "can_view": a.can_view,
                    "can_create": a.can_create,
                    "can_edit": a.can_edit,
                    "can_delete": a.can_delete,
                    "can_export": a.can_export,
                }
                for a, m in user_rows
            ],
        }

    if not user.organization_id:
        return {"role": user.role.value, "modules": []}

    org_rows = db.execute(
        select(OrgModuleAccess, AppModule)
        .join(AppModule, AppModule.id == OrgModuleAccess.module_id)
        .where(
            OrgModuleAccess.organization_id == user.organization_id,
            OrgModuleAccess.is_active.is_(True),
            OrgModuleAccess.can_view.is_(True),
        )
        .order_by(AppModule.sort_order)
    ).all()
    return {
        "role": user.role.value,
        "modules": [
            {
                "code": m.code,
                "name": m.name,
                "route_path": m.route_path,
                "can_view": a.can_view,
                "can_create": a.can_create,
                "can_edit": a.can_edit,
                "can_delete": a.can_delete,
                "can_export": a.can_export,
            }
            for a, m in org_rows
        ],
    }
