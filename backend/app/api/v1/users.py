from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db, require_org_admin
from app.core.security import hash_password
from app.models.user import User, UserRole
from app.schemas.common import Page
from app.schemas.user import UserCreate, UserOut, UserUpdate
from app.utils.pagination import page_response, paginate

router = APIRouter()


def _target_org(user: User, requested_org: Optional[int]) -> Optional[int]:
    if user.role == UserRole.SUPER_ADMIN:
        return requested_org
    return user.organization_id


@router.get("", response_model=Page[UserOut])
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    organization_id: Optional[int] = None,
    role: Optional[UserRole] = None,
    q: Optional[str] = None,
    user: User = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    org_id = _target_org(user, organization_id)
    stmt = select(User).where(User.is_deleted.is_(False))
    if user.role != UserRole.SUPER_ADMIN:
        stmt = stmt.where(User.organization_id == user.organization_id)
    elif org_id:
        stmt = stmt.where(User.organization_id == org_id)
    if role:
        stmt = stmt.where(User.role == role)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            (User.full_name.ilike(like)) | (User.email.ilike(like)) | (User.username.ilike(like))
        )
    stmt = stmt.order_by(User.id.desc())
    rows, meta = paginate(db, stmt, page, page_size)
    return page_response([UserOut.model_validate(r) for r in rows], meta)


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    user: User = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    if user.role != UserRole.SUPER_ADMIN:
        if payload.role == UserRole.SUPER_ADMIN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create super admin")
        org_id = user.organization_id
    else:
        org_id = payload.organization_id
        if payload.role != UserRole.SUPER_ADMIN and not org_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="organization_id required for non super-admin users",
            )

    exists = db.execute(select(User.id).where(User.email == payload.email)).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    new_user = User(
        organization_id=org_id,
        email=payload.email,
        username=payload.username,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        phone=payload.phone,
        role=payload.role,
        pin_code=payload.pin_code,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return UserOut.model_validate(new_user)


@router.patch("/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    payload: UserUpdate,
    user: User = Depends(require_org_admin),
    db: Session = Depends(get_db),
):
    target = db.get(User, user_id)
    if not target or target.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.role != UserRole.SUPER_ADMIN and target.organization_id != user.organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    data = payload.model_dump(exclude_unset=True)
    if "password" in data and data["password"]:
        target.hashed_password = hash_password(data.pop("password"))
    else:
        data.pop("password", None)
    for k, v in data.items():
        setattr(target, k, v)
    db.commit()
    db.refresh(target)
    return UserOut.model_validate(target)
