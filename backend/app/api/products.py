from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Product, User, UserRole
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.services.crud import create_simple, crud, update_simple
from app.services.dependencies import require_roles

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductResponse])
def list_products(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.manager, UserRole.operator, UserRole.warehouse, UserRole.analyst)),
):
    return crud.list(db, Product)


@router.post("", response_model=ProductResponse)
def add_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    return create_simple(db, Product, payload)


@router.put("/{product_id}", response_model=ProductResponse)
def edit_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
):
    product = crud.get(db, Product, product_id)
    return update_simple(db, product, payload)


@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    return crud.delete(db, Product, product_id)
