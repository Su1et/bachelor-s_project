from math import asin, cos, radians, sin, sqrt

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.models import Inventory, InventoryMovement, MovementType, MovementStatus, Order, OrderItem, Product, User, Supplier, Warehouse


class CRUDService:
    @staticmethod
    def list(db: Session, model):
        return db.query(model).order_by(model.id.desc()).all()

    @staticmethod
    def get(db: Session, model, object_id: int):
        obj = db.query(model).filter(model.id == object_id).first()
        if not obj:
            raise HTTPException(status_code=404, detail=f"{model.__name__} не знайдено")
        return obj

    @staticmethod
    def delete(db: Session, model, object_id: int):
        obj = CRUDService.get(db, model, object_id)
        db.delete(obj)
        db.commit()
        return {"message": "Запис видалено успішно"}


crud = CRUDService()


def create_user(db: Session, payload):
    user = User(
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        is_active=payload.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user: User, payload):
    data = payload.model_dump(exclude_unset=True)
    if "password" in data and data["password"]:
        user.hashed_password = get_password_hash(data.pop("password"))
    elif "password" in data:
        data.pop("password")
    for key, value in data.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


def create_simple(db: Session, model, payload):
    obj = model(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def update_simple(db: Session, obj, payload):
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def create_order(db: Session, payload):
    order = Order(
        order_number=payload.order_number,
        customer_name=payload.customer_name,
        status=payload.status,
        assigned_user_id=payload.assigned_user_id,
        notes=payload.notes,
    )
    db.add(order)
    db.flush()
    total = 0.0
    for item in payload.items:
        order_item = OrderItem(order_id=order.id, **item.model_dump())
        total += item.quantity * item.unit_price
        db.add(order_item)
    order.total_amount = total
    warehouse_name = f"Склад {payload.customer_name}"
    existing_warehouse = db.query(Warehouse).filter(Warehouse.name == warehouse_name).first()
    if not existing_warehouse and payload.customer_location:
        new_warehouse = Warehouse(
            name=warehouse_name,
            location=payload.customer_location,
            manager_name=payload.customer_manager_name or "Не призначено",
            capacity=payload.customer_capacity or 1000,
            latitude=payload.customer_latitude,
            longitude=payload.customer_longitude,
            status="active",
            type="client",
            notes=f"Автоматично згенеровано системою на основі замовлення № {payload.order_number}"
        )
        db.add(new_warehouse)
    db.commit()
    db.refresh(order)
    return order


def update_order(db: Session, order: Order, payload):
    data = payload.model_dump(exclude_unset=True)
    items = data.pop("items", None)
    for key, value in data.items():
        setattr(order, key, value)
    if items is not None:
        db.query(OrderItem).filter(OrderItem.order_id == order.id).delete()
        total = 0.0
        for item in items:
            order_item = OrderItem(order_id=order.id, **item)
            total += item["quantity"] * item["unit_price"]
            db.add(order_item)
        order.total_amount = total
    db.commit()
    db.refresh(order)
    return order


def create_inventory(db: Session, payload):
    existing = db.query(Inventory).filter(
        Inventory.product_id == payload.product_id,
        Inventory.warehouse_id == payload.warehouse_id,
    ).first()
    if existing:
        existing.quantity = payload.quantity
        db.commit()
        db.refresh(existing)
        return existing
    inventory = Inventory(**payload.model_dump())
    db.add(inventory)
    db.commit()
    db.refresh(inventory)
    return inventory


def _haversine_km(source: Warehouse | None, destination: Warehouse | None) -> float | None:
    if not source or not destination:
        return None
    if None in (source.latitude, source.longitude, destination.latitude, destination.longitude):
        return None
    lat1, lon1, lat2, lon2 = map(radians, [source.latitude, source.longitude, destination.latitude, destination.longitude])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * asin(sqrt(a))
    return round(6371 * c, 1)


def _estimated_minutes(distance_km: float | None) -> int | None:
    if distance_km is None:
        return None
    # Умовний розрахунок для дипломного проєкту: середня швидкість логістичного переміщення 45 км/год + 25 хв на завантаження/розвантаження.
    return int(round((distance_km / 45) * 60 + 25))


def _adjust_inventory(db: Session, product_id: int, warehouse_id: int, quantity_change: int):
    """Допоміжна функція для безпечної зміни кількості товару на конкретному складі"""
    if not warehouse_id or quantity_change == 0:
        return
        
    inv = db.query(Inventory).filter(
        Inventory.product_id == product_id,
        Inventory.warehouse_id == warehouse_id
    ).first()
    
    # Якщо запису ще немає
    if not inv:
        if quantity_change < 0:
            raise HTTPException(status_code=400, detail="Недостатній залишок на складі для списання")
        inv = Inventory(product_id=product_id, warehouse_id=warehouse_id, quantity=0)
        db.add(inv)
        
    # Перевірка на від'ємні залишки
    if inv.quantity + quantity_change < 0:
        raise HTTPException(status_code=400, detail="Недостатній залишок на складі для списання")
        
    inv.quantity += quantity_change
    db.flush()


def _apply_inventory_logic(db: Session, movement: InventoryMovement, old_status: MovementStatus | None, new_status: MovementStatus):
    """Ядро бізнес-логіки: обробка переходів між статусами"""
    if old_status == new_status:
        return

    is_out = movement.movement_type in (MovementType.out, MovementType.transfer)
    is_in = movement.movement_type in (MovementType.in_, MovementType.return_, MovementType.transfer)

    if old_status == MovementStatus.in_transit:
        if is_out:
            _adjust_inventory(db, movement.product_id, movement.source_warehouse_id, movement.quantity)
    elif old_status == MovementStatus.completed:
        if is_out:
            _adjust_inventory(db, movement.product_id, movement.source_warehouse_id, movement.quantity)
        if is_in:
            _adjust_inventory(db, movement.product_id, movement.destination_warehouse_id, -movement.quantity)

    if new_status == MovementStatus.in_transit:
        if is_out:
            _adjust_inventory(db, movement.product_id, movement.source_warehouse_id, -movement.quantity)
    elif new_status == MovementStatus.completed:
        if is_out:
            _adjust_inventory(db, movement.product_id, movement.source_warehouse_id, -movement.quantity)
        if is_in:
            _adjust_inventory(db, movement.product_id, movement.destination_warehouse_id, movement.quantity)


def create_movement(db: Session, payload):
    product = crud.get(db, Product, payload.product_id)
    _ = product
    
    source = db.query(Warehouse).filter(Warehouse.id == payload.source_warehouse_id).first() if payload.source_warehouse_id else None
    destination = db.query(Warehouse).filter(Warehouse.id == payload.destination_warehouse_id).first() if payload.destination_warehouse_id else None

    if payload.movement_type in (MovementType.in_, MovementType.return_) and not destination:
        raise HTTPException(status_code=400, detail="Для надходження або повернення потрібно вказати склад-отримувач")
    if payload.movement_type == MovementType.out and not source:
        raise HTTPException(status_code=400, detail="Для списання потрібно вказати склад-відправник")
    if payload.movement_type == MovementType.transfer and (not source or not destination):
        raise HTTPException(status_code=400, detail="Для переміщення потрібно вказати склад-відправник і склад-отримувач")

    distance_km = _haversine_km(source, destination)
    estimated_minutes = _estimated_minutes(distance_km)
    
    movement = InventoryMovement(**payload.model_dump(), distance_km=distance_km, estimated_minutes=estimated_minutes)
    db.add(movement)
    db.flush()

    _apply_inventory_logic(db, movement, None, movement.status)

    db.commit()
    db.refresh(movement)
    return movement


def update_movement(db: Session, movement: InventoryMovement, payload):
    old_status = movement.status
    data = payload.model_dump(exclude_unset=True)
    new_status = data.get("status", old_status)

    for key, value in data.items():
        setattr(movement, key, value)
        
    if old_status != new_status:
        _apply_inventory_logic(db, movement, old_status, new_status)
        
    db.commit()
    db.refresh(movement)
    return movement

def create_supplier(db: Session, payload):
    data = payload.model_dump()
    latitude = data.pop("latitude", None)
    longitude = data.pop("longitude", None)
    capacity = data.pop("capacity", 1000)
    
    supplier = Supplier(**data)
    db.add(supplier)
    db.flush()
    
    warehouse_name = f"Склад {supplier.name}"
    existing_warehouse = db.query(Warehouse).filter(Warehouse.name == warehouse_name).first()
    
    if not existing_warehouse and supplier.address:
        new_warehouse = Warehouse(
            name=warehouse_name,
            location=supplier.address,
            manager_name=supplier.contact_person or "Не призначено",
            capacity=capacity or 1000,
            latitude=latitude,
            longitude=longitude,
            status="active",
            type="supplier",
            notes=f"Автоматично згенеровано при додаванні постачальника {supplier.name}"
        )
        db.add(new_warehouse)

    db.commit()
    db.refresh(supplier)
    return supplier

def update_supplier(db: Session, supplier: Supplier, payload):
    data = payload.model_dump(exclude_unset=True)
    
    data.pop("address", None)
    data.pop("capacity", None)
    data.pop("latitude", None)
    data.pop("longitude", None)
    
    old_contact = supplier.contact_person
    new_contact = data.get("contact_person", old_contact)
    
    for key, value in data.items():
        setattr(supplier, key, value)
        
    if old_contact != new_contact:
        warehouse_name = f"Склад {supplier.name}"
        warehouse = db.query(Warehouse).filter(
            Warehouse.name == warehouse_name,
            Warehouse.type == "supplier"
        ).first()
        
        if warehouse:
            warehouse.manager_name = new_contact or "Не призначено"
            
    db.commit()
    db.refresh(supplier)
    return supplier