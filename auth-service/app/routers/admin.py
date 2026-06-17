from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import repository, security
from ..deps import get_db, require_admin
from ..errors import AppError
from ..schemas import AdminCreateUserRequest, UserResponse

router = APIRouter(prefix="/admin")


@router.post("/users", response_model=UserResponse, status_code=201)
def create_user(
    payload: AdminCreateUserRequest,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    if repository.get_by_email(db, payload.email):
        raise AppError(409, "email_taken", "Email already registered")
    role = payload.role if payload.role in ("ADMIN", "USER") else "USER"
    return repository.create(
        db, payload.email, security.hash_password(payload.password), role
    )


@router.post("/users/{user_id}/promote", response_model=UserResponse)
def promote(
    user_id: str,
    db: Session = Depends(get_db),
    _admin=Depends(require_admin),
):
    user = repository.get_by_id(db, user_id)
    if user is None:
        raise AppError(404, "not_found", "User not found")
    return repository.set_role(db, user, "ADMIN")


@router.get("/users", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db), _admin=Depends(require_admin)):
    return repository.list_all(db)
