from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Supplier, User, UserRole
from app.schemas.supplier import SupplierCreate, SupplierResponse, SupplierUpdate
from app.services.crud import create_simple, crud, update_simple
from app.services.dependencies import require_roles

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("", response_model=list[SupplierResponse])
def list_suppliers(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.manager, UserRole.operator)),
):
    return crud.list(db, Supplier)


@router.post("", response_model=SupplierResponse)
def add_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    return create_simple(db, Supplier, payload)


@router.put("/{supplier_id}", response_model=SupplierResponse)
def edit_supplier(
    supplier_id: int,
    payload: SupplierUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    supplier = crud.get(db, Supplier, supplier_id)
    return update_simple(db, supplier, payload)


@router.delete("/{supplier_id}")
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    return crud.delete(db, Supplier, supplier_id)
