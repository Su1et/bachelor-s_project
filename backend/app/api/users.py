from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import User, UserRole
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services.crud import create_user, crud, update_user
from app.services.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    return crud.list(db, User)


@router.post("", response_model=UserResponse)
def add_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    return create_user(db, payload)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return crud.get(db, User, user_id)


@router.put("/{user_id}", response_model=UserResponse)
def edit_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    user = crud.get(db, User, user_id)
    return update_user(db, user, payload)


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    return crud.delete(db, User, user_id)
