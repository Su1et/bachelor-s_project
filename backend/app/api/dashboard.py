from sqlalchemy import func
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Inventory, InventoryMovement, MovementType, Order, OrderStatus, Product, Supplier, User, UserRole, Warehouse
from app.services.dependencies import require_roles

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.manager, UserRole.operator, UserRole.analyst, UserRole.warehouse)),
):
    inventory_units = db.query(func.coalesce(func.sum(Inventory.quantity), 0)).scalar() or 0
    order_revenue = db.query(func.coalesce(func.sum(Order.total_amount), 0.0)).scalar() or 0.0
    low_stock = (
        db.query(Product)
        .outerjoin(Inventory, Product.id == Inventory.product_id)
        .group_by(Product.id)
        .having(func.coalesce(func.sum(Inventory.quantity), 0) <= Product.min_stock_level)
        .count()
    )
    active_orders = db.query(Order).filter(Order.status.in_([OrderStatus.approved, OrderStatus.in_progress])).count()
    avg_transfer_time = db.query(func.avg(InventoryMovement.estimated_minutes)).filter(InventoryMovement.estimated_minutes.isnot(None)).scalar()

    categories = db.query(Product.category, func.count(Product.id)).group_by(Product.category).all()
    stock_by_warehouse = (
        db.query(Warehouse.name, func.coalesce(func.sum(Inventory.quantity), 0))
        .outerjoin(Inventory, Warehouse.id == Inventory.warehouse_id)
        .filter(Warehouse.status == "active")
        .group_by(Warehouse.id)
        .all()
    )
    orders_by_status = db.query(Order.status, func.count(Order.id)).group_by(Order.status).all()
    movements_by_type = db.query(InventoryMovement.movement_type, func.count(InventoryMovement.id)).group_by(InventoryMovement.movement_type).all()
    low_stock_items = (
        db.query(Product.name, Product.min_stock_level, func.coalesce(func.sum(Inventory.quantity), 0).label("quantity"))
        .outerjoin(Inventory, Product.id == Inventory.product_id)
        .group_by(Product.id)
        .having(func.coalesce(func.sum(Inventory.quantity), 0) <= Product.min_stock_level)
        .all()
    )

    return {
        "products": db.query(Product).count(),
        "suppliers": db.query(Supplier).count(),
        "warehouses": db.query(Warehouse).count(),
        "orders": db.query(Order).count(),
        "active_orders": active_orders,
        "inventory_units": inventory_units,
        "order_revenue": round(order_revenue, 2),
        "low_stock_products": low_stock,
        "movements": db.query(InventoryMovement).count(),
        "avg_transfer_minutes": int(avg_transfer_time or 0),
        "charts": {
            "products_by_category": [{"label": c or "Без категорії", "value": n} for c, n in categories],
            "stock_by_warehouse": [{"label": name, "value": qty or 0} for name, qty in stock_by_warehouse],
            "orders_by_status": [{"label": str(status.value if hasattr(status, 'value') else status), "value": n} for status, n in orders_by_status],
            "movements_by_type": [{"label": str(mt.value if hasattr(mt, 'value') else mt), "value": n} for mt, n in movements_by_type],
        },
        "low_stock_items": [{"name": name, "min_stock_level": min_level, "quantity": quantity or 0} for name, min_level, quantity in low_stock_items],
    }
