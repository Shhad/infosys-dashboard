from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import repository, security
from ..deps import get_current_user, get_db
from ..errors import AppError
from ..models import User
from ..schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=201)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if repository.get_by_email(db, payload.email):
        raise AppError(409, "email_taken", "Email already registered")
    return repository.create(
        db, payload.email, security.hash_password(payload.password), "USER"
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = repository.get_by_email(db, payload.email)
    if user is None or not security.verify_password(payload.password, user.password_hash):
        raise AppError(401, "invalid_credentials", "Invalid email or password")
    token, expires_in = security.issue_token(str(user.id), user.email, user.role)
    return TokenResponse(access_token=token, token_type="Bearer", expires_in=expires_in)


@router.get("/users/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return user
