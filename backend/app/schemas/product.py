from pydantic import BaseModel

from app.schemas.common import TimestampResponse
from app.schemas.supplier import SupplierResponse


class ProductBase(BaseModel):
    sku: str
    name: str
    category: str
    unit: str = "шт."
    price: float = 0
    min_stock_level: int = 0
    description: str | None = None
    supplier_id: int | None = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    sku: str | None = None
    name: str | None = None
    category: str | None = None
    unit: str | None = None
    price: float | None = None
    min_stock_level: int | None = None
    description: str | None = None
    supplier_id: int | None = None


class ProductResponse(ProductBase, TimestampResponse):
    supplier: SupplierResponse | None = None
