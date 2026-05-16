from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Inventory, InventoryMovement, User, UserRole
from app.schemas.inventory import (
    InventoryCreate,
    InventoryMovementCreate,
    InventoryMovementResponse,
    InventoryResponse,
    InventoryUpdate,
)
from app.services.crud import create_inventory, create_movement, crud, update_simple
from app.services.dependencies import require_roles

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("", response_model=list[InventoryResponse])
def list_inventory(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.manager, UserRole.warehouse, UserRole.analyst)),
):
    return crud.list(db, Inventory)


@router.post("", response_model=InventoryResponse)
def add_inventory(
    payload: InventoryCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.manager, UserRole.warehouse)),
):
    return create_inventory(db, payload)


@router.put("/{inventory_id}", response_model=InventoryResponse)
def edit_inventory(
    inventory_id: int,
    payload: InventoryUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.manager, UserRole.warehouse)),
):
    inventory = crud.get(db, Inventory, inventory_id)
    return update_simple(db, inventory, payload)


@router.delete("/{inventory_id}")
def delete_inventory(
    inventory_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    return crud.delete(db, Inventory, inventory_id)


@router.get("/movements", response_model=list[InventoryMovementResponse])
def list_movements(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.manager, UserRole.warehouse, UserRole.analyst)),
):
    return crud.list(db, InventoryMovement)


@router.post("/movements", response_model=InventoryMovementResponse)
def add_movement(
    payload: InventoryMovementCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.manager, UserRole.warehouse)),
):
    return create_movement(db, payload)
