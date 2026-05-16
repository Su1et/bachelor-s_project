from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, Enum as SqlEnum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class UserRole(str, Enum):
    admin = "admin"
    manager = "manager"
    operator = "operator"
    warehouse = "warehouse"
    analyst = "analyst"


class OrderStatus(str, Enum):
    draft = "draft"
    approved = "approved"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"


class MovementType(str, Enum):
    in_ = "in"
    out = "out"
    transfer = "transfer"
    return_ = "return"


class MovementStatus(str, Enum):
    planned = "planned"
    in_transit = "in_transit"
    completed = "completed"
    cancelled = "cancelled"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SqlEnum(UserRole), default=UserRole.operator, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Supplier(Base, TimestampMixin):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    contact_person: Mapped[str] = mapped_column(String(120), nullable=True)
    email: Mapped[str] = mapped_column(String(150), nullable=True)
    phone: Mapped[str] = mapped_column(String(50), nullable=True)
    address: Mapped[str] = mapped_column(String(255), nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)

    products: Mapped[list["Product"]] = relationship("Product", back_populates="supplier")


class Warehouse(Base, TimestampMixin):
    __tablename__ = "warehouses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    manager_name: Mapped[str] = mapped_column(String(120), nullable=True)
    capacity: Mapped[int] = mapped_column(Integer, default=0)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(40), default="active")
    notes: Mapped[str] = mapped_column(Text, nullable=True)

    inventories: Mapped[list["Inventory"]] = relationship("Inventory", back_populates="warehouse")
    movements_from: Mapped[list["InventoryMovement"]] = relationship(
        "InventoryMovement", foreign_keys="InventoryMovement.source_warehouse_id", back_populates="source_warehouse"
    )
    movements_to: Mapped[list["InventoryMovement"]] = relationship(
        "InventoryMovement", foreign_keys="InventoryMovement.destination_warehouse_id", back_populates="destination_warehouse"
    )


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    sku: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    category: Mapped[str] = mapped_column(String(120), nullable=False)
    unit: Mapped[str] = mapped_column(String(30), default="шт.")
    price: Mapped[float] = mapped_column(Float, default=0)
    min_stock_level: Mapped[int] = mapped_column(Integer, default=0)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id"), nullable=True)

    supplier: Mapped[Supplier | None] = relationship("Supplier", back_populates="products")
    inventories: Mapped[list["Inventory"]] = relationship("Inventory", back_populates="product")
    order_items: Mapped[list["OrderItem"]] = relationship("OrderItem", back_populates="product")
    movements: Mapped[list["InventoryMovement"]] = relationship("InventoryMovement", back_populates="product")


class Inventory(Base, TimestampMixin):
    __tablename__ = "inventories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    warehouse_id: Mapped[int] = mapped_column(ForeignKey("warehouses.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=0)

    product: Mapped[Product] = relationship("Product", back_populates="inventories")
    warehouse: Mapped[Warehouse] = relationship("Warehouse", back_populates="inventories")


class Order(Base, TimestampMixin):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    order_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    customer_name: Mapped[str] = mapped_column(String(150), nullable=False)
    status: Mapped[OrderStatus] = mapped_column(SqlEnum(OrderStatus), default=OrderStatus.draft)
    total_amount: Mapped[float] = mapped_column(Float, default=0)
    assigned_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)

    items: Mapped[list["OrderItem"]] = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    assigned_user: Mapped[User | None] = relationship("User")


class OrderItem(Base, TimestampMixin):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)

    order: Mapped[Order] = relationship("Order", back_populates="items")
    product: Mapped[Product] = relationship("Product", back_populates="order_items")


class InventoryMovement(Base, TimestampMixin):
    __tablename__ = "inventory_movements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), nullable=False)
    movement_type: Mapped[MovementType] = mapped_column(SqlEnum(MovementType), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    source_warehouse_id: Mapped[int | None] = mapped_column(ForeignKey("warehouses.id"), nullable=True)
    destination_warehouse_id: Mapped[int | None] = mapped_column(ForeignKey("warehouses.id"), nullable=True)
    distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    estimated_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[MovementStatus] = mapped_column(SqlEnum(MovementStatus), default=MovementStatus.completed)
    comment: Mapped[str] = mapped_column(Text, nullable=True)

    product: Mapped[Product] = relationship("Product", back_populates="movements")
    source_warehouse: Mapped[Warehouse | None] = relationship(
        "Warehouse", foreign_keys=[source_warehouse_id], back_populates="movements_from"
    )
    destination_warehouse: Mapped[Warehouse | None] = relationship(
        "Warehouse", foreign_keys=[destination_warehouse_id], back_populates="movements_to"
    )
