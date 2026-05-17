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
    latitude: float | None = None
    longitude: float | None = None
    capacity: int | None = 1000
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
