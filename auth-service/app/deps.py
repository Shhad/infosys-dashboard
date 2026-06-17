import jwt
from fastapi import Depends, Request
from sqlalchemy.orm import Session

from . import repository, security
from .db import SessionLocal
from .errors import AppError
from .models import User


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_claims(request: Request) -> dict:
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise AppError(401, "unauthorized", "Missing or invalid Authorization header")
    token = auth.split(" ", 1)[1].strip()
    try:
        return security.decode_token(token)
    except jwt.PyJWTError:
        raise AppError(401, "unauthorized", "Invalid or expired token")


def get_current_user(
    claims: dict = Depends(get_current_claims), db: Session = Depends(get_db)
) -> User:
    user = repository.get_by_id(db, claims.get("sub"))
    if user is None:
        raise AppError(401, "unauthorized", "User no longer exists")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "ADMIN":
        raise AppError(403, "forbidden", "Admin role required")
    return user
