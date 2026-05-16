from pydantic import BaseModel

from app.schemas.common import TimestampResponse


class WarehouseBase(BaseModel):
    name: str
    location: str
    manager_name: str | None = None
    capacity: int = 0
    latitude: float | None = None
    longitude: float | None = None
    status: str = "active"
    notes: str | None = None


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseUpdate(BaseModel):
    name: str | None = None
    location: str | None = None
    manager_name: str | None = None
    capacity: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    status: str | None = None
    notes: str | None = None


class WarehouseResponse(WarehouseBase, TimestampResponse):
    pass
