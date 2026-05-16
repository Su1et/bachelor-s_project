from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.db.database import get_db
from app.models.models import User
from app.schemas.auth import LoginRequest, Token
from app.services.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Невірний email або пароль")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Користувача деактивовано")
    return Token(access_token=create_access_token(user.id))


@router.post("/login-form", response_model=Token)
def login_form(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Невірний email або пароль")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Користувача деактивовано")
    return Token(access_token=create_access_token(user.id))


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return current_user
