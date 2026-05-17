from pydantic import BaseModel

from app.models.models import OrderStatus
from app.schemas.common import TimestampResponse
from app.schemas.product import ProductResponse
from app.schemas.user import UserResponse


class OrderItemBase(BaseModel):
    product_id: int
    quantity: int
    unit_price: float


class OrderItemCreate(OrderItemBase):
    pass


class OrderItemResponse(OrderItemBase, TimestampResponse):
    product: ProductResponse


class OrderBase(BaseModel):
    order_number: str
    customer_name: str
    status: OrderStatus = OrderStatus.draft
    assigned_user_id: int | None = None
    notes: str | None = None


class OrderCreate(BaseModel):
    order_number: str
    customer_name: str
    status: OrderStatus
    assigned_user_id: int | None = None
    notes: str | None = None
    items: list[OrderItemCreate]
    customer_location: str | None = None
    customer_capacity: int | None = 0
    customer_manager_name: str | None = None
    customer_latitude: float | None = None
    customer_longitude: float | None = None


class OrderUpdate(BaseModel):
    customer_name: str | None = None
    status: OrderStatus | None = None
    assigned_user_id: int | None = None
    notes: str | None = None
    items: list[OrderItemCreate] | None = None


class OrderResponse(OrderBase, TimestampResponse):
    total_amount: float
    items: list[OrderItemResponse]
    assigned_user: UserResponse | None = None
