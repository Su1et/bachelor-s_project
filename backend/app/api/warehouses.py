from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import User, UserRole, Warehouse
from app.schemas.warehouse import WarehouseCreate, WarehouseResponse, WarehouseUpdate
from app.services.crud import create_simple, crud, update_simple
from app.services.dependencies import require_roles

router = APIRouter(prefix="/warehouses", tags=["warehouses"])


@router.get("", response_model=list[WarehouseResponse])
def list_warehouses(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.manager, UserRole.warehouse, UserRole.operator, UserRole.analyst)),
):
    return crud.list(db, Warehouse)


@router.post("", response_model=WarehouseResponse)
def add_warehouse(
    payload: WarehouseCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    return create_simple(db, Warehouse, payload)


@router.put("/{warehouse_id}", response_model=WarehouseResponse)
def edit_warehouse(
    warehouse_id: int,
    payload: WarehouseUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    warehouse = crud.get(db, Warehouse, warehouse_id)
    return update_simple(db, warehouse, payload)


@router.delete("/{warehouse_id}")
def delete_warehouse(
    warehouse_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    return crud.delete(db, Warehouse, warehouse_id)
