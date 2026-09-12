"""FastAPI dependencies - auth, tenant context, DB session."""

from typing import Generator, Optional

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.database import SessionLocal
from app.models.user import User, UserRole

security = HTTPBearer(auto_error=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")
    user = db.get(User, int(user_id))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User inactive or missing")
    return user


def require_super_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin only")
    return user


def require_org_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in (UserRole.SUPER_ADMIN, UserRole.ORG_ADMIN, UserRole.MANAGER):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


def require_staff(user: User = Depends(get_current_user)) -> User:
    if user.role not in (
        UserRole.SUPER_ADMIN,
        UserRole.ORG_ADMIN,
        UserRole.MANAGER,
        UserRole.CASHIER,
        UserRole.STAFF,
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff access required")
    return user


def resolve_organization_id(
    user: User = Depends(get_current_user),
    x_organization_id: Optional[int] = Header(None, alias="X-Organization-Id"),
) -> Optional[int]:
    """
    Tenant resolution:
    - Super admin may pass X-Organization-Id to act on any tenant
    - Other users are scoped to their own organization_id
    """
    if user.role == UserRole.SUPER_ADMIN:
        return x_organization_id
    return user.organization_id
