from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Order, User, UserRole
from app.schemas.order import OrderCreate, OrderResponse, OrderUpdate
from app.services.crud import create_order, crud, update_order
from app.services.dependencies import require_roles

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=list[OrderResponse])
def list_orders(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.manager, UserRole.operator, UserRole.analyst)),
):
    return crud.list(db, Order)


@router.post("", response_model=OrderResponse)
def add_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.manager, UserRole.operator)),
):
    return create_order(db, payload)


@router.put("/{order_id}", response_model=OrderResponse)
def edit_order(
    order_id: int,
    payload: OrderUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.manager, UserRole.operator)),
):
    order = crud.get(db, Order, order_id)
    return update_order(db, order, payload)


@router.delete("/{order_id}")
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    return crud.delete(db, Order, order_id)
