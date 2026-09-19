from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, get_db
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    LanguageUpdateRequest,
    LoginRequest,
    LoginResponse,
    TokenResponse,
    UserOut,
)

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    try:
        identity = payload.identity()
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    user = db.execute(
        select(User).where(
            User.is_deleted.is_(False),
            or_(User.email == identity, User.username == identity),
        )
    ).scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    extra = {"role": user.role.value, "org_id": user.organization_id}
    tokens = TokenResponse(
        access_token=create_access_token(str(user.id), extra=extra),
        refresh_token=create_refresh_token(str(user.id), extra=extra),
    )
    return LoginResponse(tokens=tokens, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)


ALLOWED_LANGUAGES = {"en", "de"}


@router.patch("/language", response_model=UserOut)
def update_language(payload: LanguageUpdateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.language not in ALLOWED_LANGUAGES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unsupported language")
    user.language = payload.language
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password incorrect")
    user.hashed_password = hash_password(payload.new_password)
    db.add(user)
    db.commit()
    return {"message": "Password updated"}
