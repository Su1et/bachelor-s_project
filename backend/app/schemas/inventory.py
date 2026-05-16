from pydantic import BaseModel

from app.models.models import MovementStatus, MovementType
from app.schemas.common import TimestampResponse
from app.schemas.product import ProductResponse
from app.schemas.warehouse import WarehouseResponse


class InventoryBase(BaseModel):
    product_id: int
    warehouse_id: int
    quantity: int = 0


class InventoryCreate(InventoryBase):
    pass


class InventoryUpdate(BaseModel):
    quantity: int | None = None


class InventoryResponse(InventoryBase, TimestampResponse):
    product: ProductResponse
    warehouse: WarehouseResponse


class InventoryMovementCreate(BaseModel):
    product_id: int
    movement_type: MovementType
    quantity: int
    source_warehouse_id: int | None = None
    destination_warehouse_id: int | None = None
    status: MovementStatus = MovementStatus.completed
    comment: str | None = None


class InventoryMovementResponse(InventoryMovementCreate, TimestampResponse):
    distance_km: float | None = None
    estimated_minutes: int | None = None
    product: ProductResponse
    source_warehouse: WarehouseResponse | None = None
    destination_warehouse: WarehouseResponse | None = None
    

class InventoryMovementUpdate(BaseModel):
    movement_type: MovementType | None = None
    quantity: int | None = None
    source_warehouse_id: int | None = None
    destination_warehouse_id: int | None = None
    status: MovementStatus | None = None
    comment: str | None = None
