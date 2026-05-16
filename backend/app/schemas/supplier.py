from pydantic import BaseModel, EmailStr

from app.schemas.common import TimestampResponse


class SupplierBase(BaseModel):
    name: str
    contact_person: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    notes: str | None = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: str | None = None
    contact_person: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    notes: str | None = None


class SupplierResponse(SupplierBase, TimestampResponse):
    pass
