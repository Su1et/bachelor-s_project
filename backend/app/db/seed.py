from app.core.security import get_password_hash
from app.db.database import Base, SessionLocal, engine
from app.models.models import Inventory, InventoryMovement, MovementStatus, MovementType, Order, OrderItem, OrderStatus, Product, Supplier, User, UserRole, Warehouse
from app.services.crud import create_movement
from app.schemas.inventory import InventoryMovementCreate


def seed():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        users = [
            User(full_name="Admin User", email="admin@ops.com", hashed_password=get_password_hash("admin123"), role=UserRole.admin),
            User(full_name="Operations Manager", email="manager@ops.com", hashed_password=get_password_hash("manager123"), role=UserRole.manager),
            User(full_name="Warehouse Specialist", email="warehouse@ops.com", hashed_password=get_password_hash("warehouse123"), role=UserRole.warehouse),
            User(full_name="CEO / Analyst", email="analyst@ops.com", hashed_password=get_password_hash("analyst123"), role=UserRole.analyst),
        ]
        db.add_all(users)
        db.flush()

        suppliers = [
            Supplier(name="ТОВ БудМаркет Постач", contact_person="Іван Бойко", email="supply1@example.com", phone="+380501112233", address="Київ", notes="Будівельні матеріали та сухі суміші"),
            Supplier(name="ТОВ Логістик Трейд", contact_person="Олена Петренко", email="supply2@example.com", phone="+380671112233", address="Бровари", notes="Фарби, інструменти, супутні товари"),
            Supplier(name="ТОВ Склад-Сервіс", contact_person="Дмитро Савчук", email="supply3@example.com", phone="+380631112233", address="Львів", notes="Складське обладнання та пакування"),
        ]
        db.add_all(suppliers)
        db.flush()

        warehouses = [
            Warehouse(name="Центральний склад Київ", location="Київ, вул. Берковецька, 6", manager_name="Сергій Коваль", capacity=7000, latitude=50.4896, longitude=30.3550, status="active", notes="Основний розподільчий склад"),
            Warehouse(name="Склад Бровари", location="Бровари, вул. Київська, 316", manager_name="Марина Гончар", capacity=3500, latitude=50.5111, longitude=30.7909, status="active", notes="Східний логістичний вузол"),
            Warehouse(name="Склад Львів", location="Львів, вул. Городоцька, 359", manager_name="Андрій Мельник", capacity=4200, latitude=49.8420, longitude=23.9156, status="active", notes="Західний логістичний вузол"),
        ]
        db.add_all(warehouses)
        db.flush()

        products = [
            Product(sku="LOG-001", name="Ламінат дубовий", category="Покриття", unit="уп.", price=850, min_stock_level=20, supplier_id=suppliers[0].id),
            Product(sku="LOG-002", name="Фарба інтер'єрна", category="Фарби", unit="шт.", price=520, min_stock_level=15, supplier_id=suppliers[1].id),
            Product(sku="LOG-003", name="Цемент М500", category="Будматеріали", unit="міш.", price=210, min_stock_level=50, supplier_id=suppliers[0].id),
            Product(sku="LOG-004", name="Стелаж металевий", category="Складське обладнання", unit="шт.", price=3200, min_stock_level=5, supplier_id=suppliers[2].id),
            Product(sku="LOG-005", name="Пакувальна плівка", category="Пакування", unit="рул.", price=390, min_stock_level=30, supplier_id=suppliers[2].id),
        ]
        db.add_all(products)
        db.flush()

        inventory = [
            Inventory(product_id=products[0].id, warehouse_id=warehouses[0].id, quantity=42),
            Inventory(product_id=products[1].id, warehouse_id=warehouses[0].id, quantity=11),
            Inventory(product_id=products[2].id, warehouse_id=warehouses[1].id, quantity=130),
            Inventory(product_id=products[3].id, warehouse_id=warehouses[2].id, quantity=4),
            Inventory(product_id=products[4].id, warehouse_id=warehouses[1].id, quantity=65),
        ]
        db.add_all(inventory)
        db.flush()

        orders = [
            Order(order_number="ORD-2026-001", customer_name="ТОВ РемБуд", status=OrderStatus.approved, assigned_user_id=users[1].id, total_amount=2420, notes="Термінова комплектація"),
            Order(order_number="ORD-2026-002", customer_name="ПП Майстер Дім", status=OrderStatus.in_progress, assigned_user_id=users[1].id, total_amount=6400, notes="Доставка зі складу Львів"),
            Order(order_number="ORD-2026-003", customer_name="ТОВ Комфорт Плюс", status=OrderStatus.completed, assigned_user_id=users[1].id, total_amount=1560, notes="Виконано"),
        ]
        db.add_all(orders)
        db.flush()
        db.add_all([
            OrderItem(order_id=orders[0].id, product_id=products[0].id, quantity=2, unit_price=850),
            OrderItem(order_id=orders[0].id, product_id=products[1].id, quantity=1, unit_price=520),
            OrderItem(order_id=orders[0].id, product_id=products[2].id, quantity=1, unit_price=200),
            OrderItem(order_id=orders[1].id, product_id=products[3].id, quantity=2, unit_price=3200),
            OrderItem(order_id=orders[2].id, product_id=products[4].id, quantity=4, unit_price=390),
        ])
        db.commit()

        create_movement(db, InventoryMovementCreate(product_id=products[4].id, movement_type=MovementType.transfer, quantity=10, source_warehouse_id=warehouses[1].id, destination_warehouse_id=warehouses[0].id, status=MovementStatus.completed, comment="Поповнення центрального складу"))
        create_movement(db, InventoryMovementCreate(product_id=products[2].id, movement_type=MovementType.in_, quantity=40, destination_warehouse_id=warehouses[1].id, status=MovementStatus.completed, comment="Поставка від постачальника"))
        create_movement(db, InventoryMovementCreate(product_id=products[0].id, movement_type=MovementType.transfer, quantity=6, source_warehouse_id=warehouses[0].id, destination_warehouse_id=warehouses[2].id, status=MovementStatus.in_transit, comment="Міжскладське переміщення"))
        print("Seed data created successfully")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
