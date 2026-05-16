from pydantic import BaseModel, EmailStr

from app.models.models import UserRole
from app.schemas.common import TimestampResponse


class UserBase(BaseModel):
    full_name: str
    email: EmailStr
    role: UserRole
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    password: str | None = None


class UserResponse(UserBase, TimestampResponse):
    pass
